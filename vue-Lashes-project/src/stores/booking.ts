import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import type { BookingItem } from '@/types/booking'
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
  const loadTakenSlotsForDate = async (date: string) => {
    // 如果日期为空或未配置 Supabase，则直接返回
    if (!date || !isSupabaseConfigured()) return
    // 如果管理员，则直接返回
    if (useAuthStore().canAccessAdmin) return
    // 否则从 Supabase 拉取某日的已占时段
    const times = await fetchBookedTimesForDate(date)
    slotTakenByDate[date] = times
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
  // 添加预约
  const addBooking = async (newBooking: BookingItem) => {
    // 调用 Supabase 添加预约
    await createBooking(newBooking)
    // 合并到已占时段缓存
    mergeSlotIntoCache(newBooking.date, newBooking.time)
    // 重新加载所有预约
    await hydrateBookings()
  }

  // 删除预约
  const removeBooking = async (id: number) => {
    // 调用 Supabase 删除预约
    await deleteBooking(id)
    // 重新加载所有预约
    await hydrateBookings()
  }

  // 更新预约状态
  const updateStatus = async (
    id: number,
    status: 'pending' | 'confirmed' | 'cancelled'
  ) => {
    // 调用 Supabase 更新预约状态
    await patchBookingStatus(id, status)
    // 重新加载所有预约
    await hydrateBookings()
  }

  // 登出时清空所有数据
  function clearAfterLogout() {
    // 清空 bookings
    bookings.value = []
    // 清空已占时段缓存
    for (const k of Object.keys(slotTakenByDate)) {
      delete slotTakenByDate[k]
    }
  }

  return {
    bookings,
    slotTakenByDate,
    hydrateBookings,
    loadTakenSlotsForDate,
    isBooked,
    addBooking,
    removeBooking,
    updateStatus,
    clearAfterLogout,
  }
})
