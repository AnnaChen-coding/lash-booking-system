import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import type { BookingItem } from '@/types/booking'
import { timeSlots } from '@/data/timeSlots'
import {
  createBooking,
  deleteBooking,
  fetchBookings,
  fetchScheduleBlocksForDate,
  patchBookingStatus,
} from '@/api/bookings'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import {
  bookingToPublicBlock,
  bookingsToBlocks,
  isStartUnavailableForService,
} from '@/utils/scheduleAvailability'
import type { PublicBookingBlock } from '@/types/schedule'

export const useBookingStore = defineStore('booking', () => {
  const bookings = ref<BookingItem[]>([])
  /** Supabase 匿名：某日已占区间（线路 / 开始时间 / 块长），不暴露客户信息 */
  const scheduleBlocksByDate = reactive<Record<string, PublicBookingBlock[]>>({})
  /** 避免同一日期并发重复请求 */
  const loadingByDate = reactive<Record<string, Promise<void> | undefined>>({})

  // 加载所有预约
  const hydrateBookings = async () => {
    // 如果配置了 Supabase 并且不是管理员，则清空 bookings
    if (isSupabaseConfigured() && !useAuthStore().canAccessAdmin) {
      bookings.value = []
      return
    }
    // 否则从 Supabase 拉取所有预约
    bookings.value = await fetchBookings()
  }
  // 只加载某日的已占时段
  const loadTakenSlotsForDate = async (
    date: string,
    options?: { force?: boolean }
  ) => {
    // 如果日期为空或未配置 Supabase，则直接返回
    if (!date || !isSupabaseConfigured()) return
    // 如果管理员，则直接返回
    if (useAuthStore().canAccessAdmin) return
    // 已有缓存且非强制刷新，直接命中缓存
    if (!options?.force && date in scheduleBlocksByDate) return
    // 同日期请求进行中则复用该请求，避免并发重复打后端
    if (loadingByDate[date]) {
      await loadingByDate[date]
      return
    }
    // 否则从 Supabase 拉取某日的已占时段
    const task = (async () => {
      const blocks = await fetchScheduleBlocksForDate(date)
      scheduleBlocksByDate[date] = blocks
    })()
    loadingByDate[date] = task
    try {
      await task
    } finally {
      delete loadingByDate[date]
    }
  }

  /** 某开始时段对当前所选服务是否不可约（技师数 + 时长 + 缓冲） */
  const isBooked = (date: string, time: string, service?: string) => {
    if (!service) return false

    if (isSupabaseConfigured() && !useAuthStore().canAccessAdmin) {
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

  const recommendAvailableSlots = (
    date: string,
    preferredTime: string,
    limit = 3,
    service?: string
  ): string[] => {
    if (!date) return []
    const available = timeSlots.filter((slot) => !isBooked(date, slot, service))
    if (!available.length) return []

    const preferredIndex = timeSlots.indexOf(preferredTime)
    if (preferredIndex < 0) {
      return available.slice(0, limit)
    }

    return [...available]
      .sort((a, b) => {
        const aDistance = Math.abs(timeSlots.indexOf(a) - preferredIndex)
        const bDistance = Math.abs(timeSlots.indexOf(b) - preferredIndex)
        if (aDistance !== bDistance) return aDistance - bDistance
        return timeSlots.indexOf(a) - timeSlots.indexOf(b)
      })
      .slice(0, limit)
  }

  const mergeBlockIntoCache = (booking: BookingItem) => {
    if (!isSupabaseConfigured() || useAuthStore().canAccessAdmin) return
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

  const setLastPaymentBooking = (row: BookingItem | null) => {
    lastPaymentBooking.value = row
  }

  // 添加预约
  const addBooking = async (newBooking: BookingItem) => {
    // 调用 Supabase 添加预约
    const created = await createBooking(newBooking)
    // 合并到已占时段缓存
    mergeBlockIntoCache(created)
    // 提交成功后刷新该日期缓存，降低脏数据窗口
    await loadTakenSlotsForDate(created.date, { force: true })
    // 重新加载所有预约
    await hydrateBookings()
    return created
  }

  // 删除预约
  const removeBooking = async (id: number) => {
    // 调用 Supabase 删除预约
    await deleteBooking(id)
    // 重新加载所有预约
    await hydrateBookings()
  }

  // 更新预约状态
  const updateStatus = async (id: number, status: BookingItem['status']) => {
    // 调用 Supabase 更新预约状态
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
    for (const k of Object.keys(loadingByDate)) {
      delete loadingByDate[k]
    }
  }

  return {
    bookings,
    lastPaymentBooking,
    scheduleBlocksByDate,
    hydrateBookings,
    loadTakenSlotsForDate,
    isBooked,
    recommendAvailableSlots,
    addBooking,
    removeBooking,
    updateStatus,
    setLastPaymentBooking,
    clearAfterLogout,
  }
})
