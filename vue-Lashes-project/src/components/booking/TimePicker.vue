<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { timeSlots } from '@/data/timeSlots'
import { useBookingStore } from '@/stores/booking'
import { useRemoteBookingAvailability } from '@/lib/bookingRemotePolicy'
import { useAuthStore } from '@/stores/auth'

const props = withDefaults(
  defineProps<{
    /** 当前所选服务名（与 `services` 一致），用于按线路/技师数算可约时段 */
    service: string
    /** 与预约页汇总同步：父级清空时间（如冲突后）时清除本组件内选中态 */
    bookingTime?: string
  }>(),
  { bookingTime: '' }
)

// --- 事件定义 ---
const emit = defineEmits<{
  (e: 'select-time', value: { date: string; time: string }): void
}>()
// --- 状态与 Store ---
const bookingStore = useBookingStore()
const auth = useAuthStore()
const selectedDate = ref('')
const selectedTime = ref('')
const AUTO_REFRESH_MS = 15000
let timerId: number | null = null

const needsRemoteSlots = computed(
  () => useRemoteBookingAvailability() && !auth.canAccessAdmin
)

const dateMeta = computed(() => {
  const d = selectedDate.value
  if (!d) return null
  return bookingStore.takenSlotsMeta[d] ?? null
})

/** 不遮挡时段按钮：列表始终来自本地 timeSlots，占档状态随同步更新；文案说明「浏览 vs 提交前校验」 */
const slotHintText = computed(() => {
  if (!needsRemoteSlots.value) {
    return '本地预约时间预览（配置 VITE_API_BASE_URL 后将同步后端实时占用时段）。'
  }
  if (!selectedDate.value) {
    return '请选择日期后将自动同步该日占用时段。'
  }
  const m = dateMeta.value
  if (!m) {
    return '正在同步最新预约状态，可先浏览时段，最终可用性将在提交前校验。'
  }
  if (m.loading) {
    return '正在同步最新预约状态，可先浏览时段，最终可用性将在提交前校验。'
  }
  if (!m.known && m.lastError) {
    return '无法同步最新预约状态，提交前会再次校验。'
  }
  if (m.known && m.lastError) {
    return '本次刷新失败，仍显示上次成功同步的占用；提交前会再次校验。'
  }
  if (m.known && m.lastSuccessAt) {
    return `上次同步时间：${new Date(m.lastSuccessAt).toLocaleTimeString()}（后台会定期刷新；提交前仍会强制校验。）`
  }
  return '正在同步最新预约状态，可先浏览时段，最终可用性将在提交前校验。'
})

const canRefreshTakenSlots = () =>
  Boolean(selectedDate.value) &&
  useRemoteBookingAvailability() &&
  !auth.canAccessAdmin

const refreshSlotsForSelectedDate = async (force = false) => {
  if (!canRefreshTakenSlots() || !selectedDate.value) return
  const result = await bookingStore.loadTakenSlotsForDate(selectedDate.value, {
    force,
  })
  if (!result.ok) return
  if (
    selectedTime.value &&
    bookingStore.isBooked(
      selectedDate.value,
      selectedTime.value,
      props.service
    )
  ) {
    selectedTime.value = ''
    emit('select-time', { date: selectedDate.value, time: '' })
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

watch(
  () => selectedDate.value,
  (d, oldDate) => {
    if (d !== oldDate) {
      selectedTime.value = ''
      if (d) {
        emit('select-time', { date: d, time: '' })
      }
    }
    if (!d || !useRemoteBookingAvailability() || auth.canAccessAdmin) return
    bookingStore.getTakenSlotsMeta(d)
    void refreshSlotsForSelectedDate(true)
  },
  { immediate: true }
)

watch(
  () => props.bookingTime,
  (t) => {
    if (t !== '') return
    if (!selectedTime.value) return
    selectedTime.value = ''
  }
)

watch(
  () => props.service,
  () => {
    if (
      !selectedDate.value ||
      !selectedTime.value ||
      !bookingStore.isBooked(
        selectedDate.value,
        selectedTime.value,
        props.service
      )
    ) {
      return
    }
    selectedTime.value = ''
    emit('select-time', { date: selectedDate.value, time: '' })
  }
)

const handleSelectTime = (time: string) => {
  if (!selectedDate.value) return
  selectedTime.value = time
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
        {{ slotHintText }}
      </p>
      <p
        v-if="needsRemoteSlots && dateMeta && !dateMeta.known && (dateMeta.loading || dateMeta.lastError)"
        class="slot-warning"
      >
        当前列表为本地时段；占用状态需同步成功后才准确。提交前系统会再次向服务器校验。
      </p>

      <div class="time-slots">
        <el-button
          v-for="time in timeSlots"
          :key="time"
          class="time-btn"
          :class="{ selected: selectedTime === time }"
          :disabled="bookingStore.isBooked(selectedDate, time, props.service)"
          round
          @click="handleSelectTime(time)"
        >
          <span v-if="bookingStore.isBooked(selectedDate, time, props.service)">Booked</span>
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
  line-height: 1.55;
}

.slot-warning {
  margin: 0;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text);
  background: rgba(180, 120, 40, 0.12);
  border: 1px solid rgba(180, 120, 40, 0.35);
  border-radius: 12px;
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
