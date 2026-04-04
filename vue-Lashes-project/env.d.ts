/// <reference types="vite/client" />

import 'vue-router'

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
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
