import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type { ServiceAiRecommendResult } from '@/utils/serviceAiRecommend'

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function parseEdgePayload(data: unknown): ServiceAiRecommendResult | null {
  if (!isRecord(data)) return null
  const schemaVersion = data.schemaVersion
  const serviceName = data.serviceName
  const category = data.category
  const confidence = data.confidence
  const responseLanguage = data.responseLanguage
  const summary = data.summary
  const supportingPoints = data.supportingPoints
  const why = data.why

  if (schemaVersion !== '1.0') return null
  if (typeof serviceName !== 'string' || !serviceName.trim()) return null
  if (category !== 'nails' && category !== 'lashes') return null
  if (confidence !== 'high' && confidence !== 'medium' && confidence !== 'low') {
    return null
  }
  if (
    responseLanguage !== 'zh' &&
    responseLanguage !== 'en' &&
    responseLanguage !== 'mixed'
  ) {
    return null
  }
  if (typeof summary !== 'string' || summary.trim().length < 40) return null
  if (!Array.isArray(supportingPoints) || supportingPoints.length < 2) return null
  const points = supportingPoints.filter(
    (p): p is string => typeof p === 'string' && p.trim().length >= 10
  )
  if (points.length < 2) return null
  if (typeof why !== 'string' || !why.trim()) return null

  return {
    schemaVersion: '1.0',
    serviceName: serviceName.trim(),
    category,
    confidence,
    responseLanguage,
    summary: summary.trim(),
    supportingPoints: points.map((p) => p.trim()),
    why: why.trim(),
  }
}

/**
 * 通过 Supabase Edge Function 调用远程模型（当前实现为 DeepSeek；密钥仅在服务端）。
 */
export async function recommendServiceViaSupabaseEdge(
  prompt: string
): Promise<ServiceAiRecommendResult> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.')
  }
  const fn =
    import.meta.env.VITE_SUPABASE_SERVICE_RECOMMEND_FUNCTION?.trim() ||
    'service-recommend'

  const sb = getSupabase()
  const { data, error } = await sb.functions.invoke(fn, {
    body: { prompt },
  })

  if (error) {
    const msg =
      typeof error.message === 'string' && error.message
        ? error.message
        : 'Edge function request failed.'
    throw new Error(msg)
  }

  const parsed = parseEdgePayload(data)
  if (!parsed) {
    throw new Error('Invalid response from recommendation service.')
  }
  return parsed
}
