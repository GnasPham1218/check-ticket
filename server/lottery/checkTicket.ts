import { badRequest } from '../shared/httpError.ts';
import type { DrawResult, Prize, Ticket, TicketCheckResult } from '../types.ts';
import { fetchDrawResult } from './providers/configurableApi.ts';

export async function checkTicket(ticket: Partial<Ticket>): Promise<TicketCheckResult> {
  const normalizedTicket = normalizeTicket(ticket);
  const drawResult = await fetchDrawResult(normalizedTicket);
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
  const ticketNumber = String(ticket.ticketNumber || '').replace(/\D/g, '').slice(-6);
  const series = String(ticket.series || '').trim();

  if (!province) throw badRequest('Thiếu tỉnh / đài xổ số.');
  if (!drawDate) throw badRequest('Thiếu ngày xổ.');
  if (!ticketNumber) throw badRequest('Thiếu số vé.');

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
