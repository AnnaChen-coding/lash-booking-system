import type { BookingItem } from '@/types/booking'
import type { PublicBookingBlock } from '@/types/schedule'
import { ApiError, isRemoteApi, request } from './client'
import { bookingsToBlocks, legacyBookedTimesToBlocks } from '@/utils/scheduleAvailability'

const STORAGE_KEY = 'bookings'

const BOOKING_STATUSES: readonly BookingItem['status'][] = [
  'pending',
  'confirmed',
  'cancelled',
  'pending_payment',
  'paid',
] as const

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

function isBookingStatus(v: unknown): v is BookingItem['status'] {
  return (
    typeof v === 'string' &&
    (BOOKING_STATUSES as readonly string[]).includes(v)
  )
}

function rowToBooking(row: Record<string, unknown>): BookingItem {
  const status = row.status
  if (!isBookingStatus(status)) {
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

function rethrowAsClientMessage(e: unknown): never {
  if (e instanceof ApiError) {
    const detail =
      typeof e.body === 'object' &&
      e.body !== null &&
      'detail' in e.body
        ? String((e.body as { detail: unknown }).detail)
        : e.message
    throw new Error(detail || e.message)
  }
  throw e instanceof Error ? e : new Error(String(e))
}

function normalizeBookedTimesFromResponse(data: unknown): string[] | null {
  if (Array.isArray(data)) {
    return data
      .filter((x): x is string => typeof x === 'string')
      .map((t) => t.trim())
      .filter(Boolean)
  }
  if (typeof data === 'object' && data !== null && 'times' in data) {
    const times = (data as { times?: unknown }).times
    if (!Array.isArray(times)) return null
    return times
      .filter((x): x is string => typeof x === 'string')
      .map((t) => t.trim())
      .filter(Boolean)
  }
  return null
}

async function fetchBookedTimesFromApi(date: string): Promise<string[]> {
  const data = await request<unknown>(
    'GET',
    `/booked-times?date=${encodeURIComponent(date)}`
  )
  const times = normalizeBookedTimesFromResponse(data)
  if (times === null) {
    throw new Error('booked-times 响应格式无效')
  }
  return times
}

/** 匿名：某日已被占用的时间段（GET /booked-times） */
export async function fetchBookedTimesForDate(date: string): Promise<string[]> {
  if (isRemoteApi()) {
    return fetchBookedTimesFromApi(date)
  }
  return readLocal()
    .filter((b) => b.date === date && b.status !== 'cancelled')
    .map((b) => b.time)
}

/**
 * 提交前强制校验占用：必须成功拉取 FastAPI /booked-times。
 */
export async function fetchScheduleBlocksForSubmitVerify(
  date: string
): Promise<PublicBookingBlock[]> {
  if (!date) return []
  const times = await fetchBookedTimesForDate(date)
  return legacyBookedTimesToBlocks(times)
}

/** 某日已占用区间（匿名可拉取），用于算可约时段 */
export async function fetchScheduleBlocksForDate(
  date: string
): Promise<PublicBookingBlock[]> {
  if (!date) return []
  if (isRemoteApi()) {
    const times = await fetchBookedTimesForDate(date)
    return legacyBookedTimesToBlocks(times)
  }
  return bookingsToBlocks(
    readLocal().filter((b) => b.date === date && b.status !== 'cancelled')
  )
}

/** 管理员：全量预约列表（GET /bookings，需 Bearer） */
export async function fetchBookings(): Promise<BookingItem[]> {
  if (isRemoteApi()) {
    try {
      const rows = await request<BookingItem[]>('GET', '/bookings', {
        auth: true,
      })
      return (rows ?? []).map((r) =>
        rowToBooking(r as unknown as Record<string, unknown>)
      )
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        throw new Error(
          e.status === 401
            ? '管理员会话无效或已过期，请重新登录'
            : '无权限访问预约列表'
        )
      }
      rethrowAsClientMessage(e)
    }
  }
  return readLocal()
}

export async function createBooking(item: BookingItem): Promise<BookingItem> {
  if (isRemoteApi()) {
    try {
      const body = {
        name: item.name,
        phone: item.phone,
        service: item.service,
        date: item.date,
        time: item.time,
        notes: item.notes,
        status: item.status,
      }
      const data = await request<BookingItem>('POST', '/bookings', { body })
      return rowToBooking(data as unknown as Record<string, unknown>)
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        throw new Error('该时间段刚刚被预约，请选择其他时间。')
      }
      rethrowAsClientMessage(e)
    }
  }

  const items = readLocal()
  items.push(item)
  writeLocal(items)
  return item
}

export async function deleteBooking(id: number): Promise<void> {
  if (isRemoteApi()) {
    try {
      await request<void>('DELETE', `/bookings/${id}`, { auth: true })
      return
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        throw new Error('Booking not found.')
      }
      rethrowAsClientMessage(e)
    }
  }
  writeLocal(readLocal().filter((b) => b.id !== id))
}

export async function patchBookingStatus(
  id: number,
  status: BookingItem['status']
): Promise<void> {
  if (isRemoteApi()) {
    try {
      await request<void>('PATCH', `/bookings/${id}/status`, {
        body: { status },
        auth: true,
      })
      return
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        throw new Error('Booking not found.')
      }
      rethrowAsClientMessage(e)
    }
  }

  const items = readLocal()
  const booking = items.find((b) => b.id === id)
  if (booking) {
    booking.status = status
    writeLocal(items)
  }
}
