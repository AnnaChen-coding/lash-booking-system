# 美睫店官网（Vue 3 + FastAPI）

> **作品集 / 求职说明**：个人练习项目，模拟美睫门店官网与预约业务，用于展示 **Vue 3 工程化**、**TypeScript**、**Pinia + 路由守卫**，以及 **Vue 前端 + FastAPI 全栈** 的预约闭环。未启动后端时也可 **零配置本地体验**（Mock 登录 + `localStorage`），便于 clone 后快速演示。

基于 **Vue 3 + TypeScript + Vite** 的门店展示与在线预约系统：首页、服务列表、预约与模拟支付、评价展示，以及需管理员登录的后台预约管理。可选 **FastAPI** 后端提供 REST API、JWT 鉴权与 SQLite / PostgreSQL 持久化。

## 亮点速览

| 方向 | 说明 |
|------|------|
| 工程化 | Vite 7、`vue-tsc` 纳入 `build`、ESLint + Oxlint、Vitest 单元测试 |
| 状态与路由 | Pinia 管理认证与预约；`requiresAdmin` / `guestOnly` 路由守卫 |
| 数据层 | 配置 `VITE_API_BASE_URL` 时走 FastAPI；否则回退 `localStorage` |
| 预约可靠性 | 提交前刷新占用时段；后端同槽位冲突返回 409 |
| 支付演示 | `pending_payment` → 模拟支付页 → `confirm-payment` 改库为 `paid` |
| 通知 | 预约成功可走 `POST /notifications/booking-success` 或控制台 mock |
| UI | Element Plus；首页 / 服务 / 预约模块组件化 |

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3、Vue Router 5、Pinia、Element Plus、TypeScript |
| 构建 | Vite 7、vue-tsc、Vitest |
| 后端（可选） | FastAPI、SQLAlchemy、Uvicorn、PyJWT |
| 数据库 | SQLite（本地默认）或 PostgreSQL |

**Node.js**：`^20.19.0` 或 `>=22.12.0`（见 `package.json` 的 `engines`）。

## 功能概览

- **首页**（`/`）：轮播、服务精选、评价、门店位置与 CTA
- **服务**（`/services`）：服务列表与筛选
- **预约**（`/booking`）：选服务、选时段、填写表单；默认状态 `pending_payment`
- **模拟支付**（`/booking/pay/:id`）：支付宝 / 微信 UI 演示，约 1 秒后回调
- **支付结果**（`/booking/pay/:id/result`）：成功或失败（可通过环境变量配置随机失败概率）
- **登录**（`/login`）：未连后端时用 Mock 口令；连后端时用邮箱 + 密码换 JWT
- **后台**（`/admin`）：预约列表、筛选、改状态、删除（仅白名单管理员）

**数据持久化优先级**：配置了 `VITE_API_BASE_URL` 时 → **FastAPI REST**；未配置时 → 浏览器 **localStorage**（评价始终存于 `localStorage`）。

## 建议演示路径（约 2～3 分钟）

### 仅前端（最快）

```sh
npm install
npm run dev
```

1. 浏览首页、服务页、预约流程。
2. 完成预约后进入模拟支付与结果页。
3. 打开 `/login`，使用 Mock 口令 **`demo`**（见 `src/stores/auth.ts`）进入 `/admin`。

### 全栈联调

1. 按下方「后端」一节启动 FastAPI（`http://127.0.0.1:8000`）。
2. 根目录配置 `.env.local`：`VITE_API_BASE_URL=http://127.0.0.1:8000`。
3. 在 `backend/.env` 配置 `FASTAPI_JWT_SECRET`、`FASTAPI_ADMIN_PASSWORD`、`ADMIN_EMAILS`。
4. `npm run dev`，用白名单邮箱在 `/login` 登录后台。

## 快速开始

### 前端

```sh
npm install
npm run dev
```

