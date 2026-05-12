import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookingStore } from '@/stores/booking'
import { isStartUnavailableForService } from '@/utils/scheduleAvailability'
import type { PublicBookingBlock } from '@/types/schedule'
// 模拟 Supabase 未配置
vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => false,
  getSupabase: () => {
    throw new Error('supabase should not be used in local availability tests')
  },
}))

describe('booking availability', () => {
  // 每次测试前重置 Pinia
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('marks slot unavailable when overlapping bookings exceed technician capacity', () => {
    const blocks: PublicBookingBlock[] = [
      { line: 'nails', time: '10:00', blockMinutes: 100 },
      { line: 'nails', time: '10:00', blockMinutes: 100 },
    ]

    const unavailable = isStartUnavailableForService(
      blocks,
      'Classic Manicure',
      '10:30'
    )

    expect(unavailable).toBe(true)
  })

  it('keeps slot available when overlap stays within technician capacity', () => {
    const blocks: PublicBookingBlock[] = [
      { line: 'nails', time: '10:00', blockMinutes: 100 },
    ]

    const unavailable = isStartUnavailableForService(
      blocks,
      'Classic Manicure',
      '10:30'
    )

    expect(unavailable).toBe(false)
  })

  it('recommends nearest available time slots', () => {
    const store = useBookingStore()
    store.bookings = [
      {
        id: 1,
        name: 'A',
        phone: '111',
        service: 'Classic Manicure',
        date: '2026-05-10',
        time: '10:00',
        notes: '',
        status: 'pending',
      },
      {
        id: 2,
        name: 'B',
        phone: '222',
        service: 'Classic Manicure',
        date: '2026-05-10',
        time: '10:00',
        notes: '',
        status: 'confirmed',
      },
    ]

    const suggestions = store.recommendAvailableSlots(
      '2026-05-10',
      '10:00',
      3,
      'Classic Manicure'
    )

    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions).not.toContain('10:00')
  })
})
