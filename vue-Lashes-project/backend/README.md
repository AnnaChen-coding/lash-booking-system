# FastAPI 最小后端（预约系统）

这个目录提供一个最小可运行的 FastAPI 后端，用于给当前 Vue 预约项目补充全栈能力展示。

技术栈：
- FastAPI
- SQLAlchemy
- SQLite
- Uvicorn

## 1) 安装依赖

在项目根目录执行：

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 2) 启动后端

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

启动后可访问：
- Swagger 文档：[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- OpenAPI JSON：[http://127.0.0.1:8000/openapi.json](http://127.0.0.1:8000/openapi.json)

> 首次启动会自动创建 `backend/app.db` 和 `bookings` 表。

## 3) 前端 .env.local 配置

在项目根目录创建或修改 `.env.local`：

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

你的前端数据源优先级保持不变：
- Supabase（已配置时优先）
- REST API（配置 `VITE_API_BASE_URL` 且未配置 Supabase 时）
- localStorage（两者都不可用时）

## 4) 启动 Vue 前端

在项目根目录执行：

```bash
npm install
npm run dev
```

默认访问地址通常为：
- [http://localhost:5173](http://localhost:5173)

## 5) 如何测试新增接口

### 方式 A：Swagger（推荐演示）
1. 打开 [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
2. 先用 `POST /bookings` 新建预约
3. 再用 `GET /bookings` 查看结果
4. 用 `PATCH /bookings/{id}/status` 修改状态
5. 用 `DELETE /bookings/{id}` 删除预约

### 方式 B：前端页面联调
1. 启动后端与前端
2. 在预约页面提交订单
3. 在管理页面查看、改状态、删除

### 冲突校验验证
连续提交两条相同 `date + time` 且非 `cancelled` 状态的预约：
- 第二次会返回 `409 Conflict`
- 错误信息为：`This time slot is already booked.`

### 本地联调验证（curl）
先补一句前端配置：在项目根目录的 `.env.local` 设置
`VITE_API_BASE_URL=http://127.0.0.1:8000` 后，Vue 即可走 REST API 分支（在未启用 Supabase 的前提下）。

> 下面 4 条命令可直接复制运行；第 1 条会自动提取 `id` 供第 3、4 条使用。

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

- `GET /bookings`：获取全部预约
- `POST /bookings`：创建预约（含时间冲突校验）
- `DELETE /bookings/{id}`：删除预约
- `PATCH /bookings/{id}/status`：更新预约状态
