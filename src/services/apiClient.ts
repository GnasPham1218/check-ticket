import { API_BASE } from '../config/constants';
import type { AppUser, DrawResult, Stats, Ticket, TicketCheckResult } from '../types/domain';

export interface ScanTicketInput {
  provider: string;
  apiKey: string;
  imageBase64: string;
}

export interface CheckTicketInput extends Ticket {
  user: AppUser;
  ticketCost: string | number;
  ticketQuantity?: string | number;
  saveHistory: boolean;
}

export interface CheckTicketsBatchInput {
  user: AppUser;
  ticketCost: string | number;
  ticketQuantity?: string | number;
  saveHistory: boolean;
  tickets: Ticket[];
}

class ApiError extends Error {
  status: number;
  isServerResponse = true;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function scanTicketImage(input: ScanTicketInput): Promise<{ ticket: Ticket }> {
  return postJson('/api/scan-ticket', input);
}

export async function checkSingleTicket(input: CheckTicketInput): Promise<TicketCheckResult> {
  return postJson('/api/check-ticket', input);
}

export async function checkTicketsBatch(input: CheckTicketsBatchInput): Promise<{ results: TicketCheckResult[] }> {
  return postJson('/api/check-tickets-batch', input);
}

export interface FetchStatsOptions {
  historyFrom?: string;
  historyTo?: string;
  historyLimit?: string | number;
}

export async function fetchStats(
  userId: string,
  month?: string,
  options: FetchStatsOptions = {},
): Promise<Stats> {
  const params = new URLSearchParams({ userId });
  if (month) params.set('month', month);
  if (options.historyFrom) params.set('historyFrom', options.historyFrom);
  if (options.historyTo) params.set('historyTo', options.historyTo);
  if (options.historyLimit) params.set('historyLimit', String(options.historyLimit));
  return readJson(await fetch(`${API_BASE}/api/stats?${params.toString()}`));
}

export async function clearHistory(userId: string): Promise<{ ok: boolean; deleted: number }> {
  return postJson('/api/history/clear', { userId });
}

export async function deleteHistoryItems(userId: string, ids: string[]): Promise<{ ok: boolean; deleted: number }> {
  return postJson('/api/history/delete', { userId, ids });
}

export async function updateHistoryQuantity(
  userId: string,
  id: string,
  ticketQuantity: string | number,
): Promise<{ ok: boolean; updated: number }> {
  return postJson('/api/history/quantity', { userId, id, ticketQuantity });
}

export async function fetchTodayDrawResults(): Promise<{
  regions: Array<{
    region: string;
    date: string;
    items: Array<{ province: string; result?: DrawResult; error?: string }>;
    error?: string;
  }>;
}> {
  return readJson(await fetch(`${API_BASE}/api/draw-results/today`));
}

export function getFetchErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || '');
  const isServerResponse = Boolean((error as { isServerResponse?: boolean })?.isServerResponse);
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes('high demand') ||
    lowerMessage.includes('try again later') ||
    lowerMessage.includes('experiencing high demand')
  ) {
    return 'API AI của bạn đang quá tải hoặc đang có nhu cầu sử dụng cao. Vui lòng thử lại sau ít phút.';
  }

  if (!isServerResponse && lowerMessage.includes('failed to fetch')) {
    const target = API_BASE || `${window.location.origin}/api`;
    return `Không kết nối được backend tại ${target}. Hãy mở đúng URL local http://localhost:5173, bảo đảm npm run dev đang chạy và backend cổng 4000 không bị firewall chặn.`;
  }

  if (lowerMessage === 'fetch failed') {
    return 'Backend đã nhận request nhưng gọi API bên ngoài bị lỗi. Hãy restart backend để load code mới, kiểm tra API key/model và thử tắt VPN/firewall nếu cần.';
  }

  return message || 'Có lỗi xảy ra.';
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  return readJson(
    await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(payload.error || 'Có lỗi xảy ra.', response.status);
  return payload;
}
