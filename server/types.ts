export type AiProvider = 'gemini' | 'openai';

export interface Ticket {
  province: string;
  drawDate: string;
  ticketNumber: string;
  series?: string;
}

export interface Prize {
  prize: string;
  number?: string;
  numbers?: string[];
}

export interface DrawResult {
  province: string;
  drawDate: string;
  source?: string;
  sourceUrl?: string;
  prizes: Prize[];
  raw?: unknown;
}

export interface TicketCheckResult {
  ticket: Ticket;
  isWinner: boolean;
  matchedPrizes: Prize[];
  drawResult: DrawResult;
}

export interface AppUser {
  id?: string;
  email?: string;
  name?: string;
  picture?: string;
}
