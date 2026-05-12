import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import router from '@/router'
import { MOCK_LOGIN_PASSWORD, useAuthStore } from '@/stores/auth'

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => false,
  getSupabase: () => {
    throw new Error('supabase should not be used in router guard tests')
  },
}))

async function navigate(path: string) {
  await router.push(path)
  await router.isReady()
}

describe('router guards', () => {
  beforeEach(async () => {
    localStorage.clear()
    setActivePinia(createPinia())
    await navigate('/')
  })

  it('redirects guest to login when visiting /admin', async () => {
    await navigate('/admin')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/admin')
  })

  it('allows admin user to visit /admin', async () => {
    const auth = useAuthStore()
    auth.loginMock(MOCK_LOGIN_PASSWORD)

    await navigate('/admin')

    expect(router.currentRoute.value.name).toBe('admin')
  })

  it('redirects authenticated admin away from /login', async () => {
    const auth = useAuthStore()
    auth.loginMock(MOCK_LOGIN_PASSWORD)

    await navigate('/login')

    expect(router.currentRoute.value.name).toBe('home')
  })
})
