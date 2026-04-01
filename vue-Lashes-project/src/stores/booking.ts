import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { BookingItem } from '@/types/booking'
import { isTimeSlotBooked } from '@/utils/booking'

export const useBookingStore = defineStore('booking', () => {
  const bookings = ref<BookingItem[]>(
    JSON.parse(localStorage.getItem('bookings') || '[]')
  )

  const addBooking = (newBooking: BookingItem) => {
    bookings.value.push(newBooking)
  }

 const isBooked = (date: string, time: string) => {
  return isTimeSlotBooked(bookings.value, date, time)
}

  const removeBooking = (id: number) => {
  bookings.value = bookings.value.filter(b => b.id !== id)
}

const updateStatus = (
  id: number,
  status: 'pending' | 'confirmed' | 'cancelled'
) => {
  const booking = bookings.value.find(b => b.id === id)
  if (booking) {
    booking.status = status
  }
}
// watch 持久化
  watch(
    bookings,
    (newBookings) => {
      localStorage.setItem('bookings', JSON.stringify(newBookings))
    },
    { deep: true }
  )

  return {
  bookings,
  addBooking,
  isBooked,
  removeBooking,
  updateStatus,
}
})

