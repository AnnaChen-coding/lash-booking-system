import { isRestApiPreferred } from '@/api/client'
import { isSupabaseConfigured } from '@/lib/supabase'

/**
 * 已配置 Supabase 或「REST 优先」时：匿名访客只应使用按日占档（RPC / GET booked-times），
 * 不得拉全表 `GET /bookings`；与 `main.ts` 首屏、`hydrateBookings` skip 条件保持一致。
 */
export function useRemoteBookingAvailability(): boolean {
  return isSupabaseConfigured() || isRestApiPreferred()
}

/**
 * 创建预约前占位 id：远端写库后由 `createBooking` 返回真实自增 id（与 Supabase anon / FastAPI 一致）。
 */
export function usePlaceholderBookingIdUntilCreated(): boolean {
  return useRemoteBookingAvailability()
}
