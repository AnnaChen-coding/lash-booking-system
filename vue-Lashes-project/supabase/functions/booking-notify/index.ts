/**
 * Edge Function：预约成功后发邮件（Resend）+ 无邮箱时控制台模拟短信。
 *
 * 在 Supabase Dashboard → Edge Functions → booking-notify 中部署本文件内容，
 * 并在 Secrets 中配置：
 *   RESEND_API_KEY
 *   RESEND_FROM_EMAIL
 *   BOOKING_ADMIN_EMAILS（逗号分隔，可选）
 *
 * 说明：优先使用 Deno.serve，避免部分环境下 `std/http/server` 版本与运行时
 * 不兼容导致 502。
 */

type BookingNotifyPayload = {
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  service?: string
  date?: string
  time?: string
  notes?: string
  booking?: {
    id?: number
    status?: string
  }
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function parseAdminEmails(): string[] {
  const raw = Deno.env.get('BOOKING_ADMIN_EMAILS') ?? ''
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

async function sendMail(
  to: string[],
  subject: string,
  html: string
): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM_EMAIL')
  if (!apiKey || !from) {
    throw new Error('RESEND_API_KEY 或 RESEND_FROM_EMAIL 未配置')
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Resend HTTP ${res.status}: ${text}`)
  }
}

function buildHtml(payload: BookingNotifyPayload): string {
  const id = payload.booking?.id ?? '-'
  const status = payload.booking?.status ?? '-'
  return `
      <h2>新的预约</h2>
      <p>姓名：${payload.customerName ?? ''}</p>
      <p>电话：${payload.customerPhone ?? ''}</p>
      <p>邮箱：${payload.customerEmail?.trim() || '未填写'}</p>
      <p>服务：${payload.service ?? ''}</p>
      <p>日期：${payload.date ?? ''}</p>
      <p>时间：${payload.time ?? ''}</p>
      <p>备注：${payload.notes ?? '无'}</p>
      <p>预约号 / 状态：#${id} / ${status}</p>
    `
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let payload: BookingNotifyPayload = {}
  try {
    const text = await req.text()
    if (!text.trim()) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Empty body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    payload = JSON.parse(text) as BookingNotifyPayload
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ ok: false, error: `Invalid JSON: ${msg}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const warnings: string[] = []
  const adminEmails = parseAdminEmails()
  const subjectBase = `预约成功 #${payload.booking?.id ?? '-'}`

  try {
    const html = buildHtml(payload)

    if (payload.customerEmail?.trim()) {
      try {
        await sendMail(
          [payload.customerEmail.trim()],
          `【预约成功】${payload.date ?? ''} ${payload.time ?? ''}`,
          html
        )
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        warnings.push(`顾客邮件失败：${msg}`)
        console.warn('[booking-notify] customer email failed', msg)
      }
    } else {
      warnings.push('顾客未填写邮箱，已使用短信模拟')
      console.info('[booking-notify] customer sms mock', {
        phone: payload.customerPhone,
        bookingId: payload.booking?.id,
      })
    }

    if (adminEmails.length > 0) {
      try {
        await sendMail(adminEmails, subjectBase, html)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        warnings.push(`管理员邮件失败：${msg}`)
        console.warn('[booking-notify] admin email failed', msg)
      }
    } else {
      warnings.push('未配置管理员邮箱，已使用短信模拟')
      console.info('[booking-notify] admin sms mock', {
        bookingId: payload.booking?.id,
      })
    }

    return new Response(JSON.stringify({ ok: true, warnings }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[booking-notify] fatal', msg)
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
