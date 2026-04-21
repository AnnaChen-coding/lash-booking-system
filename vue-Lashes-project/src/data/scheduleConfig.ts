/** 门店排班：每条业务线的技师数、单次占用时长（分钟）、缓冲（分钟） */
export type ScheduleLine = 'nails' | 'lashes'

export type ScheduleLineConfig = {
  technicianCount: number
  /** 单次服务大约占用（不含缓冲） */
  serviceDurationMinutes: number
  /** 收尾 / 消毒 / 换位 */
  bufferMinutes: number
}

export const SCHEDULE_LINES: Record<ScheduleLine, ScheduleLineConfig> = {
  nails: {
    technicianCount: 2,
    serviceDurationMinutes: 90,
    bufferMinutes: 10,
  },
  lashes: {
    technicianCount: 2,
    serviceDurationMinutes: 60,
    bufferMinutes: 10,
  },
}
