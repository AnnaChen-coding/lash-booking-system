# 美睫店官网（Vue 3）

基于 **Vue 3 + TypeScript + Vite** 的美睫门店展示与预约前端：首页展示、服务列表、在线预约、评价留言，以及需登录的后台预约管理。

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
- **预约**（`/booking`）：选择服务、时段并提交预约
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
2. 在 **SQL Editor** 中执行 **`supabase/schema.sql` 全文**（含 `admin_emails`、唯一约束、RPC、RLS）。若你曾执行过「所有人可读写」的旧版策略，可先运行 `supabase/migrate-from-open-policies.sql`，再执行 `schema.sql` 中从「唯一索引 / 函数 / RLS」起的部分，或整份 `schema.sql`（`DROP POLICY IF EXISTS` 可重复执行）。若已有数据库仅需升级白名单与策略，可执行 **`supabase/migrate-admin-emails.sql`**（并自行补上 `bookings_insert_public` 等缺失策略时，以 `schema.sql` 为准）。
3. **登记管理员邮箱**（必须，否则无法进后台）：在 SQL Editor 执行，把邮箱改成你的：
   `insert into public.admin_emails (email) values ('you@example.com');`
   可插入多行以增加多个管理员。
4. **Authentication → Users**：**Add user** 创建与白名单 **完全相同邮箱** 的账号与密码。本地开发可在 **Authentication → Providers → Email** 中关闭 **Confirm email**。建议在项目设置中 **关闭公开自助注册**，只保留你手动创建的用户，避免陌生人注册后占用 Auth 配额（即便他们仍无法进后台）。
5. 在项目根目录配置：

```env
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

6. 重启 `npm run dev`。

**安全模型（当前 `schema.sql`）**

- **管理员**：仅 `public.admin_emails` 中出现的邮箱（且已在 Auth 中注册）可调用 RPC `current_user_is_admin` 为真，并可在 RLS 下 **SELECT/UPDATE/DELETE** `bookings`。前端路由与导航亦依赖该结果（`canAccessAdmin`）。
- **预约**：匿名只能 **插入** 新预约；**查看列表 / 改状态 / 删除** 仅上述管理员；匿名通过 RPC `get_booked_times_for_date` 仅获取某日「已被占用的时间段」，不暴露客户姓名电话。已登录但 **不在白名单** 的用户与普通访客一样，只能通过 RPC 看时段占用，**不能**进 `/admin` 或拉全表。
- **评价**：匿名可 **读、发**；不提供匿名 **改/删**（防篡改；若需后台删评价需另行加策略）。
- **唯一约束**：同一日期+时段仅允许一条未取消预约（与前端冲突提示一致）。

前端逻辑见 `src/lib/supabase.ts`、`src/stores/auth.ts`、`src/api/bookings.ts`、`src/api/reviews.ts`。

### 通用 REST 后端

未配置 Supabase 时，可配置自建 API（不要末尾斜杠）：

```env
VITE_API_BASE_URL=https://your-api.example.com
```

接口约定（可按后端调整，详见 `src/api/bookings.ts`、`src/api/reviews.ts`）：

- **预约**：`GET/POST /bookings`，`DELETE /bookings/:id`，`PATCH /bookings/:id`（body：`{ status }`）
- **评价**：`GET /reviews`，`POST /reviews`

## 后台登录说明

- **已配置 Supabase**：邮箱须同时在 **admin_emails** 与 **Authentication → Users** 中存在；登录成功且在白名单内才可进后台。非白名单账号会提示错误并已自动 `signOut`。退出会调用 `signOut` 并清空本地会话。
- **未配置 Supabase**：使用 Mock 口令，可在 `src/stores/auth.ts` 修改 `MOCK_LOGIN_PASSWORD`（默认 **`demo`**），令牌存于 `localStorage`（键名见同文件 `MOCK_STORAGE_KEY`）。

## 路由一览

| 路径 | 说明 |
|------|------|
| `/` | 首页 |
| `/services` | 服务 |
| `/booking` | 预约 |
| `/login` | 登录（已登录会跳转首页或 `redirect` 参数） |
| `/admin` | 后台（未登录跳转登录；已登录但非白名单邮箱回首页） |

## 目录结构（简要）

```
src/
  api/           # HTTP 客户端与预约、评价接口（含 Supabase 分支）
  lib/           # Supabase 客户端封装
  components/    # 页面区块与可复用组件（含 admin、booking、home、services）
  data/          # 静态展示数据
  router/        # 路由与导航守卫
  stores/        # Pinia（认证、预约等）
  types/         # TypeScript 类型
  utils/         # 工具函数
  views/         # 页面级视图
supabase/
  schema.sql                     # 建表、admin_emails、RPC、RLS
  migrate-from-open-policies.sql # 从旧版「全开」策略迁移时可选
  migrate-admin-emails.sql       # 已有库时仅升级管理员白名单与预约 RLS
```

## 开发建议

- 编辑器推荐安装 **Vue - Official（Volar）**；若曾使用 Vetur，建议禁用以免冲突。
- 浏览器可安装 [Vue DevTools](https://devtools.vuejs.org/) 便于调试。

## 许可与说明

本项目为门店官网前端示例；`package.json` 中 `name`/`version` 可按发布需要自行调整。
