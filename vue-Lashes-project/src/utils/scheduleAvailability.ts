import { SCHEDULE_LINES, type ScheduleLine } from '@/data/scheduleConfig'
import { services } from '@/data/services'
import type { BookingItem } from '@/types/booking'
import type { PublicBookingBlock } from '@/types/schedule'

// 将时间字符串转换为分钟数
export function timeStringToMinutes(t: string): number {
  // 将时间字符串按冒号分割
  const parts = t.split(':')
  // 获取小时数
  const h = Number(parts[0] ?? 0)
  // 获取分钟数
  const m = Number(parts[1] ?? 0)
  // 返回小时数乘以60加上分钟数
  return h * 60 + m
}

// 获取服务对应的线路
export function getScheduleLineForService(serviceName: string): ScheduleLine | null {
  // 查找服务
  const s = services.find((x) => x.name === serviceName)
  // 如果服务不存在，则返回 null
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
// 将预约转换为公共预约块
export function bookingToPublicBlock(booking: BookingItem): PublicBookingBlock | null {
  // 获取服务对应的线路
  const line = getScheduleLineForService(booking.service)
  // 如果线路不存在，则返回 null
  if (!line) return null
  // 返回公共预约块
  return {
    // 设置线路
    line,
    // 设置时间
    time: booking.time,
    // 设置块长
    blockMinutes: getBlockMinutesForService(booking.service),
  }
}
// 将预约列表转换为公共预约块列表
export function bookingsToBlocks(bookings: BookingItem[]): PublicBookingBlock[] {
  // 过滤掉已取消的预约
  return bookings
    // 过滤掉已取消的预约
    .filter((b) => b.status !== 'cancelled')
    // 将预约转换为公共预约块
    .map((b) => bookingToPublicBlock(b))
    // 过滤掉公共预约块为 null 的预约
    .filter((x): x is PublicBookingBlock => x !== null)
}

/** 将旧版「仅时段列表」转为保守占用块：该时段在两条线上都视为已被占用（与旧库「整点唯一」一致） */
export function legacyBookedTimesToBlocks(times: string[]): PublicBookingBlock[] {
  // 声明一个空数组
  const out: PublicBookingBlock[] = []
  // 遍历 times 数组
  for (const t of times) {
    // 获取 nails 线路的块长
    const nailBlock =
      SCHEDULE_LINES.nails.serviceDurationMinutes +
      SCHEDULE_LINES.nails.bufferMinutes
    // 获取 lashes 线路的块长
    const lashBlock =
      SCHEDULE_LINES.lashes.serviceDurationMinutes +
      SCHEDULE_LINES.lashes.bufferMinutes
    // 添加 nails 线路的公共预约块
    out.push({ line: 'nails', time: t, blockMinutes: nailBlock })
    // 添加 lashes 线路的公共预约块
    out.push({ line: 'lashes', time: t, blockMinutes: lashBlock })
  }
  return out
}

// 计算最大并发数
function maxConcurrentForIntervals(
  intervals: { start: number; end: number }[]
): number {
  // 声明一个空数组
  type Ev = { t: number; d: number }
  // 声明一个空数组
  const ev: Ev[] = []
  // 遍历 intervals 数组
  for (const { start, end } of intervals) {
    // 添加开始时间
    ev.push({ t: start, d: 1 })
    // 添加结束时间
    ev.push({ t: end, d: -1 })
  }
  // 排序
  ev.sort((a, b) => a.t - b.t || a.d - b.d)
  // 声明一个变量，用于记录当前并发数
  let run = 0
  // 声明一个变量，用于记录最大并发数
  let max = 0
  for (const e of ev) {
    // 增加当前并发数
    run += e.d
    // 更新最大并发数
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
