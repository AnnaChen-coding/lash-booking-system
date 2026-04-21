# 美睫店官网（Vue 3）

> **作品集 / 求职说明**：个人练习项目，模拟美睫门店官网与预约业务，用于展示 **Vue 3 工程化能力**、**TypeScript 类型约束**、**Pinia + 路由守卫**、以及 **Supabase（Auth / Postgres / RLS / RPC）+ 可选 Edge Function** 的一体化思路。未配置云端时也可 **零密钥本地运行**（Mock 登录 + `localStorage`），便于面试官 clone 后快速体验。

基于 **Vue 3 + TypeScript + Vite** 的门店展示与预约前端：首页、服务列表、在线预约与评价、模拟支付闭环，以及需登录的后台预约管理。

## 亮点速览（便于简历 / 面试对照）

- **工程化**：Vite 7、`vue-tsc` 纳入 `build`、ESLint + Oxlint 双检。
- **状态与路由**：Pinia 管理预约与认证；路由 `meta`（`requiresAdmin`、`guestOnly`）与 `beforeEach` 守卫联动白名单逻辑。
- **数据层抽象**：同一套 UI 下 **Supabase → 通用 REST → localStorage** 优先级降级，接口集中在 `src/api/`。
- **预约可靠性**：数据库唯一约束 + 提交前强制刷新占用时段 + 冲突时推荐可替代时段（前后端双重校验思路）。
- **支付与权限演示**：`pending_payment` 状态；匿名无表 `UPDATE` 权限时，通过 **Security Definer RPC** `confirm_booking_payment_simulation` 模拟「支付回调改库」；非兼容库时 `?mock=1` 纯前端演示。
- **通知链路**：预约成功后 **自建 API / Supabase `functions.invoke` / 控制台 mock** 多路分发（`src/services/bookingNotification.ts`）；可选 **Deno Edge Function + Resend** 发真实邮件。
- **UI**：Element Plus；首页与服务模块分区组件化。

## 建议演示路径（约 2～3 分钟）

1. `npm install && npm run dev`（默认多为 `http://localhost:5173`）。
2. 浏览 **首页**、**服务列表与筛选**、**预约**（选服务 → 时段 → 表单提交）。
3. 进入 **模拟支付页** → **支付结果页**（可多次尝试以观察模拟失败分支）。
4. 打开 **`/login`**：未配置 Supabase 时使用 Mock 口令 **`demo`**（可在 `src/stores/auth.ts` 修改）→ 进入 **`/admin`** 查看列表、筛选与统计。

若已按下文配置 Supabase，可补充说明：**RLS 下的匿名预约**、**白名单管理员后台**、以及可选 **Edge Function 邮件**。

## 技术栈

| 类别 | 选用 |
|------|------|
| 框架 | Vue 3、Vue Router 5、Pinia |
| 构建 | Vite 7 |
| UI | Element Plus |
| 工具 | TypeScript、ESLint、Oxlint、vue-tsc |
| 数据（可选） | Supabase（`@supabase/supabase-js`）或自建 REST / localStorage |

**Node.js**：`^20.19.0` 或 `>=22.12.0`（见 `package.json` 的 `engines`）。

## 功能概览

- **首页**：轮播、服务精选、评价、门店信息与 CTA
- **服务**（`/services`）：服务列表与筛选
- **预约**（`/booking`）：选择服务、时段并提交预约；提交后默认进入 **待支付**（`pending_payment`），并跳转 **模拟支付页**（支付宝 / 微信二选一，前端演示约 1 秒后回调）
- **支付结果**（`/booking/pay/:id/result`）：展示成功或失败（模拟渠道有约 20% 失败概率）；若数据库尚未支持待支付 / 支付 RPC，会使用 `?mock=1` **仅前端演示**（不写库为已支付）
- **后台**（`/admin`）：预约列表、筛选与统计（仅 **admin_emails 白名单邮箱** 可访问，见 Supabase 一节）
- **登录**（`/login`）：未配置 Supabase 时为本地 Mock；配置 Supabase 后为 **Supabase Auth 邮箱密码**

数据持久化优先级：**Supabase**（`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`）→ 通用 REST（`VITE_API_BASE_URL`）→ 浏览器 **localStorage**。

## 快速开始

