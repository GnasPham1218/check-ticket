import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(dirname, '..', 'data');
const databasePath = process.env.SQLITE_PATH || path.join(dataDir, 'check-ticket.sqlite');

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

ensureSchema();

const now = new Date();
const currentMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
const previousMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
const user = {
  id: 'guest',
  email: '',
  name: 'Khách',
  picture: '',
};

const demoRecords = [
  ...buildMonthRecords(currentMonth, [
    { day: 1, count: 1, spent: 10000, won: 0, province: 'Đồng Nai' },
    { day: 3, count: 2, spent: 20000, won: 0, province: 'Cần Thơ' },
    { day: 5, count: 1, spent: 10000, won: 200000, province: 'Sóc Trăng' },
    { day: 8, count: 3, spent: 30000, won: 0, province: 'Đồng Nai' },
    { day: 12, count: 2, spent: 20000, won: 400000, province: 'Cần Thơ' },
    { day: 16, count: 1, spent: 10000, won: 0, province: 'Sóc Trăng' },
    { day: 20, count: 2, spent: 20000, won: 0, province: 'Đồng Nai' },
    { day: Math.min(now.getDate(), 24), count: 1, spent: 10000, won: 100000, province: 'Cần Thơ' },
  ]),
  ...buildMonthRecords(previousMonth, [
    { day: 2, count: 2, spent: 20000, won: 0, province: 'TP. HCM' },
    { day: 6, count: 1, spent: 10000, won: 0, province: 'Long An' },
    { day: 11, count: 3, spent: 30000, won: 200000, province: 'Bình Dương' },
    { day: 18, count: 2, spent: 20000, won: 0, province: 'Trà Vinh' },
    { day: 23, count: 1, spent: 10000, won: 400000, province: 'Vĩnh Long' },
  ]),
];

const insertUser = db.prepare(`
  INSERT INTO users (id, email, name, picture, updated_at)
  VALUES (@id, @email, @name, @picture, @updatedAt)
  ON CONFLICT(id) DO UPDATE SET
    email = excluded.email,
    name = excluded.name,
    picture = excluded.picture,
    updated_at = excluded.updated_at
`);

const deleteDemo = db.prepare(`DELETE FROM ticket_checks WHERE id LIKE 'demo-%'`);
const insertHistory = db.prepare(`
  INSERT INTO ticket_checks (
    id,
    user_id,
    checked_at,
    province,
    draw_date,
    ticket_number,
    series,
    ticket_cost,
    winning_amount,
    is_winner,
    matched_prizes_json,
    source,
    source_url,
    raw_ticket_json
  )
  VALUES (
    @id,
    @userId,
    @checkedAt,
    @province,
    @drawDate,
    @ticketNumber,
    @series,
    @ticketCost,
    @winningAmount,
    @isWinner,
    @matchedPrizesJson,
    @source,
    @sourceUrl,
    @rawTicketJson
  )
`);

const transaction = db.transaction(() => {
  insertUser.run({ ...user, updatedAt: new Date().toISOString() });
  deleteDemo.run();
  for (const record of demoRecords) insertHistory.run(record);
});

transaction();

console.log(`Đã tạo ${demoRecords.length} vé mẫu trong ${databasePath}`);
console.log('Mở /account để xem biểu đồ, lịch sử và test xóa vé.');

function buildMonthRecords(monthDate, configs) {
  return configs.flatMap((config, configIndex) => {
    const date = makeDate(monthDate, config.day);
    return Array.from({ length: config.count }, (_, itemIndex) => createRecord({
      index: `${monthDate.getUTCFullYear()}${monthDate.getUTCMonth() + 1}-${configIndex}-${itemIndex}`,
      checkedAt: `${date}T${String(8 + itemIndex).padStart(2, '0')}:15:00.000Z`,
      drawDate: date,
      province: config.province,
      ticketNumber: ticketNumber(configIndex, itemIndex),
      ticketCost: Math.round(config.spent / config.count),
      winningAmount: itemIndex === 0 ? config.won : 0,
    }));
  });
}

function createRecord({ index, checkedAt, drawDate, province, ticketNumber, ticketCost, winningAmount }) {
  const isWinner = winningAmount > 0;
  const matchedPrizes = isWinner ? [{ prize: winningAmount >= 400000 ? 'Giải sáu' : 'Giải tám', numbers: [ticketNumber.slice(-2)] }] : [];
  const ticket = { province, drawDate, ticketNumber, series: 'DEMO' };
  return {
    id: `demo-${index}`,
    userId: user.id,
    checkedAt,
    province,
    drawDate,
    ticketNumber,
    series: 'DEMO',
    ticketCost,
    winningAmount,
    isWinner: isWinner ? 1 : 0,
    matchedPrizesJson: JSON.stringify(matchedPrizes),
    source: 'Demo seed',
    sourceUrl: '',
    rawTicketJson: JSON.stringify(ticket),
  };
}

function makeDate(monthDate, day) {
  const lastDay = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0)).getUTCDate();
  const safeDay = Math.max(1, Math.min(day, lastDay));
  return `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

function ticketNumber(configIndex, itemIndex) {
  return String(410000 + configIndex * 137 + itemIndex * 17).padStart(6, '0');
}

function ensureSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      name TEXT,
      picture TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ticket_checks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      checked_at TEXT NOT NULL,
      province TEXT NOT NULL,
      draw_date TEXT NOT NULL,
      ticket_number TEXT NOT NULL,
      series TEXT,
      ticket_cost INTEGER NOT NULL DEFAULT 0,
      winning_amount INTEGER NOT NULL DEFAULT 0,
      is_winner INTEGER NOT NULL DEFAULT 0,
      matched_prizes_json TEXT NOT NULL,
      source TEXT,
      source_url TEXT,
      raw_ticket_json TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_ticket_checks_user_checked_at
      ON ticket_checks(user_id, checked_at);

    CREATE INDEX IF NOT EXISTS idx_ticket_checks_user_draw
      ON ticket_checks(user_id, province, draw_date);
  `);
}
