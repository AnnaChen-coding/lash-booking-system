import type { BookingItem } from '@/types/booking'
import type { ScheduleLine } from '@/data/scheduleConfig'
import type { PublicBookingBlock } from '@/types/schedule'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { toError } from '@/lib/toError'
import { isRemoteApi, request } from './client'
import { bookingsToBlocks, legacyBookedTimesToBlocks } from '@/utils/scheduleAvailability'

// 本地存储的键名
const STORAGE_KEY = 'bookings'

/** PostgreSQL `integer` / `serial` 上限；超出则不能用 `p_id integer` 类 RPC */
const MAX_PG_INTEGER = 2_147_483_647

const MSG_ANON_NO_DB_ORDER_ID =
  '无法取得数据库订单号：匿名直连 insert 后不能 SELECT 回本行，支付会用到错误 id。请在 Supabase SQL Editor 执行 supabase/schema.sql 中的 insert_booking_anon（并授予 anon 执行），然后重新预约。'

// 这个是给 Supabase .select() 用的字段列表。
const BOOKING_COLUMNS =
  'id,name,phone,service,date,time,notes,status' as const

// 读取本地存储
function readLocal(): BookingItem[] {
  // 尝试将本地存储的 JSON 字符串转换为 BookingItem 数组
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as BookingItem[]
  } catch {
    // 如果转换失败，则返回空数组
    return []
  }
}
// 写入本地存储
function writeLocal(items: BookingItem[]) {
  // 将 BookingItem 数组转换为 JSON 字符串，并写入本地存储
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}
// 将值转换为 ID
function toId(value: unknown): number {
  // 如果值是数字，并且是有限的，则返回值
  if (typeof value === 'number' && Number.isFinite(value)) return value
  // 如果值是字符串，则转换为数字
  if (typeof value === 'string') {
    // 转换为数字
    const n = Number(value)
    // 如果转换后的数字是有限的，则返回数字
    if (Number.isFinite(n)) return n
  }
  // 如果转换失败，则抛出错误
  throw new Error('Invalid id from database')
}

const BOOKING_STATUSES: readonly BookingItem['status'][] = [
  'pending',
  'confirmed',
  'cancelled',
  'pending_payment',
  'paid',
] as const

function isBookingStatus(v: unknown): v is BookingItem['status'] {
  return (
    typeof v === 'string' &&
    (BOOKING_STATUSES as readonly string[]).includes(v)
  )
}

// 将数据库行转换为 BookingItem
function rowToBooking(row: Record<string, unknown>): BookingItem {
  // 获取状态
  const status = row.status
  if (!isBookingStatus(status)) {
    throw new Error('Invalid booking status from database')
  }
  // 将数据库行转换为 BookingItem
    return {
    // 将 ID 转换为数字
    id: toId(row.id),
    name: String(row.name ?? ''),
    // 将电话转换为字符串
    phone: String(row.phone ?? ''),
    // 将服务转换为字符串
    service: String(row.service ?? ''),
    // 将日期转换为字符串
    date: String(row.date ?? ''),
    // 将时间转换为字符串
    time: String(row.time ?? ''),
    // 将备注转换为字符串
    notes: String(row.notes ?? ''),
    // 返回 BookingItem
    status,
  }
}

// 判断是否是唯一约束冲突 23505 是 PostgreSQL 的唯一约束冲突错误代码
function isUniqueViolation(err: unknown): boolean {
  // 如果 err 是对象，并且不为 null，并且有 code 属性，并且 code 属性为 23505，则返回 true
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === '23505'
  )
}

/** 旧库 bookings_status_check 不包含 pending_payment / paid 时会触发 */
function isCheckViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === '23514'
  )
}

/**
 * 匿名调用：仅返回某日已被占用的时间段（需执行 supabase/schema.sql 中的 RPC）
 */
export async function fetchBookedTimesForDate(date: string): Promise<string[]> {
  if (!isSupabaseConfigured()) {
    return readLocal()
      .filter(
        (b) =>
          b.date === date && b.status !== 'cancelled'
      )
      .map((b) => b.time)
  }
  const sb = getSupabase()
  // 调用 RPC 函数 get_booked_times_for_date
  const { data, error } = await sb.rpc('get_booked_times_for_date', {
    p_date: date,
  })
  // 如果调用 RPC 函数失败，则抛出错误
  if (error) throw toError(error)
  // 如果 data 是数组，则返回 data 转换为 string[]
  // 否则返回空数组
  return Array.isArray(data) ? (data as string[]) : []
}

function parsePublicBookingBlocks(data: unknown): PublicBookingBlock[] {
  if (!Array.isArray(data)) return []
  const out: PublicBookingBlock[] = []
  for (const row of data) {
    if (typeof row !== 'object' || row === null) continue
    const r = row as Record<string, unknown>
    const line = r.line
    const time = r.time
    const blockMinutes = r.blockMinutes
    if (line !== 'nails' && line !== 'lashes') continue
    if (typeof time !== 'string') continue
    const bm =
      typeof blockMinutes === 'number'
        ? blockMinutes
        : Number(blockMinutes)
    if (!Number.isFinite(bm)) continue
    out.push({ line: line as ScheduleLine, time, blockMinutes: bm })
  }
  return out
}

