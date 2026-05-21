import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type AnyRecord = Record<string, any>;

const dirname = path.dirname(fileURLToPath(import.meta.url));
const storageDriver = String(process.env.STORAGE_DRIVER || '').toLowerCase();
const useTidb =
  storageDriver === 'tidb' ||
  storageDriver === 'mysql' ||
  Boolean(process.env.DATABASE_URL || process.env.TIDB_HOST || process.env.MYSQL_HOST);

let sqliteDb: any = null;
let sqliteStatements: ReturnType<typeof createSqliteStatements> | null = null;
let tidbPoolPromise: Promise<any> | null = null;
let tidbSchemaPromise: Promise<void> | null = null;

if (!useTidb) {
  const { default: Database } = await import('better-sqlite3');
  const dataDir = path.join(dirname, '..', 'data');
  const databasePath = process.env.SQLITE_PATH || path.join(dataDir, 'check-ticket.sqlite');

  fs.mkdirSync(dataDir, { recursive: true });
  sqliteDb = new Database(databasePath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');
  ensureSqliteSchema(sqliteDb);
  sqliteStatements = createSqliteStatements(sqliteDb);
}

export async function saveCheckHistory({ user, result, ticketCost = 0, ticketQuantity = 1 }) {
  const normalizedUser = normalizeUser(user);
  const checkedAt = new Date().toISOString();
  const quantity = normalizeTicketQuantity(ticketQuantity);
  const unitTicketCost = Number(ticketCost) || 0;
  const winningAmount = estimateWinningAmount(result.matchedPrizes) * quantity;
  const record = {
    id: crypto.randomUUID(),
    userId: normalizedUser.id,
    checkedAt,
    province: result.ticket.province,
    drawDate: result.ticket.drawDate,
    ticketNumber: result.ticket.ticketNumber,
    series: result.ticket.series || '',
    ticketCost: unitTicketCost * quantity,
    ticketQuantity: quantity,
    winningAmount,
    isWinner: result.isWinner ? 1 : 0,
    matchedPrizesJson: JSON.stringify(result.matchedPrizes || []),
    source: result.drawResult?.source || '',
    sourceUrl: result.drawResult?.sourceUrl || '',
    rawTicketJson: JSON.stringify(result.ticket),
  };

  if (useTidb) {
    return saveCheckHistoryTidb({ normalizedUser, checkedAt, record });
  }

  const transaction = sqliteDb!.transaction(() => {
    sqliteStatements!.upsertUser.run({ ...normalizedUser, updatedAt: checkedAt });
    sqliteStatements!.insertHistory.run(record);
  });

  transaction();

  return mapHistoryRecord({
    ...record,
    email: normalizedUser.email,
    name: normalizedUser.name,
    picture: normalizedUser.picture,
  });
}

export async function getStats({
  userId = 'guest',
  month = undefined,
  historyFrom = undefined,
  historyTo = undefined,
  historyLimit = undefined,
} = {}) {
  const now = new Date();
  const monthPrefix = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const historyFilter = normalizeHistoryFilter({ from: historyFrom, to: historyTo, limit: historyLimit });

  if (useTidb) {
    await ensureTidbSchema();
    return {
      userId,
      selectedMonth: monthPrefix,
      month: await summarizeTidb(userId, `${monthPrefix}%`),
      total: await summarizeTidb(userId),
      monthlyTrend: await getMonthlyTrendTidb(userId),
      dailyTrend: await getDailyTrendTidb(userId, monthPrefix),
      recent: await getRecentTidb(userId, historyFilter),
    };
  }

  return {
    userId,
    selectedMonth: monthPrefix,
    month: summarizeSqlite(userId, `${monthPrefix}%`),
    total: summarizeSqlite(userId),
    monthlyTrend: getMonthlyTrendSqlite(userId),
    dailyTrend: getDailyTrendSqlite(userId, monthPrefix),
    recent: getRecentSqlite(userId, historyFilter),
  };
}

export async function clearHistory({ userId = 'guest' } = {}) {
  if (useTidb) {
    await ensureTidbSchema();
    const pool = await getTidbPool();
    const [result] = await pool.execute('DELETE FROM ticket_checks WHERE user_id = ?', [userId]);
    return { deleted: result.affectedRows || 0 };
  }

  const result = sqliteDb!.prepare('DELETE FROM ticket_checks WHERE user_id = @userId').run({ userId });
  return { deleted: result.changes || 0 };
}

export async function deleteHistoryItems({ userId = 'guest', ids = [] } = {}) {
  const validIds = Array.isArray(ids) ? ids.map(String).filter(Boolean) : [];
  if (!validIds.length) return { deleted: 0 };

  if (useTidb) {
    await ensureTidbSchema();
    const pool = await getTidbPool();
    const placeholders = validIds.map(() => '?').join(', ');
    const [result] = await pool.execute(
      `DELETE FROM ticket_checks WHERE user_id = ? AND id IN (${placeholders})`,
      [userId, ...validIds],
    );
    return { deleted: result.affectedRows || 0 };
  }

  const placeholders = validIds.map((_, index) => `@id${index}`).join(', ');
  const params = Object.fromEntries(validIds.map((id, index) => [`id${index}`, id]));
  const result = sqliteDb!
    .prepare(`DELETE FROM ticket_checks WHERE user_id = @userId AND id IN (${placeholders})`)
    .run({ userId, ...params });
  return { deleted: result.changes || 0 };
}

export async function updateHistoryQuantity({ userId = 'guest', id = '', ticketQuantity = 1 } = {}) {
  const quantity = normalizeTicketQuantity(ticketQuantity);
  const recordId = String(id || '').trim();
  if (!recordId) return { updated: 0 };

  if (useTidb) {
    await ensureTidbSchema();
    const pool = await getTidbPool();
    const [rows] = await pool.execute(
      'SELECT ticket_quantity, ticket_cost, winning_amount FROM ticket_checks WHERE user_id = ? AND id = ? LIMIT 1',
      [userId, recordId],
    );
    const current = rows[0];
    if (!current) return { updated: 0 };
    const nextAmounts = recalculateAmountsForQuantity(current, quantity);
    const [result] = await pool.execute(
      `
        UPDATE ticket_checks
        SET ticket_quantity = ?, ticket_cost = ?, winning_amount = ?
        WHERE user_id = ? AND id = ?
      `,
      [quantity, nextAmounts.ticketCost, nextAmounts.winningAmount, userId, recordId],
    );
    return { updated: result.affectedRows || 0 };
  }

  const current = sqliteDb!
    .prepare('SELECT ticket_quantity, ticket_cost, winning_amount FROM ticket_checks WHERE user_id = @userId AND id = @id')
    .get({ userId, id: recordId });
  if (!current) return { updated: 0 };
  const nextAmounts = recalculateAmountsForQuantity(current, quantity);
  const result = sqliteDb!
    .prepare(`
      UPDATE ticket_checks
      SET ticket_quantity = @ticketQuantity,
          ticket_cost = @ticketCost,
          winning_amount = @winningAmount
      WHERE user_id = @userId AND id = @id
    `)
    .run({
      userId,
      id: recordId,
      ticketQuantity: quantity,
      ticketCost: nextAmounts.ticketCost,
      winningAmount: nextAmounts.winningAmount,
    });
  return { updated: result.changes || 0 };
}

function ensureSqliteSchema(db: any) {
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
      ticket_quantity INTEGER NOT NULL DEFAULT 1,
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
  const columns = db.prepare('PRAGMA table_info(ticket_checks)').all().map((column) => column.name);
  if (!columns.includes('ticket_quantity')) {
    db.exec('ALTER TABLE ticket_checks ADD COLUMN ticket_quantity INTEGER NOT NULL DEFAULT 1');
  }
}

function createSqliteStatements(db: any) {
  return {
    upsertUser: db.prepare(`
      INSERT INTO users (id, email, name, picture, updated_at)
      VALUES (@id, @email, @name, @picture, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,
        name = excluded.name,
        picture = excluded.picture,
        updated_at = excluded.updated_at
    `),
    insertHistory: db.prepare(`
      INSERT INTO ticket_checks (
        id, user_id, checked_at, province, draw_date, ticket_number, series, ticket_quantity,
        ticket_cost, winning_amount, is_winner, matched_prizes_json, source,
        source_url, raw_ticket_json
      )
      VALUES (
        @id, @userId, @checkedAt, @province, @drawDate, @ticketNumber, @series, @ticketQuantity,
        @ticketCost, @winningAmount, @isWinner, @matchedPrizesJson, @source,
        @sourceUrl, @rawTicketJson
      )
    `),
  };
}

async function getTidbPool() {
  if (!tidbPoolPromise) {
    const importer = new Function('specifier', 'return import(specifier)');
    tidbPoolPromise = importer('mysql2/promise').then((mysql: any) =>
      mysql.createPool(getTidbConfig()),
    );
  }
  return tidbPoolPromise;
}

function getTidbConfig() {
  const databaseUrl = process.env.DATABASE_URL || process.env.TIDB_DATABASE_URL;
  const sslSetting = String(process.env.TIDB_SSL || process.env.MYSQL_SSL || '').toLowerCase();
  const sslEnabled = sslSetting ? sslSetting === 'true' : useTidb;
  const rejectUnauthorized =
    String(process.env.TIDB_SSL_REJECT_UNAUTHORIZED || '').toLowerCase() !== 'false';

  const base = databaseUrl
    ? parseDatabaseUrl(databaseUrl)
    : {
        host: process.env.TIDB_HOST || process.env.MYSQL_HOST,
        port: Number(process.env.TIDB_PORT || process.env.MYSQL_PORT || 4000),
        user: process.env.TIDB_USER || process.env.MYSQL_USER,
        password: process.env.TIDB_PASSWORD || process.env.MYSQL_PASSWORD,
        database: process.env.TIDB_DATABASE || process.env.MYSQL_DATABASE,
      };

  return {
    ...base,
    waitForConnections: true,
    connectionLimit: Number(process.env.TIDB_CONNECTION_LIMIT || 5),
    connectTimeout: Number(process.env.TIDB_CONNECT_TIMEOUT_MS || 10000),
    namedPlaceholders: false,
    ssl: sslEnabled ? { minVersion: 'TLSv1.2', rejectUnauthorized } : undefined,
  };
}

function parseDatabaseUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 4000),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
  };
}

