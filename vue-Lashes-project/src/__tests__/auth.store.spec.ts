import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { MOCK_LOGIN_PASSWORD, useAuthStore } from '@/stores/auth'

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => false,
  getSupabase: () => {
    throw new Error('supabase should not be used in mock-mode tests')
  },
}))

describe('auth store (mock mode)', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('rejects wrong mock password', () => {
    const auth = useAuthStore()
    const ok = auth.loginMock('wrong-password')

    expect(ok).toBe(false)
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.canAccessAdmin).toBe(false)
  })

  it('authenticates and grants admin access with correct mock password', () => {
    const auth = useAuthStore()
    const ok = auth.loginMock(MOCK_LOGIN_PASSWORD)

    expect(ok).toBe(true)
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.canAccessAdmin).toBe(true)
  })

  it('clears session after logout', async () => {
    const auth = useAuthStore()
    auth.loginMock(MOCK_LOGIN_PASSWORD)

    await auth.logout()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.canAccessAdmin).toBe(false)
  })
})
