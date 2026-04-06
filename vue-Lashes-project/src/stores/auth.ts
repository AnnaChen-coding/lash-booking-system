import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

/** 未接 Supabase 时的本地演示登录 */
const MOCK_STORAGE_KEY = 'gaze-mock-auth-token'

/** 演示用固定口令（仅在不使用 Supabase 时生效） */
export const MOCK_LOGIN_PASSWORD = 'demo'
// 定义 auth 存储，用于管理用户认证状态
export const useAuthStore = defineStore('auth', () => {
  // 本地存储的 mock 令牌 有值就表示「演示登录成功」
  const mockToken = ref<string | null>(null)
  // Supabase 会话 有效 session 就表示 Supabase 登录了
  const supabaseSession = ref<Session | null>(null)
  /** Supabase：当前 JWT 邮箱是否在 public.admin_emails 白名单（由 RPC 刷新） */
  const isAdminUser = ref(false)

  // 从 localStorage 把之前演示登录存的 token 读回来到响应式变量 mockToken
  const hydrateMock = () => {
    try {
      mockToken.value = localStorage.getItem(MOCK_STORAGE_KEY)
    } catch {
      mockToken.value = null
    }
  }
  // 是否已认证
  const isAuthenticated = computed(() => {
    if (isSupabaseConfigured()) {
      // 如果 Supabase 已登录，则返回 true
      return Boolean(supabaseSession.value?.user)
    }
    // 如果 Supabase 没有配置，则返回本地存储的 mock 令牌
    // 如果 mock 令牌存在，则返回 true，否则返回 false
    return Boolean(mockToken.value)
  })

  /** 可进入 /admin 并拉取全量预约：Mock 登录成功，或 Supabase 已登录且在白名单 */
  const canAccessAdmin = computed(() => {
    // 如果 Supabase 没有配置，则返回本地存储的 mock 令牌
    if (!isSupabaseConfigured()) {
      // 返回本地存储的 mock 令牌
      return Boolean(mockToken.value)
    }
    // 如果 Supabase 已登录且在白名单，则返回 true
    return Boolean(supabaseSession.value?.user) && isAdminUser.value
  })

  // 刷新管理员状态
  async function refreshAdminStatus(): Promise<void> {
    // 如果 Supabase 没有配置，则设置管理员状态为 false
    if (!isSupabaseConfigured()) {
      isAdminUser.value = false
      return
    }
    // 如果 Supabase 没有用户，则设置管理员状态为 false
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
    // 没配 Supabase
    if (!isSupabaseConfigured()) {
      hydrateMock()
      return
    }
// 拿当前 session
    const sb = getSupabase()
    // 整次访问里通常只有这里「主动读一次
    const {
      data: { session },
    } = await sb.auth.getSession()
    // 写入 session
    supabaseSession.value = session
    await refreshAdminStatus()
    // 监听登录状态变化
    sb.auth.onAuthStateChange(async (_event, session) => {
      // 第一步：更新 session
      supabaseSession.value = session
      await refreshAdminStatus()
      // 第二步：动态 import booking store
      void import('@/stores/booking').then(({ useBookingStore }) => {
        // 第三步：根据登录状态决定 booking 数据怎么处理
        const bookingStore = useBookingStore()
        if (session && isAdminUser.value) {
          // 有 session，并且是管理员
          void bookingStore.hydrateBookings()
        } else {
          // 不是管理员 / 已退出登录
          bookingStore.clearAfterLogout()
        }
      })
    })
  }
  // 本地演示登录
  function loginMock(password: string): boolean {
    // 如果密码不正确，则返回 false
    if (password !== MOCK_LOGIN_PASSWORD) {
      return false
    }
    // 生成一个模拟token
    const t = `mock-${Date.now()}`
    // 存进响应式状态 mockToken.value
    mockToken.value = t
    // 持久化到 localStorage
    localStorage.setItem(MOCK_STORAGE_KEY, t)
    // 返回 true
    return true
  }
  // 使用 Supabase 登录
  async function loginWithSupabase(
    email: string,
    password: string
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    // 检查是否配置 Supabase
    if (!isSupabaseConfigured()) {
      return { ok: false, message: '未配置 Supabase' }
    }
    // 调用 Supabase 登录
    const sb = getSupabase()
    const { data, error } = await sb.auth.signInWithPassword({
      // .trim()是防止用户输入邮箱时前后多打空格
      email: email.trim(),
      password,
    })
    if (error) {
      return { ok: false, message: error.message }
    }
    // 先保存 session，再刷新管理员状态
    supabaseSession.value = data.session ?? null
    await refreshAdminStatus()
    // 不是管理员就立刻踢掉
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
// 登出逻辑
  async function logout(): Promise<void> {
    if (isSupabaseConfigured()) {
      const sb = getSupabase()
      // 通知 Supabase 登出
      await sb.auth.signOut()
      // 清掉本地 session
      supabaseSession.value = null
      // 清掉 admin 状态
      isAdminUser.value = false
      // mock 模式下
    } else {
      // 清内存
      mockToken.value = null
      try {
        // 清 localStorage
        localStorage.removeItem(MOCK_STORAGE_KEY)
      } catch {
        /* ignore */
      }
    }
    // 最后统一清 booking 数据
    const { useBookingStore } = await import('@/stores/booking')
    useBookingStore().clearAfterLogout()
  }
// 只要 auth store 被初始化，就先尝试恢复本地 mock token
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
