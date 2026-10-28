// 后端入口：登录 + 待办增删改查
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';

const app = express();
const PORT = 3000;
const SECRET = 'todo-secret'; // JWT 签名密钥
const EXPIRE = 24 * 60 * 60 * 1000; // 登录有效期：24 小时

app.use(cors());
app.use(express.json());

// 生成 token，并返回过期时间给前端
function makeToken(user) {
  const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: EXPIRE / 1000 });
  return { token, expiresAt: Date.now() + EXPIRE };
}

// 登录校验：没登录或 token 过期就返回 401
function checkLogin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  try {
    req.userId = jwt.verify(token, SECRET).id;
    next();
  } catch {
    res.status(401).json({ message: '请先登录' });
  }
}

// 登录
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username || '');

  if (!user || !bcrypt.compareSync(password || '', user.password)) {
    return res.status(401).json({ message: '用户名或密码错误' });
  }

  res.json({ user: { id: user.id, username: user.username }, ...makeToken(user) });
});

// 注册（可选功能，注册成功直接登录）
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password || password.length < 6) {
    return res.status(400).json({ message: '用户名不能为空，密码至少 6 位' });
  }
  if (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) {
    return res.status(409).json({ message: '用户名已存在' });
  }

  const result = db
    .prepare('INSERT INTO users (username, password) VALUES (?, ?)')
    .run(username, bcrypt.hashSync(password, 10));
  const user = { id: Number(result.lastInsertRowid), username };

  res.json({ user, ...makeToken(user) });
});

// 当前登录用户
app.get('/api/me', checkLogin, (req, res) => {
  res.json({ user: db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.userId) });
});

// 待办列表：复合排序（未完成在前 → 截止时间近的在前 → 没有时间的排最后）
app.get('/api/todos', checkLogin, (req, res) => {
  const list = db
    .prepare(
      `SELECT * FROM todos
       WHERE user_id = ?
       ORDER BY completed ASC, due_at IS NULL, due_at ASC, id DESC`
    )
    .all(req.userId);

  res.json(list);
});

// 新增待办
app.post('/api/todos', checkLogin, (req, res) => {
  const title = String(req.body.title || '').trim();
  if (!title) return res.status(400).json({ message: '待办内容不能为空' });

  const result = db
    .prepare('INSERT INTO todos (user_id, title, due_at, completed, created_at) VALUES (?, ?, ?, 0, ?)')
    .run(req.userId, title, req.body.dueAt || null, new Date().toISOString());

  res.json(db.prepare('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid));
});

// 修改待办：传了哪个字段就改哪个（勾选完成走这里）
app.put('/api/todos/:id', checkLogin, (req, res) => {
  const id = Number(req.params.id);
  const todo = db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?').get(id, req.userId);
  if (!todo) return res.status(404).json({ message: '待办不存在' });

  const title = req.body.title === undefined ? todo.title : String(req.body.title).trim();
  const dueAt = req.body.dueAt === undefined ? todo.due_at : req.body.dueAt || null;
  const completed = req.body.completed === undefined ? todo.completed : req.body.completed ? 1 : 0;

  if (!title) return res.status(400).json({ message: '待办内容不能为空' });

  db.prepare('UPDATE todos SET title = ?, due_at = ?, completed = ? WHERE id = ?').run(
    title,
    dueAt,
    completed,
    id
  );

  res.json(db.prepare('SELECT * FROM todos WHERE id = ?').get(id));
});

// 删除待办
app.delete('/api/todos/:id', checkLogin, (req, res) => {
  const result = db
    .prepare('DELETE FROM todos WHERE id = ? AND user_id = ?')
    .run(Number(req.params.id), req.userId);

  if (result.changes === 0) return res.status(404).json({ message: '待办不存在' });
  res.json({ message: '删除成功' });
});

app.listen(PORT, () => {
  console.log(`后端已启动：http://localhost:${PORT}`);
  console.log('预置账号：demo / demo1234');
});
