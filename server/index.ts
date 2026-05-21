import './env.ts';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTicketResult, checkTicket, normalizeTicket } from './lottery/checkTicket.ts';
import { fetchDrawResult } from './lottery/providers/configurableApi.ts';
import { scanTicketImage } from './scan/scanTicketImage.ts';
import { badRequest, getErrorMessage, getErrorStatus } from './shared/httpError.ts';
import { clearHistory, deleteHistoryItems, getStats, saveCheckHistory, updateHistoryQuantity } from './storage/historyStore.ts';
import type { DrawResult, Ticket } from './types.ts';

const app = express();
const dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.join(dirname, '..', 'dist');

const port = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json({ limit: '12mb' }));
app.use('/sample-data', express.static(path.join(dirname, 'sample-data')));

app.get('/api/health', (_request, response) => {
  response.json({ ok: true });
});

app.post('/api/gemini-models', asyncHandler(async (request, response) => {
  const { apiKey } = request.body || {};
  if (!apiKey?.trim()) throw badRequest('Vui lòng nhập Gemini API key.');

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`,
  );
  const payload = await geminiResponse.json().catch(() => ({}));

  if (!geminiResponse.ok) {
    response.status(geminiResponse.status).json({
      error: payload.error?.message || 'Không lấy được danh sách Gemini models.',
    });
    return;
  }

  response.json({
    models: (payload.models || [])
      .filter((model: { supportedGenerationMethods?: string[] }) =>
        model.supportedGenerationMethods?.includes('generateContent'),
      )
      .map((model: { name?: string; displayName?: string; supportedGenerationMethods?: string[] }) => ({
        name: model.name?.replace('models/', ''),
        displayName: model.displayName,
        supportedGenerationMethods: model.supportedGenerationMethods,
      })),
  });
}));

app.post('/api/debug/gemini-ping', asyncHandler(async (request, response) => {
  const { apiKey } = request.body || {};
  if (!apiKey?.trim()) throw badRequest('Vui lòng nhập Gemini API key.');

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Trả lời đúng một JSON: {"ok":true}' }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    },
  );

  const payload = await geminiResponse.json().catch(() => ({}));
  if (!geminiResponse.ok) {
    response.status(geminiResponse.status).json({ error: payload.error?.message || 'Gemini ping lỗi.' });
    return;
  }

  response.json({ ok: true, model, payload });
}));

app.post('/api/scan-ticket', asyncHandler(async (request, response) => {
  const { provider, apiKey, imageBase64 } = request.body || {};
  const ticket = await scanTicketImage({ provider, apiKey, imageBase64 });
  response.json({ ticket });
}));

app.post('/api/check-ticket', asyncHandler(async (request, response) => {
  const { user, ticketCost, ticketQuantity, saveHistory, ...ticket } = request.body || {};
  const result = await checkTicket(ticket);
  const history = saveHistory ? await saveCheckHistory({ user, result, ticketCost, ticketQuantity }) : null;
  response.json({ ...result, history });
}));

app.post('/api/check-tickets-batch', asyncHandler(async (request, response) => {
  const { user, ticketCost, ticketQuantity, saveHistory, tickets = [] } = request.body || {};
  if (!Array.isArray(tickets) || tickets.length === 0) {
    throw badRequest('Vui lòng nhập ít nhất 1 vé số để dò.');
  }

  const results = [];
  const drawResultCache = new Map<string, DrawResult>();

  for (const ticket of tickets.slice(0, 50) as Partial<Ticket>[]) {
    try {
      const normalizedTicket = normalizeTicket(ticket);
      const cacheKey = `${normalizedTicket.province.toLowerCase()}|${normalizedTicket.drawDate}`;
      if (!drawResultCache.has(cacheKey)) {
        drawResultCache.set(cacheKey, await fetchDrawResult(normalizedTicket));
      }

      const result = buildTicketResult(normalizedTicket, drawResultCache.get(cacheKey)!);
      const history = saveHistory ? await saveCheckHistory({ user, result, ticketCost, ticketQuantity }) : null;
      results.push({ ok: true, ...result, history });
    } catch (error) {
      results.push({ ok: false, ticket, error: getErrorMessage(error) });
    }
  }

  response.json({ results });
}));

app.get('/api/stats', asyncHandler(async (request, response) => {
  const userId = typeof request.query.userId === 'string' ? request.query.userId : 'guest';
  const month = typeof request.query.month === 'string' ? request.query.month : undefined;
  const historyFrom = typeof request.query.historyFrom === 'string' ? request.query.historyFrom : undefined;
  const historyTo = typeof request.query.historyTo === 'string' ? request.query.historyTo : undefined;
  const historyLimit = typeof request.query.historyLimit === 'string' ? request.query.historyLimit : undefined;
  response.json(await getStats({ userId, month, historyFrom, historyTo, historyLimit }));
}));

app.post('/api/history/clear', asyncHandler(async (request, response) => {
  const { userId = 'guest' } = request.body || {};
  const result = await clearHistory({ userId: String(userId || 'guest') });
  response.json({ ok: true, ...result });
}));

app.post('/api/history/delete', asyncHandler(async (request, response) => {
  const { userId = 'guest', ids = [] } = request.body || {};
  const result = await deleteHistoryItems({ userId: String(userId || 'guest'), ids });
  response.json({ ok: true, ...result });
}));

app.post('/api/history/quantity', asyncHandler(async (request, response) => {
  const { userId = 'guest', id = '', ticketQuantity = 1 } = request.body || {};
  const result = await updateHistoryQuantity({
    userId: String(userId || 'guest'),
    id: String(id || ''),
    ticketQuantity,
  });
  response.json({ ok: true, ...result });
}));

app.get('/api/draw-results/today', asyncHandler(async (_request, response) => {
  response.json({ regions: await getLatestRegionResults() });
}));

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((request, response, next) => {
    if (request.method !== 'GET' || request.path.startsWith('/api')) {
      next();
      return;
    }

    response.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Lottery checker API listening on http://localhost:${port}`);
});

