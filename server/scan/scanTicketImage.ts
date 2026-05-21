import { badRequest } from '../shared/httpError.ts';
import type { AiProvider, Ticket } from '../types.ts';
import { scanWithGemini } from './providers/gemini.ts';
import { scanWithOpenAI } from './providers/openai.ts';

interface ScanTicketImageInput {
  provider: AiProvider;
  apiKey: string;
  imageBase64: string;
}

interface ScanProviderInput {
  apiKey: string;
  imageBase64: string;
  prompt: string;
}

type ScanProvider = (input: ScanProviderInput) => Promise<unknown>;

const providers: Record<AiProvider, ScanProvider> = {
  gemini: scanWithGemini,
  openai: scanWithOpenAI,
};

export async function scanTicketImage({ provider, apiKey, imageBase64 }: ScanTicketImageInput): Promise<Ticket> {
  if (!providers[provider]) throw badRequest('Nhà cung cấp AI không hợp lệ.');
  if (!apiKey?.trim()) throw badRequest('Vui lòng nhập API key.');
  if (!imageBase64?.trim()) throw badRequest('Vui lòng chọn hoặc chụp ảnh vé số.');

  const ticket = await providers[provider]({
    apiKey: apiKey.trim(),
    imageBase64,
    prompt: buildPrompt(),
  });

  return normalizeScannedTicket(ticket);
}

function buildPrompt(): string {
  return [
    'Bạn là hệ thống OCR vé số Việt Nam.',
    'Hãy đọc ảnh tờ vé số và chỉ trả về JSON hợp lệ.',
    'Schema: {"province":"tên tỉnh/đài","drawDate":"YYYY-MM-DD","ticketNumber":"6 chữ số","series":"seri hoặc ký hiệu nếu có"}',
    'Nếu không chắc trường nào, để chuỗi rỗng. Không thêm markdown hoặc giải thích.',
  ].join('\n');
}

function normalizeScannedTicket(rawTicket: unknown): Ticket {
  const ticket = rawTicket && typeof rawTicket === 'object' ? (rawTicket as Partial<Ticket>) : {};
  return {
    province: String(ticket.province || '').trim(),
    drawDate: String(ticket.drawDate || '').trim(),
    ticketNumber: String(ticket.ticketNumber || '').replace(/\D/g, '').slice(-6),
    series: String(ticket.series || '').trim(),
  };
}
