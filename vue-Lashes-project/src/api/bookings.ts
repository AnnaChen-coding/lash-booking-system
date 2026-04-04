import type { BookingItem } from '@/types/booking'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { isRemoteApi, request } from './client'

const STORAGE_KEY = 'bookings'

const BOOKING_COLUMNS =
  'id,name,phone,service,date,time,notes,status' as const

function readLocal(): BookingItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as BookingItem[]
  } catch {
    return []
  }
}

function writeLocal(items: BookingItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function toId(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  throw new Error('Invalid id from database')
}

function rowToBooking(row: Record<string, unknown>): BookingItem {
  const status = row.status
  if (
    status !== 'pending' &&
    status !== 'confirmed' &&
    status !== 'cancelled'
  ) {
    throw new Error('Invalid booking status from database')
  }
  return {
    id: toId(row.id),
    name: String(row.name ?? ''),
    phone: String(row.phone ?? ''),
    service: String(row.service ?? ''),
    date: String(row.date ?? ''),
    time: String(row.time ?? ''),
    notes: String(row.notes ?? ''),
    status,
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === '23505'
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
  const { data, error } = await sb.rpc('get_booked_times_for_date', {
    p_date: date,
  })
  if (error) throw error
  return Array.isArray(data) ? (data as string[]) : []
}

/**
 * 数据源优先级：Supabase → 通用 REST（VITE_API_BASE_URL）→ localStorage
 *
 * Supabase：仅登录用户可 SELECT 全表；匿名请用 fetchBookedTimesForDate。
 */
export async function fetchBookings(): Promise<BookingItem[]> {
  if (isSupabaseConfigured()) {
    const sb = getSupabase()
    const { data, error } = await sb
      .from('bookings')
      .select(BOOKING_COLUMNS)
      .order('id', { ascending: true })
    if (error) throw error
    return (data ?? []).map((r) => rowToBooking(r as Record<string, unknown>))
  }
  if (isRemoteApi()) {
    return request<BookingItem[]>('GET', '/bookings')
  }
  return readLocal()
}

export async function createBooking(item: BookingItem): Promise<BookingItem> {
  if (isSupabaseConfigured()) {
    const sb = getSupabase()
    const payload = {
      name: item.name,
      phone: item.phone,
      service: item.service,
      date: item.date,
      time: item.time,
      notes: item.notes,
      status: item.status,
    }

    const {
      data: { session },
    } = await sb.auth.getSession()

    let asBookingAdmin = false
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
        .from('bookings')
        .insert(payload)
        .select(BOOKING_COLUMNS)
        .single()
      if (error) {
        if (isUniqueViolation(error)) {
          throw new Error('该时段刚刚已被预约，请另选时间')
        }
        throw error
      }
      if (!data) throw new Error('预约写入后未返回数据')
      return rowToBooking(data as Record<string, unknown>)
    }

    const { error } = await sb.from('bookings').insert(payload)
    if (error) {
      if (isUniqueViolation(error)) {
        throw new Error('该时段刚刚已被预约，请另选时间')
      }
      throw error
    }
    return item
  }
  if (isRemoteApi()) {
    return request<BookingItem>('POST', '/bookings', { body: item })
  }
  const items = readLocal()
  items.push(item)
  writeLocal(items)
  return item
}

export async function deleteBooking(id: number): Promise<void> {
  if (isSupabaseConfigured()) {
    const sb = getSupabase()
    const { error } = await sb.from('bookings').delete().eq('id', id)
    if (error) throw error
    return
  }
  if (isRemoteApi()) {
    await request<void>('DELETE', `/bookings/${id}`)
    return
  }
  writeLocal(readLocal().filter((b) => b.id !== id))
}

export async function patchBookingStatus(
  id: number,
  status: BookingItem['status']
): Promise<void> {
  if (isSupabaseConfigured()) {
    const sb = getSupabase()
    const { error } = await sb.from('bookings').update({ status }).eq('id', id)
    if (error) throw error
    return
  }
  if (isRemoteApi()) {
    await request<void>('PATCH', `/bookings/${id}`, { body: { status } })
    return
  }
  const items = readLocal()
  const booking = items.find((b) => b.id === id)
  if (booking) {
    booking.status = status
    writeLocal(items)
  }
}
