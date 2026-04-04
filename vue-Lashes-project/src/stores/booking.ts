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

  const hydrateBookings = async () => {
    if (isSupabaseConfigured() && !useAuthStore().canAccessAdmin) {
      bookings.value = []
      return
    }
    bookings.value = await fetchBookings()
  }

  const loadTakenSlotsForDate = async (date: string) => {
    if (!date || !isSupabaseConfigured()) return
    if (useAuthStore().canAccessAdmin) return
    const times = await fetchBookedTimesForDate(date)
    slotTakenByDate[date] = times
  }

  const isBooked = (date: string, time: string) => {
    if (isSupabaseConfigured() && !useAuthStore().canAccessAdmin) {
      return slotTakenByDate[date]?.includes(time) ?? false
    }
    return isTimeSlotBooked(bookings.value, date, time)
  }

  const mergeSlotIntoCache = (date: string, time: string) => {
    if (!isSupabaseConfigured() || useAuthStore().canAccessAdmin) return
    const cur = slotTakenByDate[date] ?? []
    if (cur.includes(time)) return
    slotTakenByDate[date] = [...cur, time].sort()
  }

  const addBooking = async (newBooking: BookingItem) => {
    await createBooking(newBooking)
    mergeSlotIntoCache(newBooking.date, newBooking.time)
    await hydrateBookings()
  }

  const removeBooking = async (id: number) => {
    await deleteBooking(id)
    await hydrateBookings()
  }

  const updateStatus = async (
    id: number,
    status: 'pending' | 'confirmed' | 'cancelled'
  ) => {
    await patchBookingStatus(id, status)
    await hydrateBookings()
  }

  function clearAfterLogout() {
    bookings.value = []
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
