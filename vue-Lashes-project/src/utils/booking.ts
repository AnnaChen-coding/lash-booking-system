import type { BookingItem } from '@/types/booking'

export const isTimeSlotBooked = (
  bookings: BookingItem[],
  date: string,
  time: string
) => {
  return bookings.some(
    booking =>
      booking.date === date &&
      booking.time === time &&
      booking.status !== 'cancelled'
  )
}