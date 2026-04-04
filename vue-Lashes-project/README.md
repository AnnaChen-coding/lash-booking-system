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
- **后台**（`/admin`）：预约列表、筛选与统计（需登录）
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
2. 在 **SQL Editor** 中执行 **`supabase/schema.sql` 全文**（含表、唯一约束、RPC、RLS）。若你曾执行过「所有人可读写」的旧版策略，可先运行 `supabase/migrate-from-open-policies.sql`，再执行 `schema.sql` 中从「唯一索引 / 函数 / RLS」起的部分，或整份 `schema.sql`（`DROP POLICY IF EXISTS` 可重复执行）。
3. **Authentication → Users**：**Add user** 创建管理员邮箱与密码（用于登录 `/login` 进入后台）。本地开发可在 **Authentication → Providers → Email** 中关闭 **Confirm email**，避免收不到确认邮件无法登录。
4. 在项目根目录配置：

```env
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

5. 重启 `npm run dev`。

**安全模型（当前 `schema.sql`）**

- **预约**：匿名只能 **插入** 新预约；**查看列表 / 改状态 / 删除** 仅 **已登录（authenticated）** 用户；匿名通过 RPC `get_booked_times_for_date` 仅获取某日「已被占用的时间段」，不暴露客户姓名电话。
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

- **已配置 Supabase**：使用在控制台 **Authentication** 中创建的用户邮箱与密码登录；退出会调用 `signOut` 并清空本地会话。
- **未配置 Supabase**：使用 Mock 口令，可在 `src/stores/auth.ts` 修改 `MOCK_LOGIN_PASSWORD`（默认 **`demo`**），令牌存于 `localStorage`（键名见同文件 `MOCK_STORAGE_KEY`）。

## 路由一览

| 路径 | 说明 |
|------|------|
| `/` | 首页 |
| `/services` | 服务 |
| `/booking` | 预约 |
| `/login` | 登录（已登录会跳转首页或 `redirect` 参数） |
| `/admin` | 后台（未登录跳转登录并带回跳地址） |

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
  schema.sql                        # 建表、RPC、RLS（推荐安全配置）
  migrate-from-open-policies.sql   # 从旧版「全开」策略迁移时可选
```

## 开发建议

- 编辑器推荐安装 **Vue - Official（Volar）**；若曾使用 Vetur，建议禁用以免冲突。
- 浏览器可安装 [Vue DevTools](https://devtools.vuejs.org/) 便于调试。

## 许可与说明

本项目为门店官网前端示例；`package.json` 中 `name`/`version` 可按发布需要自行调整。
