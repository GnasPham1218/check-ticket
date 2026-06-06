import { badRequest } from '../shared/httpError.ts';
import type { DrawResult, Prize, Ticket, TicketCheckResult } from '../types.ts';
import { fetchDrawResult } from './providers/configurableApi.ts';

export async function checkTicket(ticket: Partial<Ticket>): Promise<TicketCheckResult> {
  const normalizedTicket = normalizeTicket(ticket);
  const drawResult = await fetchDrawResult(normalizedTicket);
  assertDrawDateMatches(normalizedTicket, drawResult);
  return buildTicketResult(normalizedTicket, drawResult);
}

export function buildTicketResult(normalizedTicket: Ticket, drawResult: DrawResult): TicketCheckResult {
  const matchedPrizes = findMatchedPrizes(normalizedTicket.ticketNumber, drawResult.prizes);

  return {
    ticket: normalizedTicket,
    isWinner: matchedPrizes.length > 0,
    matchedPrizes,
    drawResult,
  };
}

export function normalizeTicket(ticket: Partial<Ticket>): Ticket {
  const province = String(ticket.province || '').trim();
  const drawDate = String(ticket.drawDate || '').trim();
  const ticketDigits = String(ticket.ticketNumber || '').replace(/\D/g, '');
  const ticketNumber = ticketDigits.slice(-6);
  const series = String(ticket.series || '').trim();

  if (!province) throw badRequest('Thiếu tỉnh / đài xổ số.');
  if (!drawDate) throw badRequest('Thiếu ngày xổ.');
  if (!ticketNumber) throw badRequest('Thiếu số vé.');
  if (ticketDigits.length < 6) throw badRequest('Số vé phải có đủ 6 chữ số.');

  return { province, drawDate, ticketNumber, series };
}

function findMatchedPrizes(ticketNumber: string, prizes: Prize[] = []): Prize[] {
  return prizes.filter((prize) => {
    const numbers = Array.isArray(prize.numbers) ? prize.numbers : [prize.number];
    return numbers.some((number) => isWinningNumber(ticketNumber, String(number || '')));
  });
}

function isWinningNumber(ticketNumber: string, prizeNumber: string): boolean {
  const cleanPrizeNumber = prizeNumber.replace(/\D/g, '');
  if (!cleanPrizeNumber) return false;
  return ticketNumber.endsWith(cleanPrizeNumber);
}

function assertDrawDateMatches(ticket: Ticket, drawResult: DrawResult): void {
  if (!drawResult.drawDate) return;

  const requestedDate = normalizeDateForComparison(ticket.drawDate);
  const resultDate = normalizeDateForComparison(drawResult.drawDate);
  if (requestedDate === resultDate) return;

  throw badRequest(
    `Kết quả xổ số trả về ngày ${drawResult.drawDate}, không khớp ngày yêu cầu ${ticket.drawDate}.`,
  );
}

function normalizeDateForComparison(value: string): string {
  const date = String(value || '').trim();
  const yearFirst = date.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (yearFirst) {
    const [, year, month, day] = yearFirst;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const dayFirst = date.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dayFirst) {
    const [, day, month, year] = dayFirst;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return date;
}
