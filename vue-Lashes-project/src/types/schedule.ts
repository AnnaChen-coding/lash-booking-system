import type { ScheduleLine } from '@/data/scheduleConfig'

/** 匿名 RPC 返回的占用块（不含客户信息） */
export type PublicBookingBlock = {
  line: ScheduleLine
  time: string
  blockMinutes: number
}
