import { isRemoteApi } from '@/api/client'

/**
 * 已配置 FastAPI 时：匿名访客只拉按日占档（GET /booked-times），不拉全表。
 */
export function useRemoteBookingAvailability(): boolean {
  return isRemoteApi()
}

/** 远端写库后由 createBooking 返回真实自增 id */
export function usePlaceholderBookingIdUntilCreated(): boolean {
  return useRemoteBookingAvailability()
}
