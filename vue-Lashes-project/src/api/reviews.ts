import type { ReviewItem } from '@/types/homereview'
import { initialReviews } from '@/data/homereviews'

const STORAGE_KEY = 'reviews'

/**
 * 首页评价：浏览器 localStorage + 内置初始数据（无 FastAPI 接口）。
 */
export async function fetchReviews(): Promise<ReviewItem[]> {
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