async function ensureTidbSchema() {
  if (!tidbSchemaPromise) {
    tidbSchemaPromise = (async () => {
      const pool = await getTidbPool();
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255),
          name VARCHAR(255),
          picture TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at VARCHAR(32) NOT NULL
        )
      `);
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS ticket_checks (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          checked_at VARCHAR(32) NOT NULL,
          province VARCHAR(255) NOT NULL,
          draw_date VARCHAR(16) NOT NULL,
          ticket_number VARCHAR(32) NOT NULL,
          series VARCHAR(255),
          ticket_quantity INT NOT NULL DEFAULT 1,
          ticket_cost BIGINT NOT NULL DEFAULT 0,
          winning_amount BIGINT NOT NULL DEFAULT 0,
          is_winner TINYINT NOT NULL DEFAULT 0,
          matched_prizes_json JSON NOT NULL,
          source VARCHAR(255),
          source_url TEXT,
          raw_ticket_json JSON NOT NULL,
          INDEX idx_ticket_checks_user_checked_at (user_id, checked_at),
          INDEX idx_ticket_checks_user_draw (user_id, province, draw_date)
        )
      `);
      await ensureTidbColumn(pool, 'ticket_checks', 'ticket_quantity', 'INT NOT NULL DEFAULT 1');
    })();
  }
  return tidbSchemaPromise;
}

