import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import type { BookingItem } from '@/types/booking'
import { timeSlots } from '@/data/timeSlots'
import {
  createBooking,
  deleteBooking,
  fetchBookedTimesForDate,
  fetchBookings,
  patchBookingStatus,
} from '@/api/bookings'
import { isTimeSlotBooked } from '@/utils/booking'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

export const useBookingStore = defineStore('booking', () => {
  const bookings = ref<BookingItem[]>([])
  /** Supabase 匿名用户：仅缓存「某日已占时段」，不拉取完整预约（保护隐私） */
  const slotTakenByDate = reactive<Record<string, string[]>>({})
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
    if (!options?.force && date in slotTakenByDate) return
    // 同日期请求进行中则复用该请求，避免并发重复打后端
    if (loadingByDate[date]) {
      await loadingByDate[date]
      return
    }
    // 否则从 Supabase 拉取某日的已占时段
    const task = (async () => {
      const times = await fetchBookedTimesForDate(date)
      slotTakenByDate[date] = times
    })()
    loadingByDate[date] = task
    try {
      await task
    } finally {
      delete loadingByDate[date]
    }
  }

  // 检查某时段是否已被占用
  const isBooked = (date: string, time: string) => {
    // 如果配置了 Supabase 并且不是管理员，则检查 slotTakenByDate
    if (isSupabaseConfigured() && !useAuthStore().canAccessAdmin) {
      return slotTakenByDate[date]?.includes(time) ?? false
    }
    // 否则检查 bookings
    return isTimeSlotBooked(bookings.value, date, time)
  }

  const recommendAvailableSlots = (
    date: string,
    preferredTime: string,
    limit = 3
  ): string[] => {
    if (!date) return []
    const available = timeSlots.filter((slot) => !isBooked(date, slot))
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

  // 合并到已占时段缓存
  const mergeSlotIntoCache = (date: string, time: string) => {
    // 如果未配置 Supabase 或管理员，则直接返回
    if (!isSupabaseConfigured() || useAuthStore().canAccessAdmin) return
    // 否则检查已占时段缓存
    const cur = slotTakenByDate[date] ?? []
    // 如果已占时段缓存中已包含该时段，则直接返回
    if (cur.includes(time)) return
    // 否则将该时段添加到已占时段缓存
    slotTakenByDate[date] = [...cur, time].sort()
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
    mergeSlotIntoCache(created.date, created.time)
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
    for (const k of Object.keys(slotTakenByDate)) {
      delete slotTakenByDate[k]
    }
    for (const k of Object.keys(loadingByDate)) {
      delete loadingByDate[k]
    }
  }

  return {
    bookings,
    lastPaymentBooking,
    slotTakenByDate,
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
