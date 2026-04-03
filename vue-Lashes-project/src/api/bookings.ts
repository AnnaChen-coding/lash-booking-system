import type { BookingItem } from '@/types/booking'
import { isRemoteApi, request } from './client'

const STORAGE_KEY = 'bookings'

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

/**
 * 远程约定（可按后端调整）：
 * GET    /bookings
 * POST   /bookings        body: BookingItem
 * DELETE /bookings/:id
 * PATCH  /bookings/:id    body: { status }
 */
export async function fetchBookings(): Promise<BookingItem[]> {
  if (isRemoteApi()) {
    return request<BookingItem[]>('GET', '/bookings')
  }
  return readLocal()
}

export async function createBooking(item: BookingItem): Promise<BookingItem> {
  if (isRemoteApi()) {
    return request<BookingItem>('POST', '/bookings', { body: item })
  }
  const items = readLocal()
  items.push(item)
  writeLocal(items)
  return item
}

export async function deleteBooking(id: number): Promise<void> {
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
