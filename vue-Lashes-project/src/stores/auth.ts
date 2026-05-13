import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import {
  ApiError,
  isRemoteApi,
  isRestApiPreferred,
  request,
} from '@/api/client'

/** 未接 Supabase 且未启用 REST 管理员时的本地演示登录 */
const MOCK_STORAGE_KEY = 'gaze-mock-auth-token'

/** FastAPI 管理员 JWT（仅浏览器存储 anon key，非 service_role） */
const REST_TOKEN_STORAGE_KEY = 'gaze-rest-access-token'

/** 演示用固定口令（仅在不使用 Supabase / REST 管理员时生效） */
export const MOCK_LOGIN_PASSWORD = 'demo'

export const useAuthStore = defineStore('auth', () => {
  const mockToken = ref<string | null>(null)
  const supabaseSession = ref<Session | null>(null)
  /** Supabase：当前 JWT 邮箱是否在 public.admin_emails 白名单 */
  const isAdminUser = ref(false)

  /** FastAPI /auth/login 返回的 access_token */
  const restAccessToken = ref<string | null>(null)
  /** GET /auth/me 最近一次结果 */
  const restAuthMe = ref<{ email: string; isAdmin: boolean } | null>(null)

  const hydrateMock = () => {
    try {
      mockToken.value = localStorage.getItem(MOCK_STORAGE_KEY)
    } catch {
      mockToken.value = null
    }
  }

  const hydrateRestToken = () => {
    try {
      restAccessToken.value = localStorage.getItem(REST_TOKEN_STORAGE_KEY)
    } catch {
      restAccessToken.value = null
    }
  }

  const setRestToken = (token: string | null) => {
    restAccessToken.value = token
    try {
      if (token) {
        localStorage.setItem(REST_TOKEN_STORAGE_KEY, token)
      } else {
        localStorage.removeItem(REST_TOKEN_STORAGE_KEY)
      }
    } catch {
      /* ignore */
    }
  }

  /** 调 FastAPI 受保护接口时携带：REST JWT 优先，否则 Supabase 管理员 access_token */
  function bearerForApiCalls(): string | null {
    if (restAccessToken.value?.trim()) {
      return restAccessToken.value.trim()
    }
    if (isSupabaseConfigured() && isAdminUser.value) {
      return supabaseSession.value?.access_token?.trim() ?? null
    }
    return null
  }

  const isRestAdminMode = () => isRestApiPreferred() && isRemoteApi()

  const isAuthenticated = computed(() => {
    if (isRestAdminMode()) {
      return Boolean(restAccessToken.value)
    }
    if (isSupabaseConfigured()) {
      return Boolean(supabaseSession.value?.user)
    }
    return Boolean(mockToken.value)
  })

  const canAccessAdmin = computed(() => {
    if (isRestAdminMode()) {
      return Boolean(
        restAccessToken.value && restAuthMe.value?.isAdmin === true
      )
    }
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

  async function refreshRestMe(): Promise<void> {
    restAuthMe.value = null
    if (!isRestAdminMode() || !restAccessToken.value?.trim()) {
      return
    }
    try {
      const me = await request<{ email: string; isAdmin: boolean }>(
        'GET',
        '/auth/me',
        { auth: true }
      )
      restAuthMe.value = me
      if (!me.isAdmin) {
        setRestToken(null)
      }
    } catch {
      setRestToken(null)
    }
  }

  async function bootstrapAuth(): Promise<void> {
    if (isRestAdminMode()) {
      hydrateRestToken()
      if (restAccessToken.value) {
        await refreshRestMe()
      }
      return
    }

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
    try {
      localStorage.setItem(MOCK_STORAGE_KEY, t)
    } catch {
      /* ignore */
    }
    return true
  }

  async function loginWithRest(
    email: string,
    password: string
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    if (!isRestAdminMode()) {
      return { ok: false, message: '未启用 REST 管理员登录' }
    }
    try {
      const data = await request<{ access_token: string; token_type: string }>(
        'POST',
        '/auth/login',
        { body: { email: email.trim(), password } }
      )
      setRestToken(data.access_token)
      await refreshRestMe()
      if (!restAuthMe.value?.isAdmin) {
        setRestToken(null)
        return { ok: false, message: '服务端未授予管理员权限' }
      }
      void import('@/stores/booking').then(({ useBookingStore }) => {
        void useBookingStore().hydrateBookings()
      })
      return { ok: true }
    } catch (e) {
      if (e instanceof ApiError) {
        const detail =
          typeof e.body === 'object' &&
          e.body !== null &&
          'detail' in e.body
            ? String((e.body as { detail: unknown }).detail)
            : e.message
        return { ok: false, message: detail || e.message }
      }
      const msg =
        e instanceof Error ? e.message : 'REST 登录失败，请检查账号密码与后端配置'
      return { ok: false, message: msg }
    }
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
        message:
          '该邮箱不在管理员名单中，无法进入后台（请在 Supabase 表 admin_emails 中添加）',
      }
    }
    return { ok: true }
  }

  async function logout(): Promise<void> {
    setRestToken(null)
    restAuthMe.value = null
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
  hydrateRestToken()

  return {
    supabaseSession,
    isAdminUser,
    restAccessToken,
    restAuthMe,
    isAuthenticated,
    canAccessAdmin,
    bearerForApiCalls,
    bootstrapAuth,
    refreshAdminStatus,
    refreshRestMe,
    loginMock,
    loginWithRest,
    loginWithSupabase,
    logout,
    hydrateMock,
  }
})