开发地址一般为 [http://localhost:5173](http://localhost:5173)。

| 命令 | 说明 |
|------|------|
| `npm run dev` | 本地开发（热更新） |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run preview` | 预览构建产物 |
| `npm run test` | Vitest 监听模式 |
| `npm run test:run` | 单次运行测试 |
| `npm run lint` | Oxlint + ESLint（含 `--fix`） |

### 后端

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

复制并编辑 `backend/.env`（可参考根目录 `.env.example` 中后端相关注释）：

```env
DATABASE_URL=sqlite:///./app.db
FASTAPI_JWT_SECRET=your-long-random-secret-at-least-16-chars
FASTAPI_ADMIN_PASSWORD=change-me
ADMIN_EMAILS=owner@example.com
```

启动：

```sh
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

- API 文档：[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- 健康检查：`GET /health`

更完整的接口说明、curl 示例与 PostgreSQL 配置见 **[backend/README.md](./backend/README.md)**。

## 环境变量

### 前端（`.env.local`）

复制根目录 `.env.example` 为 `.env.local`（已被 git 忽略）：

```env
# 连接 FastAPI；留空则预约数据仅存 localStorage
VITE_API_BASE_URL=http://127.0.0.1:8000

# 预约成功通知：管理员邮箱（逗号分隔，可选）
# VITE_BOOKING_ADMIN_EMAILS=owner@example.com

# 支付页随机失败概率 0～1（可选，默认 0）
# VITE_PAYMENT_SIMULATE_FAIL_PROB=0.2
```

### 后端（`backend/.env`）

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | 默认 `sqlite:///./app.db`；生产可改为 PostgreSQL 连接串 |
| `FASTAPI_JWT_SECRET` | JWT 签名密钥，至少 16 字符 |
| `FASTAPI_ADMIN_PASSWORD` | 管理员登录口令 |
| `ADMIN_EMAILS` | 允许登录的管理员邮箱（逗号分隔） |

**安全提示**：勿将 `FASTAPI_ADMIN_PASSWORD`、`FASTAPI_JWT_SECRET` 写入前端 `VITE_*` 变量。

## 后台登录说明

| 模式 | 条件 | 方式 |
|------|------|------|
| Mock | 未配置 `VITE_API_BASE_URL` | 任意邮箱 + 口令 **`demo`**（`src/stores/auth.ts` 中 `MOCK_LOGIN_PASSWORD`） |
| REST | 已配置 `VITE_API_BASE_URL` 且后端已启动 | 白名单邮箱 + `FASTAPI_ADMIN_PASSWORD`，获取 Bearer Token |

登录后访问 `/admin`；非管理员 token 会被服务端拒绝并在前端清除会话。

## 路由一览

| 路径 | 说明 |
|------|------|
| `/` | 首页 |
| `/services` | 服务列表 |
| `/booking` | 在线预约 |
| `/booking/pay/:id` | 模拟支付 |
| `/booking/pay/:id/result` | 支付结果 |
| `/login` | 登录 |
| `/admin` | 后台管理（需管理员） |

## 目录结构

```
vue-Lashes-project/
├── src/
│   ├── api/              # HTTP 客户端、预约接口
│   ├── components/       # 页面区块（home、services、booking、admin）
│   ├── data/             # 静态展示数据
│   ├── lib/              # 支付回调、远程策略等
│   ├── router/           # 路由与导航守卫
│   ├── services/         # 预约成功通知
│   ├── stores/           # Pinia（auth、booking、homereview）
│   ├── types/            # TypeScript 类型
│   ├── utils/            # 时段可用性、AI 推荐等
│   ├── views/            # 页面级视图
│   └── __tests__/        # Vitest 测试
├── backend/
│   ├── main.py           # FastAPI 入口
│   ├── database.py       # 数据库连接
│   ├── models.py         # ORM 模型
│   ├── schemas.py        # Pydantic 模型
│   ├── security.py       # JWT 与管理员校验
│   └── README.md         # 后端 API 详细文档
├── .env.example          # 环境变量模板
└── package.json
```

## 核心 API（FastAPI）

| 方法 | 路径 | 权限 |
|------|------|------|
| `POST` | `/auth/login` | 匿名 |
| `GET` | `/auth/me` | Bearer |
| `GET` | `/booked-times?date=` | 匿名 |
| `POST` | `/bookings` | 匿名（冲突 → 409） |
| `POST` | `/bookings/{id}/confirm-payment` | 匿名（`pending_payment` → `paid`） |
| `GET` | `/bookings` | 管理员 |
| `PATCH` | `/bookings/{id}/status` | 管理员 |
| `DELETE` | `/bookings/{id}` | 管理员 |
| `POST` | `/notifications/booking-success` | 匿名（通知桩） |

## 开发建议

- 编辑器安装 **Vue - Official（Volar）**；若使用 Vetur 建议禁用以免冲突。
- 浏览器可安装 [Vue DevTools](https://devtools.vuejs.org/)。
- 修改后端环境变量后需 **重启 uvicorn**。
- 前端改 `.env.local` 后需 **重启 `npm run dev`**。

## 许可与说明

本项目为 **虚构门店场景** 的作品集代码，展示技术实现而非真实商户数据；**不构成**对任何实体店铺或支付渠道的背书。部署到公网前请替换文案、图片与密钥，并审阅鉴权与 CORS 配置是否满足你的场景。