function asyncHandler(handler: (request: Request, response: Response) => Promise<void>) {
  return (request: Request, response: Response) => {
    handler(request, response).catch((error) => {
      response.status(getErrorStatus(error)).json({ error: getErrorMessage(error) });
    });
  };
}

const REGION_SCHEDULES: Record<string, string[][]> = {
  'Miền Bắc': [
    ['Thái Bình'],
    ['Hà Nội'],
    ['Quảng Ninh'],
    ['Bắc Ninh'],
    ['Hà Nội'],
    ['Hải Phòng'],
    ['Nam Định'],
  ],
  'Miền Trung': [
    ['Khánh Hòa', 'Kon Tum'],
    ['Phú Yên', 'Huế'],
    ['Đắk Lắk', 'Quảng Nam'],
    ['Đà Nẵng', 'Khánh Hòa'],
    ['Bình Định', 'Quảng Bình', 'Quảng Trị'],
    ['Gia Lai', 'Ninh Thuận'],
    ['Đà Nẵng', 'Quảng Ngãi', 'Đắk Nông'],
  ],
  'Miền Nam': [
    ['Tiền Giang', 'Kiên Giang', 'Đà Lạt'],
    ['TP. HCM', 'Đồng Tháp', 'Cà Mau'],
    ['Bến Tre', 'Vũng Tàu', 'Bạc Liêu'],
    ['Đồng Nai', 'Cần Thơ', 'Sóc Trăng'],
    ['Tây Ninh', 'An Giang', 'Bình Thuận'],
    ['Vĩnh Long', 'Bình Dương', 'Trà Vinh'],
    ['TP. HCM', 'Long An', 'Bình Phước', 'Hậu Giang'],
  ],
};

async function getLatestRegionResults() {
  const today = dateInVietnam();
  const regions = [];

  for (const [region, schedule] of Object.entries(REGION_SCHEDULES)) {
    regions.push(await getLatestRegionResult(region, schedule, today));
  }

  return regions;
}

async function getLatestRegionResult(region: string, schedule: string[][], startDate: string) {
  const errors: string[] = [];

  for (let offset = 0; offset < 10; offset += 1) {
    const date = addDays(startDate, -offset);
    const provinces = schedule[dayOfWeek(date)];
    const items = [];

    for (const province of provinces) {
      try {
        const result = await fetchDrawResult({ province, drawDate: date, ticketNumber: '000000', series: '' });
        if (result.drawDate === date) {
          items.push({ province, result });
        } else {
          items.push({ province, error: `Chưa có kết quả ngày ${date}. Kết quả mới nhất hiện có là ${result.drawDate}.` });
        }
      } catch (error) {
        items.push({ province, error: getErrorMessage(error) });
        errors.push(`${province} ${date}: ${getErrorMessage(error)}`);
      }
    }

    if (items.some((item) => item.result)) {
      return { region, date, items };
    }
  }

  return { region, date: startDate, items: [], error: errors[0] || 'Chưa tìm thấy kết quả mới nhất.' };
}

function dateInVietnam() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function dayOfWeek(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;

    const separatorIndex = trimmedLine.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
