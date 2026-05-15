import { patchBookingStatus } from '@/api/bookings'
import { isRemoteApi, request } from '@/api/client'

/**
 * 模拟支付回调：pending_payment → paid。
 * FastAPI：POST /bookings/{id}/confirm-payment（匿名）。
 */
export async function handlePaymentCallback(orderId: number): Promise<void> {
  if (!Number.isInteger(orderId) || orderId < 1) {
    throw new Error(`订单号 ${orderId} 无效，请重新提交预约。`)
  }

  if (isRemoteApi()) {
    await request<unknown>(
      'POST',
      `/bookings/${orderId}/confirm-payment`,
      {}
    )
    return
  }

  await patchBookingStatus(orderId, 'paid')
}
