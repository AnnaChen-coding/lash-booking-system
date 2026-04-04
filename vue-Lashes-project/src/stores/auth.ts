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
  /** Supabase：当前 JWT 邮箱是否在 public.admin_emails 白名单（由 RPC 刷新） */
  const isAdminUser = ref(false)

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

  /** 可进入 /admin 并拉取全量预约：Mock 登录成功，或 Supabase 已登录且在白名单 */
  const canAccessAdmin = computed(() => {
    if (!isSupabaseConfigured()) {
      return Boolean(mockToken.value)
    }
    return Boolean(supabaseSession.value?.user) && isAdminUser.value
  })

  async function refreshAdminStatus(): Promise<void> {
    if (!isSupabaseConfigured()) {
      isAdminUser.value = false
      return
    }
    if (!supabaseSession.value?.user) {
      isAdminUser.value = false
      return
    }
    const sb = getSupabase()
    const { data, error } = await sb.rpc('current_user_is_admin')
    if (error) {
      console.warn('[auth] current_user_is_admin:', error.message)
      isAdminUser.value = false
      return
    }
    isAdminUser.value = Boolean(data)
  }

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
    await refreshAdminStatus()

    sb.auth.onAuthStateChange(async (_event, session) => {
      supabaseSession.value = session
      await refreshAdminStatus()
      void import('@/stores/booking').then(({ useBookingStore }) => {
        const bookingStore = useBookingStore()
        if (session && isAdminUser.value) {
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
    await refreshAdminStatus()
    if (!isAdminUser.value) {
      await sb.auth.signOut()
      supabaseSession.value = null
      return {
        ok: false,
        message: '该邮箱不在管理员名单中，无法进入后台（请在 Supabase 表 admin_emails 中添加）',
      }
    }
    return { ok: true }
  }

  async function logout(): Promise<void> {
    if (isSupabaseConfigured()) {
      const sb = getSupabase()
      await sb.auth.signOut()
      supabaseSession.value = null
      isAdminUser.value = false
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
    isAdminUser,
    isAuthenticated,
    canAccessAdmin,
    bootstrapAuth,
    refreshAdminStatus,
    loginMock,
    loginWithSupabase,
    logout,
    hydrateMock,
  }
})
