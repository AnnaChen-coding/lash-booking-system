import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import type { BookingItem } from '@/types/booking'
import { timeSlots } from '@/data/timeSlots'
import {
  createBooking,
  deleteBooking,
  fetchBookings,
  fetchScheduleBlocksForDate,
  fetchScheduleBlocksForSubmitVerify,
  patchBookingStatus,
} from '@/api/bookings'
import { useRemoteBookingAvailability } from '@/lib/bookingRemotePolicy'
import { useAuthStore } from '@/stores/auth'
import {
  bookingToPublicBlock,
  bookingsToBlocks,
  isStartUnavailableForService,
} from '@/utils/scheduleAvailability'
import type { PublicBookingBlock } from '@/types/schedule'

export type TakenSlotsMeta = {
  loading: boolean
  /** 本会话内至少成功拉取过一次该日占档 */
  known: boolean
  lastError: string | null
  lastSuccessAt: number | null
}

export type LoadTakenSlotsResult = { ok: true } | { ok: false; message: string }

export const useBookingStore = defineStore('booking', () => {
  const bookings = ref<BookingItem[]>([])
  /** 全量预约列表拉取中（管理端），用于骨架屏与防重复操作 */
  const bookingsLoading = ref(false)
  /** 匿名：某日已占区间（线路 / 开始时间 / 块长），不暴露客户信息 */
  const scheduleBlocksByDate = reactive<Record<string, PublicBookingBlock[]>>({})
  /** 按日串行占档请求，避免并发竞态；同时解决 force 时在「等待他人请求」后直接 return 的问题 */
  const takenSlotsFetchTail = reactive<Record<string, Promise<unknown>>>({})
  /** 某日占档同步元信息（loading / 是否曾成功 / 最近错误） */
  const takenSlotsMeta = reactive<Record<string, TakenSlotsMeta>>({})

  // 加载所有预约
  const hydrateBookings = async () => {
    bookingsLoading.value = true
    try {
      const skipFullList =
        !useAuthStore().canAccessAdmin && useRemoteBookingAvailability()
      if (skipFullList) {
        bookings.value = []
        return
      }
      // 从 FastAPI 或本地存储拉取全量预约
      bookings.value = await fetchBookings()
    } finally {
      bookingsLoading.value = false
    }
  }
  const getTakenSlotsMeta = (date: string): TakenSlotsMeta => {
    if (!takenSlotsMeta[date]) {
      takenSlotsMeta[date] = {
        loading: false,
        known: false,
        lastError: null,
        lastSuccessAt: null,
      }
    }
    return takenSlotsMeta[date]
  }

  /**
   * 加载某日已占时段（匿名 + 远程可用性模式）。
   * - `verifyForSubmit: true`：提交前强制校验（REST 优先时仅接受直连 GET /booked-times 成功）。
   * 返回 `ok: false` 表示本次拉取失败；若此前已成功过，缓存仍保留，但提交前必须 `ok: true`。
   */
  const loadTakenSlotsForDate = async (
    date: string,
    options?: { force?: boolean; verifyForSubmit?: boolean }
  ): Promise<LoadTakenSlotsResult> => {
    const okTrue = (): LoadTakenSlotsResult => ({ ok: true })

    if (!date || !useRemoteBookingAvailability()) return okTrue()
    if (useAuthStore().canAccessAdmin) return okTrue()

    const prev = takenSlotsFetchTail[date] ?? Promise.resolve()
    const work = prev.catch(() => {}).then(async (): Promise<LoadTakenSlotsResult> => {
      const meta = getTakenSlotsMeta(date)
      if (
        !options?.verifyForSubmit &&
        !options?.force &&
        meta.known &&
        date in scheduleBlocksByDate
      ) {
        return okTrue()
      }

      meta.loading = true
      meta.lastError = null
      try {
        const blocks = options?.verifyForSubmit
          ? await fetchScheduleBlocksForSubmitVerify(date)
          : await fetchScheduleBlocksForDate(date)
        scheduleBlocksByDate[date] = blocks
        meta.known = true
        meta.lastSuccessAt = Date.now()
        return okTrue()
      } catch (e) {
        const message =
          e instanceof Error ? e.message : '无法同步最新预约状态，请稍后再试。'
        meta.lastError = message
        return { ok: false, message }
      } finally {
        meta.loading = false
      }
    })

    takenSlotsFetchTail[date] = work.then(
      () => {},
      () => {}
    )
    return (await work) as LoadTakenSlotsResult
  }

  /** 某开始时段对当前所选服务是否不可约（技师数 + 时长 + 缓冲） */
  const isBooked = (date: string, time: string, service?: string) => {
    if (!service) return false

    if (useRemoteBookingAvailability() && !useAuthStore().canAccessAdmin) {
      const blocks = scheduleBlocksByDate[date] ?? []
      return isStartUnavailableForService(blocks, service, time)
    }

    const dayBookings = bookings.value.filter(
      (b) => b.date === date && b.status !== 'cancelled'
    )
    return isStartUnavailableForService(
      bookingsToBlocks(dayBookings),
      service,
      time
    )
  }
  // 推荐可用时段
  const recommendAvailableSlots = (
    date: string,
    preferredTime: string,
    limit = 3,
    service?: string
  ): string[] => {
    // 如果日期为空，则返回空数组
    if (!date) return []
    // 获取可用时段
    const available = timeSlots.filter((slot) => !isBooked(date, slot, service))
    // 如果可用时段为空，则返回空数组
    if (!available.length) return []
    // 获取首选时段的索引
    const preferredIndex = timeSlots.indexOf(preferredTime)
    // 如果首选时段索引小于0，则返回前limit个可用时段
    if (preferredIndex < 0) {
      return available.slice(0, limit)
    }
    // 否则返回排序后的可用时段
    return [...available]
      .sort((a, b) => {
        // 计算a和首选时段的距离
        const aDistance = Math.abs(timeSlots.indexOf(a) - preferredIndex)
        // 计算b和首选时段的距离
        const bDistance = Math.abs(timeSlots.indexOf(b) - preferredIndex)
        // 如果a和b的距离不相等，则返回距离小的
        if (aDistance !== bDistance) return aDistance - bDistance
        // 如果a和b的距离相等，则返回a和b的索引差
        return timeSlots.indexOf(a) - timeSlots.indexOf(b)
      })
      .slice(0, limit)
  }
  // 合并到已占时段缓存
  const mergeBlockIntoCache = (booking: BookingItem) => {
    if (!useRemoteBookingAvailability() || useAuthStore().canAccessAdmin) {
      return
    }
    // 如果预约状态为已取消，则直接返回
    if (booking.status === 'cancelled') return
    const block = bookingToPublicBlock(booking)
    if (!block) return
    const cur = scheduleBlocksByDate[booking.date] ?? []
    scheduleBlocksByDate[booking.date] = [...cur, block].sort((a, b) =>
      a.time.localeCompare(b.time)
    )
  }
  /** 支付页展示用：上一笔刚提交的预约（匿名用户无全表列表时也够用） */
  const lastPaymentBooking = ref<BookingItem | null>(null)
//  设置最后一笔支付预约
  const setLastPaymentBooking = (row: BookingItem | null) => {
    lastPaymentBooking.value = row
  }

  // 添加预约
  const addBooking = async (newBooking: BookingItem) => {
    // 写入 FastAPI 或本地存储
    const created = await createBooking(newBooking)
    // 合并到已占时段缓存
    mergeBlockIntoCache(created)
    // 提交成功后刷新该日期缓存，降低脏数据窗口
    await loadTakenSlotsForDate(created.date, { force: true })
    // 仅管理端 / 纯本地模式维护全量 bookings；匿名远程占档模式避免无意义 GET /bookings
    if (useAuthStore().canAccessAdmin || !useRemoteBookingAvailability()) {
      await hydrateBookings()
    }
    return created
  }

  // 删除预约
  const removeBooking = async (id: number) => {
    // 删除预约
    await deleteBooking(id)
    // 重新加载所有预约
    await hydrateBookings()
  }

  // 更新预约状态
  const updateStatus = async (id: number, status: BookingItem['status']) => {
    // 更新预约状态
    await patchBookingStatus(id, status)
    // 重新加载所有预约
    await hydrateBookings()
  }

  // 登出时清空所有数据
  function clearAfterLogout() {
    lastPaymentBooking.value = null
    // 清空 bookings
    bookings.value = []
    // 清空已占时段缓存
    for (const k of Object.keys(scheduleBlocksByDate)) {
      delete scheduleBlocksByDate[k]
    }
    for (const k of Object.keys(takenSlotsFetchTail)) {
      delete takenSlotsFetchTail[k]
    }
    for (const k of Object.keys(takenSlotsMeta)) {
      delete takenSlotsMeta[k]
    }
  }

  return {
    bookings,
    bookingsLoading,
    lastPaymentBooking,
    scheduleBlocksByDate,
    takenSlotsMeta,
    hydrateBookings,
    loadTakenSlotsForDate,
    getTakenSlotsMeta,
    isBooked,
    recommendAvailableSlots,
    addBooking,
    removeBooking,
    updateStatus,
    setLastPaymentBooking,
    clearAfterLogout,
  }
})
