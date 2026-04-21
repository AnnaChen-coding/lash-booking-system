<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { timeSlots } from '@/data/timeSlots'
import { useBookingStore } from '@/stores/booking'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

// --- 事件定义 ---
const emit = defineEmits<{
  (e: 'select-time', value: { date: string; time: string }): void
}>()
// --- 状态与 Store ---
// 实例化 Store
const bookingStore = useBookingStore()
const auth = useAuthStore()
// 存储用户选中的日期
const selectedDate = ref('')
const selectedTime = ref('')
const isRefreshing = ref(false)
const lastRefreshedAt = ref<Date | null>(null)
const AUTO_REFRESH_MS = 15000
let timerId: number | null = null

const lastRefreshedText = computed(() => {
  if (!lastRefreshedAt.value) return 'Loading available slots...'
  return `Last refresh: ${lastRefreshedAt.value.toLocaleTimeString()}`
})

const canRefreshTakenSlots = () =>
  Boolean(selectedDate.value) && isSupabaseConfigured() && !auth.canAccessAdmin

const refreshSlotsForSelectedDate = async (force = false) => {
  if (!canRefreshTakenSlots() || !selectedDate.value) return
  isRefreshing.value = true
  try {
    await bookingStore.loadTakenSlotsForDate(selectedDate.value, { force })
    if (
      selectedTime.value &&
      bookingStore.isBooked(selectedDate.value, selectedTime.value)
    ) {
      selectedTime.value = ''
      emit('select-time', { date: selectedDate.value, time: '' })
    }
    lastRefreshedAt.value = new Date()
  } finally {
    isRefreshing.value = false
  }
}

const startAutoRefresh = () => {
  if (timerId !== null) return
  timerId = window.setInterval(() => {
    void refreshSlotsForSelectedDate(true)
  }, AUTO_REFRESH_MS)
}

const stopAutoRefresh = () => {
  if (timerId === null) return
  window.clearInterval(timerId)
  timerId = null
}

// 监听用户选中的日期，如果日期为空或未配置 Supabase 或管理员，则不加载已占时段
watch(
  // 监听 selectedDate.value 的变化
  () => selectedDate.value,

  (d, oldDate) => {
    if (d !== oldDate) {
      selectedTime.value = ''
      if (d) {
        emit('select-time', { date: d, time: '' })
      }
    }
    // 如果日期为空或未配置 Supabase 或管理员，则不加载已占时段
    if (!d || !isSupabaseConfigured() || auth.canAccessAdmin) return
    // 否则调用 Store 的方法，加载已占时段
    void refreshSlotsForSelectedDate(true)
  },
  // 立即执行
  { immediate: true }
)
// --- 逻辑处理 ---
const handleSelectTime = (time: string) => {
  // 如果还没选日期，不允许选时间
  if (!selectedDate.value) return

  selectedTime.value = time
// 将选中的日期和时间打包发送给父组件
  emit('select-time', {
    date: selectedDate.value,
    time,
  })
}

onMounted(() => {
  startAutoRefresh()
})

onBeforeUnmount(() => {
  stopAutoRefresh()
})
</script>

<template>
  <div class="time-picker">
    <div class="section-heading">
      <p class="section-label">Step 2</p>
      <h2>Select Date & Time</h2>
      <p class="section-text">
        Choose your preferred date and an available time slot.
      </p>
    </div>

    <div class="date-box">
      <label class="input-label">Appointment Date</label>
      <el-date-picker
        v-model="selectedDate"
        type="date"
        value-format="YYYY-MM-DD"
        format="YYYY-MM-DD"
        placeholder="Select date"
        class="date-input"
      />
    </div>

    <div v-if="selectedDate" class="slots-wrapper">
      <p class="slot-title">Available Time Slots</p>
      <p class="slot-hint">
        {{ isRefreshing ? 'Refreshing...' : lastRefreshedText }}
      </p>

      <div class="time-slots">
         <!-- 1. 高亮：当前选中的时间  -->
          <!-- 2. 禁用：调用 Store 的方法，检查该日期下的该时间是否已被占领 -->
           <!-- 条件渲染 -->
        <el-button
          v-for="time in timeSlots"
          :key="time"
          class="time-btn"
          :class="{ selected: selectedTime === time }"
          :disabled="bookingStore.isBooked(selectedDate, time)"
          round
          @click="handleSelectTime(time)"
        >
          <span v-if="bookingStore.isBooked(selectedDate, time)">Booked</span>
          <span v-else>{{ time }}</span>
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.time-picker {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 28px;
  border-radius: 24px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.05);
}

.section-heading {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-label {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--color-primary);
  margin: 0;
}

.section-heading h2 {
  font-size: 30px;
  font-family: var(--font-heading);
  color: var(--color-text);
  margin: 0;
}

.section-text {
  margin: 0;
  font-size: 15px;
  color: var(--color-text-soft);
  line-height: 1.6;
}

.date-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.date-input {
  width: 100%;
}

.slots-wrapper {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.slot-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.slot-hint {
  margin: -6px 0 0;
  font-size: 13px;
  color: var(--color-text-soft);
}

.time-slots {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.time-btn {
  margin: 0;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 500;
  justify-self: stretch;
}

.time-btn.selected {
  background: var(--color-primary) !important;
  color: white;
  border-color: var(--color-primary) !important;
  box-shadow: 0 8px 18px rgba(111, 134, 111, 0.18) !important;
}

:deep(.date-input .el-input__wrapper) {
  border-radius: 14px;
  min-height: 46px;
}

:deep(.time-btn.el-button) {
  width: 100%;
}

:deep(.time-btn.el-button:disabled) {
  opacity: 0.65;
}

@media (max-width: 768px) {
  .time-slots {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .time-picker {
    padding: 20px;
  }

  .section-heading h2 {
    font-size: 24px;
  }

  .time-slots {
    grid-template-columns: 1fr;
  }
}
</style>
