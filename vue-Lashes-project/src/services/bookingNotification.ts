import { request, isRemoteApi } from '@/api/client'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type { BookingItem } from '@/types/booking'

// 预约成功通知 payload
export interface BookingNotifyPayload {
  customerName: string
  customerPhone: string
  customerEmail?: string
  service: string
  date: string
  time: string
  notes: string
  booking: BookingItem
}

// 预约成功通知结果
export interface BookingNotifyResult {
  provider: 'remote_api' | 'supabase_function' | 'mock'
  usedCustomerChannel: 'email' | 'sms_mock'
  usedAdminChannel: 'email' | 'sms_mock'
  warnings: string[]
}

// 模拟管理员短信
const MOCK_ADMIN_SMS = '店长手机（模拟）'
// 解析管理员邮箱
function parseAdminEmails(): string[] {
  const raw = import.meta.env.VITE_BOOKING_ADMIN_EMAILS
  if (!raw || typeof raw !== 'string') return []
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}
// 模拟通知
function mockNotify(payload: BookingNotifyPayload, warnings: string[]): BookingNotifyResult {
  const adminEmails = parseAdminEmails()
  const customerEmail = payload.customerEmail?.trim()

  const usedCustomerChannel: BookingNotifyResult['usedCustomerChannel'] = customerEmail
    ? 'email'
    : 'sms_mock'
  const usedAdminChannel: BookingNotifyResult['usedAdminChannel'] = adminEmails.length
    ? 'email'
    : 'sms_mock'

  const customerTarget = customerEmail || payload.customerPhone
  const adminTarget = adminEmails.join(', ') || MOCK_ADMIN_SMS
  const summary = `[booking-notify:mock] booking#${payload.booking.id} customer:${usedCustomerChannel}(${customerTarget}) admin:${usedAdminChannel}(${adminTarget})`

  console.info(summary, {
    bookingId: payload.booking.id,
    service: payload.service,
    date: payload.date,
    time: payload.time,
    warnings,
  })

  return {
    provider: 'mock',
    usedCustomerChannel,
    usedAdminChannel,
    warnings,
  }
}
// 分发预约成功通知
export async function dispatchBookingSuccessNotification(
  payload: BookingNotifyPayload
): Promise<BookingNotifyResult> {
  const warnings: string[] = []

  // 如果配置了远程 API，则调用远程 API
  if (isRemoteApi()) {
    try {
      await request('POST', '/notifications/booking-success', {
        body: payload,
      })
      return {
        provider: 'remote_api',
        usedCustomerChannel: payload.customerEmail?.trim() ? 'email' : 'sms_mock',
        usedAdminChannel: parseAdminEmails().length ? 'email' : 'sms_mock',
        warnings,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      // 添加警告
      warnings.push(`远程通知接口失败：${message}`)
    }
  }

  // 如果配置了 Supabase，则调用 Supabase 通知函数
  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabase()
      const functionName = import.meta.env.VITE_SUPABASE_NOTIFY_FUNCTION?.trim() || 'booking-notify'
      const { error } = await sb.functions.invoke(functionName, {
        body: payload,
      })
      if (error) throw error
      return {
        provider: 'supabase_function',
        usedCustomerChannel: payload.customerEmail?.trim() ? 'email' : 'sms_mock',
        usedAdminChannel: parseAdminEmails().length ? 'email' : 'sms_mock',
        warnings,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      warnings.push(`Supabase 通知函数失败：${message}`)
    }
  }

  // 如果配置了远程 API 和 Supabase，则返回 mock 通知
  return mockNotify(payload, warnings)
}
