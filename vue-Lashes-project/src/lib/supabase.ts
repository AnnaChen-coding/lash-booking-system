import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null
// 判断有没有配置 Supabase
export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  return Boolean(url && key)
}

export function getSupabase(): SupabaseClient {
  // 先检查
  if (!isSupabaseConfigured()) {
    // 没配就直接报错
    throw new Error(
      'Supabase 未配置：请在 .env 中设置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY'
    )
  }
  if (!client) {
    // 配了才去 createClient(...)
    client = createClient(
      import.meta.env.VITE_SUPABASE_URL!.trim(),
      import.meta.env.VITE_SUPABASE_ANON_KEY!.trim()
    )
  }
  return client
}
