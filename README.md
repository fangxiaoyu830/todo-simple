# 个人待办事项管理系统

前后端分离的待办管理小应用：登录后管理自己的待办，默认按「未完成在前、截止时间近的在前」排序。

代码很薄：后端 2 个 js 文件，前端 7 个文件，没有分层、没有组件库，适合作为课程作业或入门项目。

## 功能

- 登录：用户名 + 密码，预置账号 `demo / demo1234`，也支持注册
- 登录状态保持 24 小时（JWT），刷新页面不用重新登录
- 未登录访问 `/todos` 自动跳到登录页；退出登录清除登录态
- 待办增删改查：标题、截止时间、创建时间、完成状态
- 复合排序：未完成的在上 → 截止时间近的在上 → 没设时间的排最后
- 按「全部 / 未完成 / 已完成」筛选

## 技术栈

| 部分 | 技术 |
| --- | --- |
| 前端 | Vue 3 + Vue Router 4 + Vite 5，原生 fetch，普通 CSS |
| 后端 | Node.js 18+ + Express 4 |
| 数据库 | SQLite（better-sqlite3，不需要单独安装数据库服务） |
| 登录 | jsonwebtoken（JWT，24 小时）+ bcryptjs（密码加密） |

## 项目结构

```
todo-simple/
├── server/                 # 后端
│   ├── package.json
│   ├── db.js               # 建表 + 预置账号和示例数据
│   └── index.js            # 全部接口（登录、注册、待办增删改查）
└── web/                    # 前端
    ├── package.json
    ├── vite.config.js      # 把 /api 代理到 3000
    ├── index.html
    └── src/
        ├── main.js         # 入口
        ├── api.js          # 请求封装 + 登录状态
        ├── router.js       # 路由 + 未登录拦截
        ├── App.vue
        ├── Login.vue       # 登录页
        ├── Todos.vue       # 待办页
        └── style.css       # 全部样式
```

## 启动步骤

### 1. 环境要求

Node.js 18 以上（推荐 20 / 22 的 LTS 版本），npm 9 以上。

```bash
node -v
npm -v
```

### 2. 安装依赖

```bash
cd server
npm install

cd ../web
npm install
```

### 3. 初始化数据库

不需要手动操作。第一次启动后端时会自动建表，并写入预置账号和 5 条示例待办。

- 数据库文件：`server/todo.db`（已加入 `.gitignore`，不会提交）
- 想重置数据：删掉 `server/todo.db` 再启动后端即可

### 4. 启动（需要两个终端）

```bash
# 终端 1：后端
cd server
npm run dev          # 或 npm start

# 终端 2：前端
cd web
npm run dev
```

浏览器打开 <http://localhost:5173>，用 `demo / demo1234` 登录。

> 后端跑在 3000，前端跑在 5173，前端的 `/api` 请求由 Vite 代理转给后端，因此不存在跨域问题。

### 5. 构建生产版本（可选）

```bash
cd web
npm run build        # 产物在 web/dist
```

## 预置账号

| 用户名 | 密码 |
| --- | --- |
| `demo` | `demo1234` |

登录页有「使用演示账号」按钮，点一下自动填好。

## 接口清单

- 地址前缀：`http://localhost:3000/api`
- 需要登录的接口要带请求头：`Authorization: Bearer <token>`
- 出错时返回 `{ "message": "错误提示" }`，状态码 400 / 401 / 404 / 409

| 方法 | 路径 | 说明 | 需登录 |
| --- | --- | --- | --- |
| POST | `/api/login` | 登录，返回 `{ user, token, expiresAt }` | 否 |
| POST | `/api/register` | 注册，返回同上 | 否 |
| GET | `/api/me` | 当前登录用户 | 是 |
| GET | `/api/todos` | 待办列表（已按复合规则排好序） | 是 |
| POST | `/api/todos` | 新增待办 | 是 |
| PUT | `/api/todos/:id` | 修改待办（传哪个字段就改哪个） | 是 |
| DELETE | `/api/todos/:id` | 删除待办 | 是 |

### 请求示例

```bash
# 登录
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"demo\",\"password\":\"demo1234\"}"

# 查列表
curl http://localhost:3000/api/todos -H "Authorization: Bearer <token>"

# 新增
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d "{\"title\":\"写周报\",\"dueAt\":\"2026-10-29T10:00:00.000Z\"}"

# 勾选完成
curl -X PUT http://localhost:3000/api/todos/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d "{\"completed\":true}"
```

## 数据表

```sql
users (id, username, password)                      -- password 是 bcrypt 加密后的串
todos (id, user_id, title, due_at, completed, created_at)
```

时间统一用 ISO 8601 字符串（UTC）存储，前端展示时转成本地时间。所有待办查询都带 `user_id` 条件，用户之间数据隔离。

## 排序规则

列表接口里的这一行 SQL 就是全部排序逻辑：

```sql
ORDER BY completed ASC,          -- 未完成在前
         due_at IS NULL,         -- 没设截止时间的排最后
         due_at ASC,             -- 截止时间近的在前
         id DESC                 -- 时间相同按 id 倒序，保证顺序稳定
```

## 常见问题

| 现象 | 原因 / 解决 |
| --- | --- |
| 启动报 `Cannot use import statement outside a module` | 两个 `package.json` 都要有 `"type": "module"` |
| `npm install` 报 `EJSONPARSE ... Unexpected end of JSON input` | 对应的 `package.json` 是空文件，把内容补全后保存 |
| 启动报 `Expected ";" but found ":"` 并跟一串 esbuild 堆栈 | 配置文件有语法错误（常见是结尾把 `;` 敲成 `:`），按报错里的「文件:行:列」改 |
| 前端页面能打开但请求 404 | 后端没启动，或 `vite.config.js` 里的代理地址写错 |
| 页面白屏、控制台报模块错误 | 有源文件是空的（尤其 `src/main.js`），检查文件大小是否为 0 |
| 登录提示用户名或密码错误 | 数据库没初始化，删掉 `server/todo.db` 后重启后端 |
| 安装 `better-sqlite3` 失败 | Node 版本不匹配，换成 20 或 22 的 LTS 版本后重新 `npm install` |
| 端口被占用 | 改 `server/index.js` 里的 `PORT`，并同步改 `vite.config.js` 的代理端口 |
