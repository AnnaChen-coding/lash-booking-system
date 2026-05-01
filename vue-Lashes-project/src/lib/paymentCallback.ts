import { patchBookingStatus } from '@/api/bookings'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { toError } from '@/lib/toError'

/** PostgreSQL `integer` 上限，与 `bookings.id serial` / `confirm_booking_payment_simulation(p_id integer)` 一致 */
const MAX_PG_INTEGER = 2_147_483_647

/**
 * 模拟支付渠道异步通知：后端校验订单后把状态改为已支付。
 * Supabase 下匿名用户无 UPDATE 权限，通过 security definer RPC 更新。
 */
export async function handlePaymentCallback(orderId: number): Promise<void> {
  if (
    !Number.isInteger(orderId) ||
    orderId < 1 ||
    orderId > MAX_PG_INTEGER
  ) {
    throw new Error(
      `订单号 ${orderId} 超出数据库整数范围或无效。常见原因：预约未通过 insert_booking_anon 取得真实自增 id（例如仍使用浏览器临时 id）。请在 Supabase 执行 supabase/schema.sql 中的 insert_booking_anon 后重新提交预约。`
    )
  }

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
          '支付回调需要数据库 RPC。请在 Supabase SQL Editor 执行 supabase/schema.sql 中与支付相关的段落（或全文）。'
        )
      }
      throw toError(error)
    }
    return
  }
  await patchBookingStatus(orderId, 'paid')
}
