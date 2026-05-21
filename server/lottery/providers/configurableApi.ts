import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { badRequest } from '../../shared/httpError.ts';
import { fetchMinhNgocResult } from './minhNgoc.ts';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(dirname, 'lotteryApis.json');

export async function fetchDrawResult(ticket) {
  const config = await readConfig();
  const apiConfig = findApiConfig(config, ticket.province);
  if (!apiConfig) {
    throw badRequest(
      `Chưa cấu hình API kết quả cho "${ticket.province}". Hãy thêm vào server/lottery/providers/lotteryApis.json.`,
    );
  }

  if (apiConfig.provider === 'minhngoc') {
    return fetchMinhNgocResult(ticket);
  }

  const url = buildUrl(apiConfig.url, ticket);
  const response = await fetch(url, {
    headers: interpolateObject(apiConfig.headers || {}, ticket),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 404 && apiConfig.shape === 'sample') {
      throw badRequest(
        `Chưa có dữ liệu demo cho ${ticket.province} ngày ${ticket.drawDate}. Hãy thêm file sample-data hoặc cấu hình API thật.`,
      );
    }

    throw new Error(payload.error || payload.message || `API xổ số trả lỗi HTTP ${response.status}.`);
  }

  return normalizeDrawResult(payload, apiConfig, ticket);
}

async function readConfig() {
  const rawConfig = await fs.readFile(configPath, 'utf8');
  return JSON.parse(rawConfig);
}

function findApiConfig(config, province) {
  const normalizedProvince = normalizeName(province);
  return config.apis.find((api) => {
    if (api.requiredEnv && !process.env[api.requiredEnv]) return false;
    if (api.province === '*') return true;
    const names = [api.province, ...(api.aliases || [])].map(normalizeName);
    return names.includes(normalizedProvince);
  });
}

function buildUrl(template, ticket) {
  return interpolateString(template, ticket)
    .replaceAll('{province}', encodeURIComponent(ticket.province))
    .replaceAll('{date}', encodeURIComponent(ticket.drawDate))
    .replaceAll('{ticketNumber}', encodeURIComponent(ticket.ticketNumber));
}

function interpolateObject(source, ticket) {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, interpolateString(String(value), ticket)]),
  );
}

function interpolateString(value, ticket) {
  return value
    .replaceAll('{provinceSlug}', encodeURIComponent(slugify(ticket.province)))
    .replaceAll('{province}', encodeURIComponent(ticket.province))
    .replaceAll('{date}', encodeURIComponent(ticket.drawDate))
    .replaceAll('{ticketNumber}', encodeURIComponent(ticket.ticketNumber))
    .replace(/\{env:([A-Z0-9_]+)\}/g, (_match, envName) => process.env[envName] || '');
}

function normalizeDrawResult(payload, apiConfig, ticket) {
  if (apiConfig.shape === 'sample') {
    return {
      province: ticket.province,
      drawDate: ticket.drawDate,
      prizes: payload.prizes || [],
      raw: payload,
    };
  }

  const data = apiConfig.dataPath ? getByPath(payload, apiConfig.dataPath) : payload;
  const prizes = apiConfig.prizePath ? getByPath(data, apiConfig.prizePath) : findPrizeNode(data);

  return {
    province: data.province || ticket.province,
    drawDate: data.drawDate || data.date || ticket.drawDate,
    prizes: normalizePrizes(prizes),
    raw: payload,
  };
}

function findPrizeNode(data) {
  return data?.prizes || data?.result || data?.results || data?.lottery || data?.data || [];
}

function normalizePrizes(prizes) {
  if (Array.isArray(prizes)) {
    return prizes.map((prize) => ({
      prize: prize.prize || prize.name || prize.label || '',
      number: prize.number,
      numbers: prize.numbers,
    }));
  }

  if (prizes && typeof prizes === 'object') {
    return Object.entries(prizes).map(([prize, numbers]) => ({
      prize,
      numbers: Array.isArray(numbers) ? numbers : [numbers],
    }));
  }

  return [];
}

function getByPath(source, pathExpression) {
  return pathExpression.split('.').reduce((value, key) => value?.[key], source);
}

function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function slugify(value) {
  return normalizeName(value)
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
