import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/** 本地 Mock 登录，仅用于开发演示；接入真实接口时可替换为 token / refresh 逻辑 */
const STORAGE_KEY = 'gaze-mock-auth-token'

/** 演示用固定口令，任意修改即可 */
export const MOCK_LOGIN_PASSWORD = 'demo'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null)

  const hydrate = () => {
    try {
      token.value = localStorage.getItem(STORAGE_KEY)
    } catch {
      token.value = null
    }
  }

  const isAuthenticated = computed(() => Boolean(token.value))

  const login = (password: string): boolean => {
    if (password !== MOCK_LOGIN_PASSWORD) {
      return false
    }
    const mockToken = `mock-${Date.now()}`
    token.value = mockToken
    localStorage.setItem(STORAGE_KEY, mockToken)
    return true
  }

  const logout = () => {
    token.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  hydrate()

  return {
    token,
    isAuthenticated,
    login,
    logout,
    hydrate,
  }
})
