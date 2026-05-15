/// <reference types="vite/client" />

import 'vue-router'

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_BOOKING_ADMIN_EMAILS?: string
  readonly VITE_PAYMENT_SIMULATE_FAIL_PROB?: string
  readonly VITE_ENABLE_OPENAI_SERVICE_RECOMMEND?: string
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
