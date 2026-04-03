import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BookingItem } from '@/types/booking'
import {
  createBooking,
  deleteBooking,
  fetchBookings,
  patchBookingStatus,
} from '@/api/bookings'
import { isTimeSlotBooked } from '@/utils/booking'

export const useBookingStore = defineStore('booking', () => {
  const bookings = ref<BookingItem[]>([])

  const hydrateBookings = async () => {
    bookings.value = await fetchBookings()
  }

  const addBooking = async (newBooking: BookingItem) => {
    await createBooking(newBooking)
    await hydrateBookings()
  }

  const isBooked = (date: string, time: string) => {
    return isTimeSlotBooked(bookings.value, date, time)
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

  return {
    bookings,
    hydrateBookings,
    addBooking,
    isBooked,
    removeBooking,
    updateStatus,
  }
})
