import type { ReviewItem } from '@/types/homereview'
import { initialReviews } from '@/data/homereviews'
import { isRemoteApi, request } from './client'

const STORAGE_KEY = 'reviews'

/**
 * 远程约定：
 * GET  /reviews
 * POST /reviews   body: { name, rating, comment }，响应含 id、date
 */
export async function fetchReviews(): Promise<ReviewItem[]> {
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
  if (isRemoteApi()) {
    return request<ReviewItem>('POST', '/reviews', { body: data })
  }
  const date = new Date().toISOString().split('T')[0] || ''
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