```sh
npm install
npm run dev
```

默认开发服务器地址以终端输出为准（一般为 `http://localhost:5173`）。

### 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 本地开发（热更新） |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run preview` | 预览构建产物 |
| `npm run lint` | Oxlint + ESLint（含 `--fix`） |

## 环境变量（可选）

在项目根目录新建 `.env.local`（已被 `.gitignore` 的 `*.local` 忽略）或 `.env`，可参考仓库内 `.env.example`。

### Supabase（推荐，真实云端数据库）

1. 在 [Supabase](https://supabase.com) 新建项目，打开 **Project Settings → API**，复制 **Project URL** 与 **anon public** 密钥。
2. 在 **SQL Editor** 中执行 **`supabase/schema.sql` 全文**（含 `admin_emails`、唯一约束、RPC、RLS、**待支付 / 模拟支付回调 RPC** 等）。若你曾执行过「所有人可读写」的旧版策略，可先运行 `supabase/migrate-from-open-policies.sql`，再执行 `schema.sql` 中从「唯一索引 / 函数 / RLS」起的部分，或整份 `schema.sql`（`DROP POLICY IF EXISTS` 可重复执行）。若已有数据库仅需升级白名单与策略，可执行 **`supabase/migrate-admin-emails.sql`**（并自行补上 `bookings_insert_public` 等缺失策略时，以 `schema.sql` 为准）。**若库是更早版本、缺少支付相关字段与 RPC**，可在 SQL Editor 追加执行 **`supabase/migration_payment_flow.sql`**（与 `schema.sql` 中相关段落等价，用于增量升级）。
3. **登记管理员邮箱**（必须，否则无法进后台）：在 SQL Editor 执行，把邮箱改成你的：
   `insert into public.admin_emails (email) values ('you@example.com');`
   可插入多行以增加多个管理员。
4. **Authentication → Users**：**Add user** 创建与白名单 **完全相同邮箱** 的账号与密码。本地开发可在 **Authentication → Providers → Email** 中关闭 **Confirm email**。建议在项目设置中 **关闭公开自助注册**，只保留你手动创建的用户，避免陌生人注册后占用 Auth 配额（即便他们仍无法进后台）。
5. 在项目根目录配置：

```env
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

6. （可选）**预约邮件通知**：将 `supabase/functions/booking-notify` 部署为 Supabase **Edge Function**（名称默认可为 `booking-notify`，与 `VITE_SUPABASE_NOTIFY_FUNCTION` 一致）。在 Dashboard → Edge Functions → Secrets 中配置：
   - `RESEND_API_KEY`、`RESEND_FROM_EMAIL`（通过 [Resend](https://resend.com) 发信）
   - `BOOKING_ADMIN_EMAILS`（逗号分隔，店长通知收件人；可与前端的 `VITE_BOOKING_ADMIN_EMAILS` 分工：前者用于 Edge Function 发信，后者用于自建 REST / 前端降级 mock 时的展示）
   未部署或密钥缺失时，前端会按 `src/services/bookingNotification.ts` 自动降级为 **控制台模拟通知**。
7. 重启 `npm run dev`。

**安全模型（当前 `schema.sql`）**

- **管理员**：仅 `public.admin_emails` 中出现的邮箱（且已在 Auth 中注册）可调用 RPC `current_user_is_admin` 为真，并可在 RLS 下 **SELECT/UPDATE/DELETE** `bookings`。前端路由与导航亦依赖该结果（`canAccessAdmin`）。
- **预约**：匿名只能 **插入** 新预约；**查看列表 / 改状态 / 删除** 仅上述管理员；匿名通过 RPC `get_booked_times_for_date` 仅获取某日「已被占用的时间段」，不暴露客户姓名电话。已登录但 **不在白名单** 的用户与普通访客一样，只能通过 RPC 看时段占用，**不能**进 `/admin` 或拉全表。
- **模拟支付回调**：匿名可调用 RPC `confirm_booking_payment_simulation`，**仅**允许将单条 `pending_payment` 更新为 `paid`（用于演示「渠道回调改库」，非真实第三方支付）。
- **评价**：匿名可 **读、发**；不提供匿名 **改/删**（防篡改；若需后台删评价需另行加策略）。
- **唯一约束**：同一日期+时段仅允许一条未取消预约（与前端冲突提示一致）。

前端逻辑见 `src/lib/supabase.ts`、`src/lib/paymentCallback.ts`、`src/stores/auth.ts`、`src/api/bookings.ts`、`src/api/reviews.ts`、`src/services/bookingNotification.ts`。

### 通用 REST 后端

未配置 Supabase 时，可配置自建 API（不要末尾斜杠）：

```env
VITE_API_BASE_URL=https://your-api.example.com
```

可选通知配置：

```env
# 管理员通知邮箱（多个逗号分隔）
VITE_BOOKING_ADMIN_EMAILS=owner@example.com,manager@example.com

# 可选：Supabase Edge Function 名称（默认 booking-notify）
VITE_SUPABASE_NOTIFY_FUNCTION=booking-notify
```

接口约定（可按后端调整，详见 `src/api/bookings.ts`、`src/api/reviews.ts`）：

- **预约**：`GET/POST /bookings`，`DELETE /bookings/:id`，`PATCH /bookings/:id`（body：`{ status }`）
- **评价**：`GET /reviews`，`POST /reviews`
- **通知（可选）**：`POST /notifications/booking-success`（预约成功时触发；若接口或 Supabase 函数不可用，前端自动降级到短信模拟并打印日志）

## 后台登录说明

- **已配置 Supabase**：邮箱须同时在 **admin_emails** 与 **Authentication → Users** 中存在；登录成功且在白名单内才可进后台。非白名单账号会提示错误并已自动 `signOut`。退出会调用 `signOut` 并清空本地会话。
- **未配置 Supabase**：使用 Mock 口令，可在 `src/stores/auth.ts` 修改 `MOCK_LOGIN_PASSWORD`（默认 **`demo`**），令牌存于 `localStorage`（键名见同文件 `MOCK_STORAGE_KEY`）。

## 路由一览

| 路径 | 说明 |
|------|------|
| `/` | 首页 |
| `/services` | 服务 |
| `/booking` | 预约 |
| `/booking/pay/:id` | 模拟支付（路径参数为预约 `id`；`?mock=1` 时仅演示 UI，不写库） |
| `/booking/pay/:id/result` | 支付结果页（`?ok=1` / `?ok=0` 等由支付页跳转带入） |
| `/login` | 登录（已登录会跳转首页或 `redirect` 参数） |
| `/admin` | 后台（未登录跳转登录；已登录但非白名单邮箱回首页） |

## 目录结构（简要）

```
src/
  api/           # HTTP 客户端与预约、评价接口（含 Supabase 分支）
  lib/           # Supabase 客户端、模拟支付回调 RPC 封装
  services/      # 预约成功后的通知分发（REST / Edge Function / mock）
  components/    # 页面区块与可复用组件（含 admin、booking、home、services）
  data/          # 静态展示数据
  router/        # 路由与导航守卫
  stores/        # Pinia（认证、预约等）
  types/         # TypeScript 类型
  utils/         # 工具函数
  views/         # 页面级视图（含 BookingPayment* 支付演示页）
supabase/
  schema.sql                     # 建表、admin_emails、RPC、RLS（含支付相关）
  migration_payment_flow.sql     # 旧库增量：状态枚举、匿名插入 id、支付确认 RPC
  functions/booking-notify/      # Edge Function：Resend 邮件通知（可选）
  migrate-from-open-policies.sql # 从旧版「全开」策略迁移时可选
  migrate-admin-emails.sql       # 已有库时仅升级管理员白名单与预约 RLS
```

## 开发建议

- 编辑器推荐安装 **Vue - Official（Volar）**；若曾使用 Vetur，建议禁用以免冲突。
- 浏览器可安装 [Vue DevTools](https://devtools.vuejs.org/) 便于调试。

## 许可与说明

本项目为 **虚构门店场景** 的作品集代码，展示技术实现而非真实商户数据；**不构成**对任何实体店铺或支付渠道的背书。部署到公网前请自行替换文案、图片与密钥，并审阅 `schema.sql` 中的安全策略是否满足你的场景。

`package.json` 中的 `name` / `version` 可按需调整；若投递简历，建议附上 **本仓库链接** 与（如有）**线上 Demo**，并在简历项目条目中用 2～3 句话概括「亮点速览」中的关键词。