async function ensureTidbColumn(pool, tableName: string, columnName: string, definition: string) {
  const [rows] = await pool.execute(
    `
      SELECT COUNT(*) AS count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    [tableName, columnName],
  );

  if (Number(rows[0]?.count || 0) === 0) {
    await pool.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

async function saveCheckHistoryTidb({ normalizedUser, checkedAt, record }) {
  await ensureTidbSchema();
  const pool = await getTidbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.execute(
      `
        INSERT INTO users (id, email, name, picture, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          email = VALUES(email),
          name = VALUES(name),
          picture = VALUES(picture),
          updated_at = VALUES(updated_at)
      `,
      [normalizedUser.id, normalizedUser.email, normalizedUser.name, normalizedUser.picture, checkedAt],
    );
    await connection.execute(
      `
        INSERT INTO ticket_checks (
          id, user_id, checked_at, province, draw_date, ticket_number, series, ticket_quantity,
          ticket_cost, winning_amount, is_winner, matched_prizes_json, source,
          source_url, raw_ticket_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?, CAST(? AS JSON))
      `,
      [
        record.id,
        record.userId,
        record.checkedAt,
        record.province,
        record.drawDate,
        record.ticketNumber,
        record.series,
        record.ticketQuantity,
        record.ticketCost,
        record.winningAmount,
        record.isWinner,
        record.matchedPrizesJson,
        record.source,
        record.sourceUrl,
        record.rawTicketJson,
      ],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return mapHistoryRecord({
    ...record,
    email: normalizedUser.email,
    name: normalizedUser.name,
    picture: normalizedUser.picture,
  });
}

function summarizeSqlite(userId, checkedAtLike = undefined) {
  const whereMonth = checkedAtLike ? 'AND checked_at LIKE @checkedAtLike' : '';
  const row = sqliteDb!
    .prepare(`
      SELECT
        COALESCE(SUM(ticket_quantity), COUNT(*)) AS checkedTickets,
        SUM(CASE WHEN is_winner = 1 THEN ticket_quantity ELSE 0 END) AS winningTickets,
        COALESCE(SUM(ticket_cost), 0) AS totalSpent,
        COALESCE(SUM(winning_amount), 0) AS totalWon
      FROM ticket_checks
      WHERE user_id = @userId ${whereMonth}
    `)
    .get({ userId, checkedAtLike });

  return mapSummary(row);
}

async function summarizeTidb(userId, checkedAtLike = undefined) {
  const pool = await getTidbPool();
  const whereMonth = checkedAtLike ? 'AND checked_at LIKE ?' : '';
  const params = checkedAtLike ? [userId, checkedAtLike] : [userId];
  const [rows] = await pool.execute(
    `
      SELECT
        COALESCE(SUM(ticket_quantity), COUNT(*)) AS checkedTickets,
        SUM(CASE WHEN is_winner = 1 THEN ticket_quantity ELSE 0 END) AS winningTickets,
        COALESCE(SUM(ticket_cost), 0) AS totalSpent,
        COALESCE(SUM(winning_amount), 0) AS totalWon
      FROM ticket_checks
      WHERE user_id = ? ${whereMonth}
    `,
    params,
  );
  return mapSummary(rows[0] || {});
}

function getRecentSqlite(userId, filter) {
  const where = ['ticket_checks.user_id = @userId'];
  const params: AnyRecord = { userId, limit: filter.limit };
  if (filter.from) {
    where.push('ticket_checks.checked_at >= @fromDate');
    params.fromDate = `${filter.from}T00:00:00.000Z`;
  }
  if (filter.to) {
    where.push('ticket_checks.checked_at <= @toDate');
    params.toDate = `${filter.to}T23:59:59.999Z`;
  }

  return sqliteDb!
    .prepare(`
      SELECT ticket_checks.*, users.email, users.name, users.picture
      FROM ticket_checks
      LEFT JOIN users ON users.id = ticket_checks.user_id
      WHERE ${where.join(' AND ')}
      ORDER BY checked_at DESC
      LIMIT @limit
    `)
    .all(params)
    .map(mapHistoryRecord);
}

async function getRecentTidb(userId, filter) {
  const pool = await getTidbPool();
  const where = ['ticket_checks.user_id = ?'];
  const params = [userId];
  if (filter.from) {
    where.push('ticket_checks.checked_at >= ?');
    params.push(`${filter.from}T00:00:00.000Z`);
  }
  if (filter.to) {
    where.push('ticket_checks.checked_at <= ?');
    params.push(`${filter.to}T23:59:59.999Z`);
  }
  const [rows] = await pool.execute(
    `
      SELECT ticket_checks.*, users.email, users.name, users.picture
      FROM ticket_checks
      LEFT JOIN users ON users.id = ticket_checks.user_id
      WHERE ${where.join(' AND ')}
      ORDER BY checked_at DESC
      LIMIT ${filter.limit}
    `,
    params,
  );
  return rows.map(mapHistoryRecord);
}

function getMonthlyTrendSqlite(userId) {
  return sqliteDb!
    .prepare(`
      SELECT
        substr(checked_at, 1, 7) AS month,
        COALESCE(SUM(ticket_quantity), COUNT(*)) AS checkedTickets,
        SUM(CASE WHEN is_winner = 1 THEN ticket_quantity ELSE 0 END) AS winningTickets,
        COALESCE(SUM(ticket_cost), 0) AS totalSpent,
        COALESCE(SUM(winning_amount), 0) AS totalWon
      FROM ticket_checks
      WHERE user_id = @userId
      GROUP BY substr(checked_at, 1, 7)
      ORDER BY month ASC
      LIMIT 24
    `)
    .all({ userId })
    .map(mapMonthlyTrendRow);
}

async function getMonthlyTrendTidb(userId) {
  const pool = await getTidbPool();
  const [rows] = await pool.execute(
    `
      SELECT
        SUBSTR(checked_at, 1, 7) AS month,
        COALESCE(SUM(ticket_quantity), COUNT(*)) AS checkedTickets,
        SUM(CASE WHEN is_winner = 1 THEN ticket_quantity ELSE 0 END) AS winningTickets,
        COALESCE(SUM(ticket_cost), 0) AS totalSpent,
        COALESCE(SUM(winning_amount), 0) AS totalWon
      FROM ticket_checks
      WHERE user_id = ?
      GROUP BY SUBSTR(checked_at, 1, 7)
      ORDER BY month ASC
      LIMIT 24
    `,
    [userId],
  );
  return rows.map(mapMonthlyTrendRow);
}

function getDailyTrendSqlite(userId, monthPrefix) {
  const rows = sqliteDb!
    .prepare(`
      SELECT
        substr(checked_at, 1, 10) AS date,
        COALESCE(SUM(ticket_quantity), COUNT(*)) AS checkedTickets,
        SUM(CASE WHEN is_winner = 1 THEN ticket_quantity ELSE 0 END) AS winningTickets,
        COALESCE(SUM(ticket_cost), 0) AS totalSpent,
        COALESCE(SUM(winning_amount), 0) AS totalWon
      FROM ticket_checks
      WHERE user_id = @userId AND checked_at LIKE @checkedAtLike
      GROUP BY substr(checked_at, 1, 10)
      ORDER BY date ASC
    `)
    .all({ userId, checkedAtLike: `${monthPrefix}%` });

  const firstEver = sqliteDb!
    .prepare('SELECT substr(MIN(checked_at), 1, 10) AS date FROM ticket_checks WHERE user_id = @userId')
    .get({ userId })?.date;

  return buildDailyTrend(rows, firstEver, monthPrefix);
}

async function getDailyTrendTidb(userId, monthPrefix) {
  const pool = await getTidbPool();
  const [rows] = await pool.execute(
    `
      SELECT
        SUBSTR(checked_at, 1, 10) AS date,
        COALESCE(SUM(ticket_quantity), COUNT(*)) AS checkedTickets,
        SUM(CASE WHEN is_winner = 1 THEN ticket_quantity ELSE 0 END) AS winningTickets,
        COALESCE(SUM(ticket_cost), 0) AS totalSpent,
        COALESCE(SUM(winning_amount), 0) AS totalWon
      FROM ticket_checks
      WHERE user_id = ? AND checked_at LIKE ?
      GROUP BY SUBSTR(checked_at, 1, 10)
      ORDER BY date ASC
    `,
    [userId, `${monthPrefix}%`],
  );
  const [firstRows] = await pool.execute(
    'SELECT SUBSTR(MIN(checked_at), 1, 10) AS date FROM ticket_checks WHERE user_id = ?',
    [userId],
  );

  return buildDailyTrend(rows, firstRows[0]?.date, monthPrefix);
}

function buildDailyTrend(rows, firstEver, monthPrefix) {
  if (!rows.length) return [];

  const monthStart = `${monthPrefix}-01`;
  const currentMonth = dateInVietnam().slice(0, 7);
  const monthEnd = monthPrefix === currentMonth ? dateInVietnam() : lastDayOfMonth(monthPrefix);
  const firstRowDate = rows[0].date;
  const startDate = firstEver && firstEver >= monthStart ? firstRowDate : monthStart;
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const days = [];
  let cumulativeProfit = 0;

  for (let date = startDate; date <= monthEnd; date = addIsoDays(date, 1)) {
    const row: AnyRecord = byDate.get(date) || {};
    const totalSpent = Number(row.totalSpent || 0);
    const totalWon = Number(row.totalWon || 0);
    const profit = totalWon - totalSpent;
    cumulativeProfit += profit;
    days.push({
      date,
      checkedTickets: Number(row.checkedTickets || 0),
      winningTickets: Number(row.winningTickets || 0),
      totalSpent,
      totalWon,
      profit,
      cumulativeProfit,
    });
  }

  return days;
}

function mapSummary(row: AnyRecord = {}) {
  return {
    checkedTickets: Number(row.checkedTickets || 0),
    winningTickets: Number(row.winningTickets || 0),
    totalSpent: Number(row.totalSpent || 0),
    totalWon: Number(row.totalWon || 0),
  };
}

function mapMonthlyTrendRow(row: AnyRecord) {
  return {
    month: row.month,
    checkedTickets: Number(row.checkedTickets || 0),
    winningTickets: Number(row.winningTickets || 0),
    totalSpent: Number(row.totalSpent || 0),
    totalWon: Number(row.totalWon || 0),
    profit: Number(row.totalWon || 0) - Number(row.totalSpent || 0),
  };
}

function normalizeHistoryFilter({ from, to, limit }) {
  const normalizedFrom = isIsoDate(from) ? String(from) : '';
  const normalizedTo = isIsoDate(to) ? String(to) : '';
  const parsedLimit = Number(limit);
  const normalizedLimit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(Math.trunc(parsedLimit), 5), 200)
    : 20;

  return {
    from: normalizedFrom,
    to: normalizedTo,
    limit: normalizedLimit,
  };
}

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function dateInVietnam() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function lastDayOfMonth(monthPrefix) {
  const [year, month] = String(monthPrefix).split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function addIsoDays(date, amount) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function mapHistoryRecord(record) {
  return {
    id: record.id,
    userId: record.user_id || record.userId,
    user: {
      id: record.user_id || record.userId,
      email: record.email || '',
      name: record.name || '',
      picture: record.picture || '',
    },
    checkedAt: record.checked_at || record.checkedAt,
    ticketQuantity: Number(record.ticket_quantity ?? record.ticketQuantity ?? 1),
    ticketCost: Number(record.ticket_cost ?? record.ticketCost ?? 0),
    winningAmount: Number(record.winning_amount ?? record.winningAmount ?? 0),
    ticket: parseJson(record.raw_ticket_json ?? record.rawTicketJson, {}),
    isWinner: Boolean(record.is_winner ?? record.isWinner),
    matchedPrizes: parseJson(record.matched_prizes_json ?? record.matchedPrizesJson, []),
    source: record.source || '',
    sourceUrl: record.source_url || record.sourceUrl || '',
  };
}

function parseJson(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeUser(user) {
  const id = String(user?.id || user?.email || 'guest').trim().toLowerCase() || 'guest';
  return {
    id,
    email: String(user?.email || '').trim(),
    name: String(user?.name || (id === 'guest' ? 'Khách' : id)).trim(),
    picture: String(user?.picture || '').trim(),
  };
}

function normalizeTicketQuantity(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(Math.max(Math.trunc(parsed), 1), 999);
}

function recalculateAmountsForQuantity(record, nextQuantity) {
  const currentQuantity = normalizeTicketQuantity(record.ticket_quantity ?? record.ticketQuantity ?? 1);
  const unitTicketCost = Math.round(Number(record.ticket_cost ?? record.ticketCost ?? 0) / currentQuantity);
  const unitWinningAmount = Math.round(Number(record.winning_amount ?? record.winningAmount ?? 0) / currentQuantity);

  return {
    ticketCost: unitTicketCost * nextQuantity,
    winningAmount: unitWinningAmount * nextQuantity,
  };
}

function estimateWinningAmount(matchedPrizes = []) {
  return matchedPrizes.reduce((sum, prize) => sum + prizeAmount(prize.prize), 0);
}

function prizeAmount(prizeName = '') {
  const normalized = stripMarks(prizeName);
  if (normalized.includes('db') || normalized.includes('dac biet')) return 2000000000;
  if (normalized.includes('nhat')) return 30000000;
  if (normalized.includes('nhi')) return 15000000;
  if (normalized.includes('ba')) return 10000000;
  if (normalized.includes('tu')) return 3000000;
  if (normalized.includes('nam')) return 1000000;
  if (normalized.includes('sau')) return 400000;
  if (normalized.includes('bay')) return 200000;
  if (normalized.includes('tam')) return 100000;
  return 0;
}

function stripMarks(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}
