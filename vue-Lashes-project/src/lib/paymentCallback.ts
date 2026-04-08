import { patchBookingStatus } from '@/api/bookings'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

/**
 * 模拟支付渠道异步通知：后端校验订单后把状态改为已支付。
 * Supabase 下匿名用户无 UPDATE 权限，通过 security definer RPC 更新。
 */
export async function handlePaymentCallback(orderId: number): Promise<void> {
  if (isSupabaseConfigured()) {
    const sb = getSupabase()
    const { error } = await sb.rpc('confirm_booking_payment_simulation', {
      p_id: orderId,
    })
    if (error) {
      const rpcMissing =
        error.code === 'PGRST202' ||
        String(error.message ?? '').includes('confirm_booking_payment_simulation')
      if (rpcMissing) {
        throw new Error(
          '支付回调需要数据库 RPC。请在 Supabase SQL Editor 执行 supabase/migration_payment_flow.sql'
        )
      }
      throw error
    }
    return
  }
  await patchBookingStatus(orderId, 'paid')
}
