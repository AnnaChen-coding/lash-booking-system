/// <reference types="vite/client" />

import 'vue-router'

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** 可选：模拟支付随机失败概率 0～1，例如 `0.2`；不设则始终走成功回调 */
  readonly VITE_PAYMENT_SIMULATE_FAIL_PROB?: string
  /** 设为 `true` 时，通过 Supabase Edge Function 做服务推荐（服务端 DeepSeek）；密钥只在服务端 */
  readonly VITE_ENABLE_OPENAI_SERVICE_RECOMMEND?: string
  /** 可选，默认 `service-recommend` */
  readonly VITE_SUPABASE_SERVICE_RECOMMEND_FUNCTION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresAdmin?: boolean
    guestOnly?: boolean
  }
}