/** 某日已占用区间（匿名可拉取），用于按技师数 + 时长 + 缓冲算可约时段 */
export async function fetchScheduleBlocksForDate(
  date: string
): Promise<PublicBookingBlock[]> {
  if (!date) return []

  if (isSupabaseConfigured()) {
    const sb = getSupabase()
    const { data, error } = await sb.rpc('get_public_booking_blocks_for_date', {
      p_date: date,
    })
    if (!error) {
      return parsePublicBookingBlocks(data)
    }
    const rpcMissing = error.code === 'PGRST202'
    if (rpcMissing) {
      const times = await fetchBookedTimesForDate(date)
      return legacyBookedTimesToBlocks(times)
    }
    throw toError(error)
  }

  if (isRemoteApi()) {
    const rows = await fetchBookings()
    return bookingsToBlocks(
      rows.filter((b) => b.date === date && b.status !== 'cancelled')
    )
  }

  return bookingsToBlocks(
    readLocal().filter((b) => b.date === date && b.status !== 'cancelled')
  )
}

/**
 * 数据源优先级：Supabase → 通用 REST（VITE_API_BASE_URL）→ localStorage
 *
 * Supabase：仅登录用户可 SELECT 全表；匿名请用 fetchBookedTimesForDate。
 */
// 获取所有预约
export async function fetchBookings(): Promise<BookingItem[]> {
  // 如果 Supabase 配置了，则调用 Supabase 的 API
  if (isSupabaseConfigured()) {
    // 获取 Supabase 客户端
    const sb = getSupabase()
    // 调用 bookings 表的 select 查询
    const { data, error } = await sb
    // 操作数据库里的 bookings 表
      .from('bookings')
      // 选择 BOOKING_COLUMNS 列，并按 id 排序
      .select(BOOKING_COLUMNS)
      // 按 id 排序
      .order('id', { ascending: true })
    // 如果查询失败，则抛出错误
    if (error) throw toError(error)
    // 如果查询成功，则返回 data 转换为 BookingItem[]
    // 如果 data 为空，则返回空数组
    return (data ?? []).map((r) => rowToBooking(r as Record<string, unknown>))
  }
  // 如果远程 API 配置了，则调用远程 API
  if (isRemoteApi()) {
    // 调用远程 API
    return request<BookingItem[]>('GET', '/bookings')
  }
  // 否则读取本地存储
  return readLocal()
}
// 新增一个预约
export async function createBooking(item: BookingItem): Promise<BookingItem> {
  if (isSupabaseConfigured()) {
    const sb = getSupabase()
    // 创建 payload
    const payload = {
      // 将 name 转换为字符串
      name: item.name,
      // 将 phone 转换为字符串
      phone: item.phone,
      // 将 service 转换为字符串
      service: item.service,
      // 将 date 转换为字符串
      date: item.date,
      // 将 time 转换为字符串
      time: item.time,
      // 将 notes 转换为字符串
      notes: item.notes,
      // 将 status 转换为字符串
      status: item.status,
    }

    // 获取当前会话
    const {
      data: { session },
    } = await sb.auth.getSession()

    // 判断是否是管理员
    let asBookingAdmin = false
    // 如果当前会话有用户，则判断是否是管理员
    if (session?.user) {
      const { data: adminFlag, error: rpcErr } = await sb.rpc(
        'current_user_is_admin'
      )
      if (!rpcErr) {
        asBookingAdmin = Boolean(adminFlag)
      }
    }

    // 匿名无 SELECT 权限：insert 后不能 .select()，否则会因 RLS 读不到新行而整笔失败
    if (asBookingAdmin) {
      const { data, error } = await sb
      // 指定表名
        .from('bookings')
        // 插入 payload
        .insert(payload)
        // 选择 BOOKING_COLUMNS 列
        .select(BOOKING_COLUMNS)
        // 返回单行数据
        .single()
      // 如果插入失败，则抛出错误
      if (error) {
        if (isUniqueViolation(error)) {
          throw new Error('该时段刚刚已被预约，请另选时间')
        }
        throw toError(error)
      }
      if (!data) throw new Error('预约写入后未返回数据')
      // 将数据转换为 BookingItem
      return rowToBooking(data as Record<string, unknown>)
    }
    // 非管理员：优先 RPC 插入并返回真实 id；无 RPC 时回退为直连 insert（与旧版一致，支付页 id 可能不准确）
    const { data: newId, error: rpcErr } = await sb.rpc('insert_booking_anon', {
      p_name: payload.name,
      p_phone: payload.phone,
      p_service: payload.service,
      p_date: payload.date,
      p_time: payload.time,
      p_notes: payload.notes ?? '',
      p_status: payload.status,
    })
    if (rpcErr) {
      // 仅 PGRST202 表示 PostgREST 在 schema 缓存里找不到该 RPC；勿用 message 包含函数名判断，
      // 否则权限错误、重载歧义、函数内异常等也会误判为「无 RPC」并走无效的回退 insert。
      const rpcMissing = rpcErr.code === 'PGRST202'
      if (rpcMissing) {
        const insertWithStatus = (status: BookingItem['status']) =>
          sb.from('bookings').insert({ ...payload, status })

        const { error: insErr } = await insertWithStatus(item.status)
        if (insErr) {
          if (isUniqueViolation(insErr)) {
            throw new Error('该时段刚刚已被预约，请另选时间')
          }
          const msg = String((insErr as { message?: string }).message ?? '')
          const statusRejected =
            isCheckViolation(insErr) ||
            msg.includes('bookings_status_check') ||
            msg.includes('violates check constraint')
          if (item.status === 'pending_payment' && statusRejected) {
            const { error: e2 } = await insertWithStatus('pending')
            if (e2) {
              if (isUniqueViolation(e2)) {
                throw new Error('该时段刚刚已被预约，请另选时间')
              }
              throw toError(e2)
            }
            throw new Error(MSG_ANON_NO_DB_ORDER_ID)
          }
          throw toError(insErr)
        }
        throw new Error(MSG_ANON_NO_DB_ORDER_ID)
      }
      if (isUniqueViolation(rpcErr)) {
        throw new Error('该时段刚刚已被预约，请另选时间')
      }
      const rpcMsg = String(rpcErr.message ?? '')
      if (
        item.status === 'pending_payment' &&
        (rpcMsg.includes('check constraint') ||
          rpcMsg.includes('bookings_status_check') ||
          rpcMsg.includes('23514'))
      ) {
        const { error: e2 } = await sb
          .from('bookings')
          .insert({ ...payload, status: 'pending' })
        if (e2) {
          if (isUniqueViolation(e2)) {
            throw new Error('该时段刚刚已被预约，请另选时间')
          }
          throw toError(e2)
        }
        throw new Error(MSG_ANON_NO_DB_ORDER_ID)
      }
      throw toError(rpcErr)
    }
    const id = typeof newId === 'number' ? newId : Number(newId)
    if (
      !Number.isFinite(id) ||
      !Number.isInteger(id) ||
      id < 1 ||
      id > MAX_PG_INTEGER
    ) {
      throw new Error(
        '预约已提交但返回的订单号无效。请确认 insert_booking_anon 已部署且返回 serial id，并已按 supabase/schema.sql 同步数据库。'
      )
    }
    return { ...item, id }
  }
  // 如果远程 API 配置了，则调用远程 API
  if (isRemoteApi()) {
    return request<BookingItem>('POST', '/bookings', { body: item })
  }
  // 否则读取本地存储
  const items = readLocal()
  // 将 item 添加到 items 数组中
  items.push(item)
  // 将 items 数组写入本地存储
  writeLocal(items)
  return item
}
// 删除预约
export async function deleteBooking(id: number): Promise<void> {
  if (isSupabaseConfigured()) {
    const sb = getSupabase()
    const { error } = await sb
    // 指定表名
    .from('bookings')
    // 删除
    .delete()
    // 等于 id
    .eq('id', id)
    // 如果删除失败，则抛出错误
    if (error) throw toError(error)
    return
  }
  if (isRemoteApi()) {
    // 调用远程 API
    await request<void>('DELETE', `/bookings/${id}`)
    return
  }
  // 将本地存储的 items 数组中 id 不等于 id 的行写入本地存储
  writeLocal(readLocal().filter((b) => b.id !== id))
}
// 更新预约状态
export async function patchBookingStatus(
  id: number,
  status: BookingItem['status']
): Promise<void> {
  // 如果 Supabase 配置了，则调用 Supabase 的 API
  if (isSupabaseConfigured()) {
    const sb = getSupabase()
    const { error } = await sb
    // 指定表名
    .from('bookings')
    // 更新
    .update({ status })
    // 等于 id
    .eq('id', id)
    // 如果更新失败，则抛出错误
    if (error) throw toError(error)
    return
  }
  // 如果远程 API 配置了，则调用远程 API
  if (isRemoteApi()) {
    // 调用远程 API
    // FastAPI 路由：PATCH /bookings/{id}/status
    await request<void>('PATCH', `/bookings/${id}/status`, { body: { status } })
    return
  }
  // 否则读取本地存储
  const items = readLocal()
  // 找到 id 等于 id 的行
  const booking = items.find((b) => b.id === id)
  // 如果找到，则更新状态
  if (booking) {
    booking.status = status
    // 将 items 数组写入本地存储
    writeLocal(items)
  }
}
