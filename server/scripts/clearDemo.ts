import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(dirname, '..', 'data');
const databasePath = process.env.SQLITE_PATH || path.join(dataDir, 'check-ticket.sqlite');

if (!fs.existsSync(databasePath)) {
  console.log('Chưa có database để xóa dữ liệu demo.');
  process.exit(0);
}

const db = new Database(databasePath);
const result = db.prepare(`DELETE FROM ticket_checks WHERE id LIKE 'demo-%'`).run();
console.log(`Đã xóa ${result.changes || 0} vé mẫu khỏi ${databasePath}`);
