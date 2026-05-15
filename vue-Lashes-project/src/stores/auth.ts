import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { ApiError, isRemoteApi, request } from '@/api/client'

/** 未配置 VITE_API_BASE_URL 时的本地演示登录 */
const MOCK_STORAGE_KEY = 'gaze-mock-auth-token'

const REST_TOKEN_STORAGE_KEY = 'gaze-rest-access-token'

export const MOCK_LOGIN_PASSWORD = 'demo'

export const useAuthStore = defineStore('auth', () => {
  const mockToken = ref<string | null>(null)
  const restAccessToken = ref<string | null>(null)
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

  const isApiAuthMode = () => isRemoteApi()

  function bearerForApiCalls(): string | null {
    if (isApiAuthMode()) {
      return restAccessToken.value?.trim() ?? null
    }
    return null
  }

  const isAuthenticated = computed(() => {
    if (isApiAuthMode()) {
      return Boolean(restAccessToken.value)
    }
    return Boolean(mockToken.value)
  })

  const canAccessAdmin = computed(() => {
    if (isApiAuthMode()) {
      return Boolean(
        restAccessToken.value && restAuthMe.value?.isAdmin === true
      )
    }
    return Boolean(mockToken.value)
  })

  async function refreshRestMe(): Promise<void> {
    restAuthMe.value = null
    if (!isApiAuthMode() || !restAccessToken.value?.trim()) {
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
    if (isApiAuthMode()) {
      hydrateRestToken()
      if (restAccessToken.value) {
        await refreshRestMe()
      }
      return
    }
    hydrateMock()
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
    if (!isApiAuthMode()) {
      return { ok: false, message: '未配置 VITE_API_BASE_URL，无法连接后端登录' }
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
        e instanceof Error ? e.message : '登录失败，请检查账号密码与后端配置'
      return { ok: false, message: msg }
    }
  }

  async function logout(): Promise<void> {
    setRestToken(null)
    restAuthMe.value = null
    mockToken.value = null
    try {
      localStorage.removeItem(MOCK_STORAGE_KEY)
    } catch {
      /* ignore */
    }
    const { useBookingStore } = await import('@/stores/booking')
    useBookingStore().clearAfterLogout()
  }

  hydrateMock()
  hydrateRestToken()

  return {
    restAccessToken,
    restAuthMe,
    isAuthenticated,
    canAccessAdmin,
    bearerForApiCalls,
    bootstrapAuth,
    refreshRestMe,
    loginMock,
    loginWithRest,
    logout,
    hydrateMock,
  }
})
