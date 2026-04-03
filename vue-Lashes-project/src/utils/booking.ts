// type 导入类型信息
import type { BookingItem } from '@/types/booking'

export const isTimeSlotBooked = (
  bookings: BookingItem[],
  date: string,
  time: string
) 
  // 显式声明返回值类型是布尔值。
  : boolean => {return bookings.some(
      // some 只要数组里“至少有一项”满足条件，就返回 true；如果一项都没有，就返回 false
      // 为什么不用 filter()？
      // 因为 filter() 是把所有符合条件的项都找出来，返回一个新数组。
      // 为什么不用 forEach()？
      // forEach() 也能遍历，但它不适合做这种“找到一个就结束”的判断。
    booking =>
      booking.date === date &&
      booking.time === time &&
      booking.status !== 'cancelled'
  )
}