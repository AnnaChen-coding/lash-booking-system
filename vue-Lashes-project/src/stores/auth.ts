import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

/** 未接 Supabase 时的本地演示登录 */
const MOCK_STORAGE_KEY = 'gaze-mock-auth-token'

/** 演示用固定口令（仅在不使用 Supabase 时生效） */
export const MOCK_LOGIN_PASSWORD = 'demo'

export const useAuthStore = defineStore('auth', () => {
  const mockToken = ref<string | null>(null)
  const supabaseSession = ref<Session | null>(null)

  const hydrateMock = () => {
    try {
      mockToken.value = localStorage.getItem(MOCK_STORAGE_KEY)
    } catch {
      mockToken.value = null
    }
  }

  const isAuthenticated = computed(() => {
    if (isSupabaseConfigured()) {
      return Boolean(supabaseSession.value?.user)
    }
    return Boolean(mockToken.value)
  })

  /** 启动时调用：恢复 Supabase 会话并订阅变化（勿与 booking store 静态互相 import） */
  async function bootstrapAuth(): Promise<void> {
    if (!isSupabaseConfigured()) {
      hydrateMock()
      return
    }

    const sb = getSupabase()
    const {
      data: { session },
    } = await sb.auth.getSession()
    supabaseSession.value = session

    sb.auth.onAuthStateChange((_event, session) => {
      supabaseSession.value = session
      void import('@/stores/booking').then(({ useBookingStore }) => {
        const bookingStore = useBookingStore()
        if (session) {
          void bookingStore.hydrateBookings()
        } else {
          bookingStore.clearAfterLogout()
        }
      })
    })
  }

  function loginMock(password: string): boolean {
    if (password !== MOCK_LOGIN_PASSWORD) {
      return false
    }
    const t = `mock-${Date.now()}`
    mockToken.value = t
    localStorage.setItem(MOCK_STORAGE_KEY, t)
    return true
  }

  async function loginWithSupabase(
    email: string,
    password: string
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    if (!isSupabaseConfigured()) {
      return { ok: false, message: '未配置 Supabase' }
    }
    const sb = getSupabase()
    const { data, error } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) {
      return { ok: false, message: error.message }
    }
    supabaseSession.value = data.session ?? null
    return { ok: true }
  }

  async function logout(): Promise<void> {
    if (isSupabaseConfigured()) {
      const sb = getSupabase()
      await sb.auth.signOut()
      supabaseSession.value = null
    } else {
      mockToken.value = null
      try {
        localStorage.removeItem(MOCK_STORAGE_KEY)
      } catch {
        /* ignore */
      }
    }
    const { useBookingStore } = await import('@/stores/booking')
    useBookingStore().clearAfterLogout()
  }

  hydrateMock()

  return {
    supabaseSession,
    isAuthenticated,
    bootstrapAuth,
    loginMock,
    loginWithSupabase,
    logout,
    hydrateMock,
  }
})
