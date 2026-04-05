import type { ReviewItem } from '@/types/homereview'
import { initialReviews } from '@/data/homereviews'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { isRemoteApi, request } from './client'

const STORAGE_KEY = 'reviews'
// 这个是给 Supabase .select() 用的字段列表。
const REVIEW_COLUMNS = 'id,name,rating,comment,date' as const
// 将值转换为 ID
function toId(value: unknown): number {
  // 如果值是数字，并且是有限的，则返回值
  if (typeof value === 'number' && Number.isFinite(value)) return value
  // 如果值是字符串，则转换为数字
  if (typeof value === 'string') {
    // 转换为数字
    const n = Number(value)
    // 如果转换后的数字是有限的，则返回数字
    if (Number.isFinite(n)) return n
  }
  // 否则抛出错误
  throw new Error('Invalid id from database')
}

// 将行转换为 ReviewItem
function rowToReview(row: Record<string, unknown>): ReviewItem {
  // 将 ID 转换为数字
  return {
    id: toId(row.id),
    name: String(row.name ?? ''),
    // 将评分转换为数字
    rating: Number(row.rating ?? 0),
    // 将评论转换为字符串
    comment: String(row.comment ?? ''),
    // 将日期转换为字符串
    date: String(row.date ?? ''),
    // 返回 ReviewItem
  }
}

/**
 * 数据源优先级：Supabase → 通用 REST → localStorage + 内置初始评价
 *
 * REST 约定：
 * GET  /reviews
 * POST /reviews   body: { name, rating, comment }，响应含 id、date
 */
// 获取评价
export async function fetchReviews(): Promise<ReviewItem[]> {
  if (isSupabaseConfigured()) {
    const sb = getSupabase()
    // 指定表名
    const { data, error } = await sb
      // 指定表名
      .from('reviews')
      // 选择 REVIEW_COLUMNS 列
      .select(REVIEW_COLUMNS)
      // 按 ID 排序，降序
      .order('id', { ascending: false })
    // 如果获取失败，则抛出错误
    if (error) throw error
    // 将数据转换为 ReviewItem
    return (data ?? []).map((r) => rowToReview(r as Record<string, unknown>))
  }
  // 如果远程 API 配置了，则调用远程 API
  if (isRemoteApi()) {
    // 调用远程 API
    return request<ReviewItem[]>('GET', '/reviews')
  }
  // 否则读取本地存储
  try {
    // 获取本地存储的评价
    const saved = localStorage.getItem(STORAGE_KEY)
    // 如果本地存储的评价不为空，则将评价转换为 ReviewItem
    if (saved) {
      // 将评价转换为 ReviewItem
      return JSON.parse(saved) as ReviewItem[]
    }
  } catch {
    // 如果转换为 JSON 失败，则忽略错误
    /* ignore */
  }
  // 否则返回内置初始评价
  return initialReviews.map((r) => ({ ...r }))
}

// 创建评价
export async function createReview(
  data: Pick<ReviewItem, 'name' | 'rating' | 'comment'>
): Promise<ReviewItem> {
  // 获取当前日期
  const date = new Date().toISOString().split('T')[0] || ''
  // 如果 Supabase 配置了，则调用 Supabase 的 API

  if (isSupabaseConfigured()) {
    const sb = getSupabase()
    // 指定表名
    const { data: row, error } = await sb
      // 指定表名
      .from('reviews')
      // 插入数据
      .insert({
        name: data.name,
        // 评分
        rating: data.rating,
        // 评论
        comment: data.comment,
        // 日期
        date,
      })
      // 选择 REVIEW_COLUMNS 列
      .select(REVIEW_COLUMNS)
      // 返回单行数据
      .single()
    if (error) throw error
    if (!row) throw new Error('评价写入后未返回数据')
    return rowToReview(row as Record<string, unknown>)
  }
  // 如果远程 API 配置了，则调用远程 API
  if (isRemoteApi()) {
    return request<ReviewItem>('POST', '/reviews', { body: data })
  }
  // 否则读取本地存储
  const items = [...(await fetchReviews())]
  // 创建新的评价
  const newReview: ReviewItem = {
    // 设置 ID 为当前时间戳
    id: Date.now(),
    ...data,
    date, // 设置日期
  }
  // 将新的评价添加到 items 数组中
  items.unshift(newReview)
  // 将 items 数组写入本地存储
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  // 返回新的评价
  return newReview
}
