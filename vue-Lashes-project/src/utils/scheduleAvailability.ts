import { SCHEDULE_LINES, type ScheduleLine } from '@/data/scheduleConfig'
import { services } from '@/data/services'
import type { BookingItem } from '@/types/booking'
import type { PublicBookingBlock } from '@/types/schedule'

export function timeStringToMinutes(t: string): number {
  const parts = t.split(':')
  const h = Number(parts[0] ?? 0)
  const m = Number(parts[1] ?? 0)
  return h * 60 + m
}

export function getScheduleLineForService(serviceName: string): ScheduleLine | null {
  const s = services.find((x) => x.name === serviceName)
  if (!s) return null
  if (s.category === 'nails' || s.category === 'lashes') return s.category
  return null
}

/** 用于占档：按业务线默认「服务 + 缓冲」总分钟数 */
export function getBlockMinutesForService(serviceName: string): number {
  const line = getScheduleLineForService(serviceName)
  if (!line) return 70
  const cfg = SCHEDULE_LINES[line]
  return cfg.serviceDurationMinutes + cfg.bufferMinutes
}

export function bookingToPublicBlock(booking: BookingItem): PublicBookingBlock | null {
  const line = getScheduleLineForService(booking.service)
  if (!line) return null
  return {
    line,
    time: booking.time,
    blockMinutes: getBlockMinutesForService(booking.service),
  }
}

export function bookingsToBlocks(bookings: BookingItem[]): PublicBookingBlock[] {
  return bookings
    .filter((b) => b.status !== 'cancelled')
    .map((b) => bookingToPublicBlock(b))
    .filter((x): x is PublicBookingBlock => x !== null)
}

/** 将旧版「仅时段列表」转为保守占用块：该时段在两条线上都视为已被占用（与旧库「整点唯一」一致） */
export function legacyBookedTimesToBlocks(times: string[]): PublicBookingBlock[] {
  const out: PublicBookingBlock[] = []
  for (const t of times) {
    const nailBlock =
      SCHEDULE_LINES.nails.serviceDurationMinutes +
      SCHEDULE_LINES.nails.bufferMinutes
    const lashBlock =
      SCHEDULE_LINES.lashes.serviceDurationMinutes +
      SCHEDULE_LINES.lashes.bufferMinutes
    out.push({ line: 'nails', time: t, blockMinutes: nailBlock })
    out.push({ line: 'lashes', time: t, blockMinutes: lashBlock })
  }
  return out
}

function maxConcurrentForIntervals(
  intervals: { start: number; end: number }[]
): number {
  type Ev = { t: number; d: number }
  const ev: Ev[] = []
  for (const { start, end } of intervals) {
    ev.push({ t: start, d: 1 })
    ev.push({ t: end, d: -1 })
  }
  ev.sort((a, b) => a.t - b.t || a.d - b.d)
  let run = 0
  let max = 0
  for (const e of ev) {
    run += e.d
    max = Math.max(max, run)
  }
  return max
}

/** 在已有占用下，若从 startTime 起接一单 service，该线路并发峰值是否超过技师数 */
export function isStartUnavailableForService(
  blocks: PublicBookingBlock[],
  serviceName: string,
  startTime: string
): boolean {
  const line = getScheduleLineForService(serviceName)
  if (!line) return false

  const capacity = SCHEDULE_LINES[line].technicianCount
  const newBlock = getBlockMinutesForService(serviceName)
  const newStart = timeStringToMinutes(startTime)
  const newEnd = newStart + newBlock

  const intervals = blocks
    .filter((b) => b.line === line)
    .map((b) => ({
      start: timeStringToMinutes(b.time),
      end: timeStringToMinutes(b.time) + b.blockMinutes,
    }))

  intervals.push({ start: newStart, end: newEnd })

  return maxConcurrentForIntervals(intervals) > capacity
}
