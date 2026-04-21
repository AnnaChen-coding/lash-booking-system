import { request, isRemoteApi } from '@/api/client'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type { BookingItem } from '@/types/booking'

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

export interface BookingNotifyResult {
  provider: 'remote_api' | 'supabase_function' | 'mock'
  usedCustomerChannel: 'email' | 'sms_mock'
  usedAdminChannel: 'email' | 'sms_mock'
  warnings: string[]
}

const MOCK_ADMIN_SMS = '店长手机（模拟）'

function parseAdminEmails(): string[] {
  const raw = import.meta.env.VITE_BOOKING_ADMIN_EMAILS
  if (!raw || typeof raw !== 'string') return []
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

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

export async function dispatchBookingSuccessNotification(
  payload: BookingNotifyPayload
): Promise<BookingNotifyResult> {
  const warnings: string[] = []

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
      warnings.push(`远程通知接口失败：${message}`)
    }
  }

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

  return mockNotify(payload, warnings)
}
