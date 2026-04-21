<script setup lang="ts">
import { computed } from 'vue'
import { useBookingStore } from '@/stores/booking'

const bookingStore = useBookingStore()

const parseBookingDate = (dateText: string) => {
  if (!dateText) return null
  const parsed = new Date(`${dateText}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const formatDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizedBookings = computed(() => {
  return bookingStore.bookings
    .map((booking) => ({
      ...booking,
      bookingDate: parseBookingDate(booking.date),
    }))
    .filter((booking) => booking.bookingDate)
})

const todayCount = computed(() => {
  const today = formatDateKey(new Date())
  return normalizedBookings.value.filter(
    (booking) => formatDateKey(booking.bookingDate as Date) === today
  ).length
})

const weekStartDate = computed(() => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const mondayOffset = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - mondayOffset)
  return start
})

const currentWeekSeries = computed(() => {
  const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const dayKeys = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStartDate.value)
    day.setDate(weekStartDate.value.getDate() + index)
    return formatDateKey(day)
  })

  return dayKeys.map((key, index) => ({
    label: labels[index],
    count: normalizedBookings.value.filter(
      (booking) => formatDateKey(booking.bookingDate as Date) === key
    ).length,
  }))
})

const currentWeekTotal = computed(() => {
  return currentWeekSeries.value.reduce((sum, day) => sum + day.count, 0)
})

const previousWeekTotal = computed(() => {
  const previousWeekStart = new Date(weekStartDate.value)
  previousWeekStart.setDate(previousWeekStart.getDate() - 7)
  const previousWeekEnd = new Date(weekStartDate.value)
  previousWeekEnd.setDate(previousWeekEnd.getDate() - 1)

  return normalizedBookings.value.filter((booking) => {
    const date = booking.bookingDate as Date
    return date >= previousWeekStart && date <= previousWeekEnd
  }).length
})

const weekTrendText = computed(() => {
  const diff = currentWeekTotal.value - previousWeekTotal.value
  if (diff > 0) return `较上周 +${diff}`
  if (diff < 0) return `较上周 ${diff}`
  return '较上周持平'
})

const weekTrendBars = computed(() => {
  const maxCount = Math.max(...currentWeekSeries.value.map((day) => day.count), 1)
  return currentWeekSeries.value.map((day) => ({
    ...day,
    ratio: day.count / maxCount,
  }))
})

const cancelledCount = computed(() => {
  return bookingStore.bookings.filter((booking) => booking.status === 'cancelled').length
})

const cancelRate = computed(() => {
  if (!bookingStore.bookings.length) return '0%'
  const rate = (cancelledCount.value / bookingStore.bookings.length) * 100
  return `${rate.toFixed(1)}%`
})

const hotService = computed(() => {
  if (!bookingStore.bookings.length) {
    return { name: '暂无数据', count: 0, ratio: '0%' }
  }

  const serviceCountMap = bookingStore.bookings.reduce(
    (acc, booking) => {
      const name = booking.service.trim() || '未命名服务'
      acc[name] = (acc[name] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const topService = Object.entries(serviceCountMap).sort((a, b) => b[1] - a[1])[0]
  if (!topService) {
    return { name: '暂无数据', count: 0, ratio: '0%' }
  }

  const [name, count] = topService
  const ratio = ((count / bookingStore.bookings.length) * 100).toFixed(1)

  return {
    name,
    count,
    ratio: `${ratio}%`,
  }
})
</script>

<template>
  <div class="stats-grid">
    <div class="stat-card">
      <p class="stat-label">今日预约数</p>
      <h3 class="stat-value">{{ todayCount }}</h3>
      <p class="stat-meta">仅统计当天预约日期</p>
    </div>

    <div class="stat-card">
      <p class="stat-label">本周趋势</p>
      <h3 class="stat-value">{{ currentWeekTotal }}</h3>
      <p class="stat-meta">{{ weekTrendText }}</p>
      <div class="trend-bars">
        <div
          v-for="day in weekTrendBars"
          :key="day.label"
          class="trend-item"
        >
          <div
            class="trend-bar"
            :style="{ height: `${Math.max(day.ratio * 100, 8)}%` }"
          />
          <span class="trend-label">{{ day.label }}</span>
        </div>
      </div>
    </div>

    <div class="stat-card">
      <p class="stat-label">取消率</p>
      <h3 class="stat-value">{{ cancelRate }}</h3>
      <p class="stat-meta">{{ cancelledCount }} / {{ bookingStore.bookings.length }} 笔已取消</p>
    </div>

    <div class="stat-card">
      <p class="stat-label">热门服务</p>
      <h3 class="stat-value service-name">{{ hotService.name }}</h3>
      <p class="stat-meta">{{ hotService.count }} 笔预约，占比 {{ hotService.ratio }}</p>
    </div>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  padding: 20px;
  border-radius: 16px;
  background: var(--color-surface);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
}

.stat-label {
  margin-bottom: 8px;
  color: var(--color-text-soft);
  font-size: 14px;
}

.stat-value {
  font-size: 30px;
  margin: 0;
}

.service-name {
  font-size: 24px;
  line-height: 1.3;
}

.stat-meta {
  margin: 8px 0 0;
  color: var(--color-text-soft);
  font-size: 13px;
}

.trend-bars {
  margin-top: 14px;
  height: 100px;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
  align-items: end;
}

.trend-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  height: 100%;
}

.trend-bar {
  width: 100%;
  min-height: 8px;
  border-radius: 8px 8px 4px 4px;
  background: linear-gradient(
    180deg,
    var(--color-primary-light, #f3b5ce) 0%,
    var(--color-primary, #ea7aa8) 100%
  );
}

.trend-label {
  font-size: 11px;
  color: var(--color-text-muted, #8a8086);
}
</style>