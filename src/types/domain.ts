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
}

export interface TicketCheckResult {
  ok?: boolean;
  ticket: Ticket;
  isWinner: boolean;
  matchedPrizes: Prize[];
  drawResult: DrawResult;
  error?: string;
}

export interface AppUser {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
}

export interface StatsSummary {
  checkedTickets: number;
  winningTickets: number;
  totalSpent: number;
  totalWon: number;
}

export interface Stats {
  userId: string;
  month: StatsSummary;
  total: StatsSummary;
  monthlyTrend?: Array<StatsSummary & { month: string; profit: number }>;
  dailyTrend?: Array<StatsSummary & { date: string; profit: number; cumulativeProfit: number }>;
  recent: unknown[];
}
