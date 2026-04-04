import type { ReviewItem } from '@/types/homereview'
import { initialReviews } from '@/data/homereviews'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { isRemoteApi, request } from './client'

const STORAGE_KEY = 'reviews'

const REVIEW_COLUMNS = 'id,name,rating,comment,date' as const

function toId(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  throw new Error('Invalid id from database')
}

function rowToReview(row: Record<string, unknown>): ReviewItem {
  return {
    id: toId(row.id),
    name: String(row.name ?? ''),
    rating: Number(row.rating ?? 0),
    comment: String(row.comment ?? ''),
    date: String(row.date ?? ''),
  }
}

/**
 * 数据源优先级：Supabase → 通用 REST → localStorage + 内置初始评价
 *
 * REST 约定：
 * GET  /reviews
 * POST /reviews   body: { name, rating, comment }，响应含 id、date
 */
export async function fetchReviews(): Promise<ReviewItem[]> {
  if (isSupabaseConfigured()) {
    const sb = getSupabase()
    const { data, error } = await sb
      .from('reviews')
      .select(REVIEW_COLUMNS)
      .order('id', { ascending: false })
    if (error) throw error
    return (data ?? []).map((r) => rowToReview(r as Record<string, unknown>))
  }
  if (isRemoteApi()) {
    return request<ReviewItem[]>('GET', '/reviews')
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved) as ReviewItem[]
    }
  } catch {
    /* ignore */
  }
  return initialReviews.map((r) => ({ ...r }))
}

export async function createReview(
  data: Pick<ReviewItem, 'name' | 'rating' | 'comment'>
): Promise<ReviewItem> {
  const date = new Date().toISOString().split('T')[0] || ''

  if (isSupabaseConfigured()) {
    const sb = getSupabase()
    const { data: row, error } = await sb
      .from('reviews')
      .insert({
        name: data.name,
        rating: data.rating,
        comment: data.comment,
        date,
      })
      .select(REVIEW_COLUMNS)
      .single()
    if (error) throw error
    if (!row) throw new Error('评价写入后未返回数据')
    return rowToReview(row as Record<string, unknown>)
  }
  if (isRemoteApi()) {
    return request<ReviewItem>('POST', '/reviews', { body: data })
  }
  const items = [...(await fetchReviews())]
  const newReview: ReviewItem = {
    id: Date.now(),
    ...data,
    date,
  }
  items.unshift(newReview)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  return newReview
}
