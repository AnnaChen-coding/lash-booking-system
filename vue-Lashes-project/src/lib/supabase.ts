/// <reference types="vite/client" />

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

function readSupabaseEnv(): { url: string; anonKey: string } {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''
  return { url, anonKey }
}

/** 是否已配置 Supabase（两项环境变量均非空） */
export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = readSupabaseEnv()
  return Boolean(url && anonKey)
}

/**
 * 获取 Supabase 客户端单例（需在 .env 中配置 URL 与 anon key）。
 * @throws 未配置时抛出明确错误
 */
export function getSupabase(): SupabaseClient {
  const { url, anonKey } = readSupabaseEnv()
  if (!url || !anonKey) {
    throw new Error(
      'Supabase 未配置：请在 .env 中设置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY'
    )
  }
  if (!client) {
    client = createClient(url, anonKey)
  }
  return client
}
