import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const dir = path.dirname(fileURLToPath(import.meta.url));

export const db = new Database(path.join(dir, 'todo.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS todos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    title      TEXT NOT NULL,
    due_at     TEXT,
    completed  INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
`);


const demo = db.prepare('SELECT id FROM users WHERE username = ?').get('demo');

if (!demo) {
  const userId = Number(
    db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('demo', bcrypt.hashSync('demo1234', 10))
      .lastInsertRowid
  );

  const insert = db.prepare(
    'INSERT INTO todos (user_id, title, due_at, completed, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  const now = Date.now();
  const hour = 60 * 60 * 1000;

  insert.run(userId, '写本周周报', new Date(now + 3 * hour).toISOString(), 0, new Date(now).toISOString());
  insert.run(userId, '和产品评审需求', new Date(now + 26 * hour).toISOString(), 0, new Date(now).toISOString());
  insert.run(userId, '买下周团建零食', null, 0, new Date(now).toISOString());
  insert.run(userId, '阅读《重构》第 3 章', new Date(now - 5 * hour).toISOString(), 0, new Date(now).toISOString());
  insert.run(userId, '配置本地开发环境', new Date(now - 26 * hour).toISOString(), 1, new Date(now).toISOString());

  console.log('已初始化数据库，预置账号：demo / demo1234');
}
