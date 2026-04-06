# 美睫 Vue 项目 · 面试速查（预约 / Supabase / RLS）

> 对应本轮模拟面试里反复强调的「必会点」。可与代码对照：`src/api/bookings.ts`、`src/stores/booking.ts`、`src/lib/supabase.ts`、`supabase/schema.sql`。

---

## 一页极简（关键词）

| 主题 | 关键词 |
|------|--------|
| 双后端 | `client.ts`（REST + ApiError） / `lib/supabase.ts`（anon 客户端） |
| bookings 优先级 | Supabase → `VITE_API_BASE_URL` → localStorage |
| 谁决定拉全表 | `main.ts`：`!isSupabaseConfigured() \|\| canAccessAdmin` → `hydrateBookings` |
| 非管理员不拿全表 | `hydrateBookings`：配了 SB 且非 admin → `bookings=[]`，return |
| 匿名占档从哪来 | `TimePicker` `watch` 日期 → `loadTakenSlotsForDate` → RPC `get_booked_times_for_date` → `slotTakenByDate` |
| `isBooked` | SB+非admin：`slotTakenByDate`；否则：`bookings` |
| 隐私截断在哪 | **RPC SQL** 只 `array_agg(time)`，不是 Pinia「藏数据」 |
| RLS 要点 | anon：`insert` + 调 RPC；`SELECT` 全表：`authenticated` + `is_booking_admin()` |
| 并发双订 | 前端挡不住；**部分唯一索引** `(date,time) where status<>'cancelled'` → `23505` → `isUniqueViolation` → 友好文案 |
| Anon key | `VITE_*` 进浏览器 = **公开**；安全靠 **RLS**；**禁止** `service_role` 进前端 |
| RPC 失败 | 可能 **全时段显示可约** + **unhandled rejection**；应 loading/禁用/提示 |

---

## 展开版（口述用）

### 1. 请求与错误

- 自建 API：`request()`，非 2xx → `ApiError(status, statusText, body)`，body 先 JSON 再 text。
- Supabase：返回 `{ data, error }` 或 throw，与 `ApiError` 不同。
- 当前 `client.ts` 的 `request()` **未带 Authorization**；401 只是统一当 HTTP 错误处理，不等于「业务上处理了 token 过期」。

### 2. 数据源与启动

- `isSupabaseConfigured()` 在 **`src/lib/supabase.ts`**。
- **`src/api/bookings.ts`** 写清优先级：**Supabase → REST → 本地**（非「只有 auth 决定」）。
- **`auth`**：`canAccessAdmin` = Mock（未配 SB）或 **SB 登录 + 管理员白名单 RPC**。

### 3. 匿名：只看到「时段被占」

- 选日期：**`TimePicker.vue`** → `loadTakenSlotsForDate` → `fetchBookedTimesForDate` → `sb.rpc(...)`。
- 缓存：`slotTakenByDate[date]`；展示：`isBooked` → 按钮 disabled + `Booked` 文案。
- **`BookingView`**：`handleSubmitBooking` 里 **`isBooked` 二次校验** + `addBooking` → DB 唯一约束兜底的并发。

### 4. 数据库层（schema.sql）

- **部分唯一索引**：`bookings_one_active_per_slot on (date, time) where status <> 'cancelled'`。
- **RPC**：`get_booked_times_for_date` · `security definer` · 返回 `text[]`，仅 `time`，无 PII。
- **策略**：`bookings_insert_public`（anon/authenticated insert）；`bookings_select_admin_only`（仅预约管理员可读行）。

### 5. 管理员 vs 匿名（createBooking）

- **管理员**：`insert` + `.select(BOOKING_COLUMNS)` 读回整行。
- **匿名**：仅 `insert`；成功则 **`return item`**（避免 insert 后 select 被 RLS 卡住）。

### 6. 前端安全边界（必背一句）

- **RLS + GRANT RPC** 在 PostgREST/Postgres 侧强制执行；Vue/Pinia 是体验与调用方式，**不可替代** RLS。
- **Anon key 公开可接受**的前提是：**RLS 正确**；泄露 **`service_role`** 则灾难级。

---

## 易错清单（对照自查）

1. 把「脱敏」说成只靠 store：`slotTakenByDate` 只是缓存 **已脱敏的 RPC 结果**。
2. 以为 `isBooked` 能防止所有双订：**只能降概率**；最终靠 **唯一索引**。
3. 混淆 `lib` 与 `auth`：「是否用 Supabase」看 **`isSupabaseConfigured`**；「能否读全表」看 **`canAccessAdmin` + hydrate 逻辑**。
4. 口述时漏掉 **TimePicker → loadTakenSlotsForDate**：面试官会认为不懂匿名数据从哪来。

---

*生成用途：复习与面试前 10 分钟过一遍。可按需删改为自己的口头禅。*
