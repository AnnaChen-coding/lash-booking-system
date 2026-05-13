# FastAPI 最小后端（预约系统）

这个目录提供一个最小可运行的 FastAPI 后端，用于给当前 Vue 预约项目补充全栈能力展示。

## 阶段 0：与 Supabase 对齐（事实约定）

- **同一套表**：连 Supabase Postgres 时，读写的是已在云端存在的 `public.bookings`（由 `../supabase/schema.sql` 创建），**不是**本地 `app.db` 里的另一份数据。
- **ORM / 表结构**：`models.py` 与 `schema.sql` 一致：无 `created_at`；`status` 取值与库内 `bookings_status_check` 及 `schemas.BookingStatus` 一致。
- **REST JSON**：`GET/POST/PATCH` 返回的预约对象字段与前端 `BookingItem` 一致：`id, name, phone, service, date, time, notes, status`。
- **启动建表**：`create_all` 仅在目标库上创建**尚不存在**的表；Supabase 上表已存在时不会改表结构。新库务必先执行 `supabase/schema.sql`。

## 阶段 1：预约闭环（本目录已实现）

- `GET /bookings`、`POST /bookings`、`GET /booked-times?date=` 与 `PATCH/DELETE` 共用同一 `Session` / `Booking` ORM。
- `GET /booked-times` 的过滤与排序与 `schema.sql` 中 `get_booked_times_for_date` 一致：`status <> 'cancelled'`，`time` 升序。
- `POST /bookings` 冲突：`date`+`time` 相同且已有行 `status != 'cancelled'` → **409**，`detail` 为 `This time slot has already been booked.`（与 `insert_booking_anon` 的线别+时长容量规则不完全相同，见 `main.py` 注释）。

## 阶段 4：鉴权、支付回调、通知

- **匿名**：`GET /booked-times`、`POST /bookings`、`POST /bookings/{id}/confirm-payment`（模拟支付 pending_payment→paid）、`POST /auth/login`、`POST /notifications/booking-success`。
- **管理员 Bearer**：`GET /bookings`、`PATCH /bookings/{id}/status`、`DELETE /bookings/{id}`。支持 **FastAPI 自签 JWT**（`POST /auth/login`）或 **Supabase access_token**（配置 `SUPABASE_JWT_SECRET` 时由后端校验）。
- **白名单**：`public.admin_emails` 表和/或环境变量 `ADMIN_EMAILS`。登录口令：`FASTAPI_ADMIN_PASSWORD`。JWT 密钥：`FASTAPI_JWT_SECRET`（≥16 字符）。
- **勿**把 `SUPABASE_SERVICE_ROLE_KEY` 或 `FASTAPI_ADMIN_PASSWORD` 放进前端 `VITE_*`。

技术栈：
- FastAPI
- SQLAlchemy
- SQLite
- PostgreSQL（可选，通过 `DATABASE_URL`）
- Uvicorn

## 1) 安装依赖

在项目根目录执行：

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 2) 启动后端（本地 SQLite 零配置）

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

启动后可访问：
- Swagger 文档：[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- OpenAPI JSON：[http://127.0.0.1:8000/openapi.json](http://127.0.0.1:8000/openapi.json)

> 首次启动会自动创建 `backend/app.db` 和 `bookings` 表。

## 3) 启动后端（PostgreSQL 方式）

设置 `DATABASE_URL` 后，后端会优先连接 PostgreSQL（不再使用 SQLite）。

```bash
cd backend
source .venv/bin/activate
export DATABASE_URL="postgresql+psycopg2://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres"
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

或任意自建 Postgres：

```bash
export DATABASE_URL="postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/lashes_db"
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

说明：
- 若未设置 `DATABASE_URL`，默认回退到 `sqlite:///./app.db`
- `bookings` 表字段与接口行为保持一致，启动时仍会自动建表

## 4) 前端 .env.local 配置

在项目根目录创建或修改 `.env.local`：

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

你的前端数据源优先级保持不变：
- Supabase（已配置时优先）
- REST API（配置 `VITE_API_BASE_URL` 且未配置 Supabase 时）
- localStorage（两者都不可用时）

## 5) 启动 Vue 前端

在项目根目录执行：

```bash
npm install
npm run dev
```

默认访问地址通常为：
- [http://localhost:5173](http://localhost:5173)

## 6) 如何测试新增接口

### 方式 A：Swagger（推荐演示）
1. 打开 [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
2. 先用 `POST /bookings` 新建预约
3. 用 `GET /booked-times?date=...` 查看该日已占用开始时间
4. 再用 `GET /bookings` 查看结果
5. 用 `PATCH /bookings/{id}/status` 修改状态
6. 用 `DELETE /bookings/{id}` 删除预约

### 方式 B：前端页面联调
1. 启动后端与前端
2. 在预约页面提交订单
3. 在管理页面查看、改状态、删除

### 冲突校验验证
连续提交两条相同 `date + time` 且非 `cancelled` 状态的预约：
- 第二次会返回 `409 Conflict`
- 响应 JSON：`{"detail":"This time slot has already been booked."}`

### 本地联调验证（curl）
先补一句前端配置：在项目根目录的 `.env.local` 设置
`VITE_API_BASE_URL=http://127.0.0.1:8000` 后，Vue 即可走 REST API 分支（在未启用 Supabase 的前提下）。

> 下面命令可直接复制运行；第 1) 步会提取 `BOOKING_ID` 供第 3)、4) 步使用。

0) 查询某日已占用开始时间 `GET /booked-times?date=...`
```bash
curl -s "http://127.0.0.1:8000/booked-times?date=2026-05-01"
```

1) 创建预约 `POST /bookings`
```bash
BOOKING_ID=$(curl -s -X POST "http://127.0.0.1:8000/bookings" \
  -H "Content-Type: application/json" \
  -d '{"name":"Anna","phone":"13800138000","service":"Classic Lashes","date":"2026-05-01","time":"14:00","notes":"First visit","status":"pending"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])') && echo "BOOKING_ID=$BOOKING_ID"
```

2) 再次创建同 `date + time` 预约，验证 `409 Conflict`
```bash
curl -i -X POST "http://127.0.0.1:8000/bookings" \
  -H "Content-Type: application/json" \
  -d '{"name":"Bella","phone":"13900139000","service":"Classic Lashes","date":"2026-05-01","time":"14:00","notes":"Should conflict","status":"pending"}'
```

3) 修改预约状态 `PATCH /bookings/{id}/status`
```bash
curl -i -X PATCH "http://127.0.0.1:8000/bookings/${BOOKING_ID}/status" \
  -H "Content-Type: application/json" \
  -d '{"status":"confirmed"}'
```

4) 删除预约 `DELETE /bookings/{id}`
```bash
curl -i -X DELETE "http://127.0.0.1:8000/bookings/${BOOKING_ID}"
```

## 接口清单

- `GET /bookings`：获取全部预约（id 升序）
- `GET /booked-times`：查询参数 `date`，返回 `{ date, times }`，已占用开始时间（不含 `cancelled`）
- `POST /bookings`：创建预约（同槽位冲突 → 409）
- `DELETE /bookings/{id}`：删除预约
- `PATCH /bookings/{id}/status`：更新预约状态
