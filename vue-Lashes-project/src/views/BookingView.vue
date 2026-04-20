<script setup lang="ts">
import ServiceSelector from '@/components/booking/ServiceSelector.vue'
import TimePicker from '@/components/booking/TimePicker.vue'
import BookingForm from '@/components/booking/BookingForm.vue'
import { useBookingStore } from '@/stores/booking'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { BookingFormData } from '@/types/booking'

// --- 统一的状态管理 ---
// 使用一个响应式对象 bookingData 收集所有步骤的数据
const bookingData = ref<BookingFormData>({
  name: '',
  phone: '',
  service: '',
  date: '',
  time: '',
  notes: '',
})

const route = useRoute()
const router = useRouter()

const bookingStore = useBookingStore()

const buildConflictMessage = (date: string, time: string) => {
  const suggestions = bookingStore.recommendAvailableSlots(date, time, 3)
  if (!suggestions.length) {
    return '该时段刚被预约，当前日期已无可用时段，请切换日期后重试。'
  }
  return `该时段刚被预约，建议改约：${suggestions.join(' / ')}`
}

// --- 回调处理 ---
// 处理时间选择组件传回的 date 和 time
const handleTimeSelect = (value: { date: string; time: string }) => {
  bookingData.value.date = value.date
  bookingData.value.time = value.time
}
// 最终提交逻辑
const handleSubmitBooking = async (value: {
  name: string
  phone: string
  notes: string
}) => {
  // 1. 合并最后一步的表单数据
  bookingData.value.name = value.name
  bookingData.value.phone = value.phone
  bookingData.value.notes = value.notes
// 2. 最终校验：确保前两个步骤的信息也存在
  if (
    !bookingData.value.service ||
    !bookingData.value.date ||
    !bookingData.value.time
  ) {
    alert('Please select a service, date, and time first.')
    return
  }
  // 冲突校验前强制刷新当前日期缓存，避免把本地缓存当成绝对真相
  await bookingStore.loadTakenSlotsForDate(bookingData.value.date, { force: true })
  // 冲突校验：检查在提交瞬间该时段是否被他人占用（双重保险）
  const alreadyBooked = bookingStore.isBooked(
    bookingData.value.date,
    bookingData.value.time
  )

  if (alreadyBooked) {
    const selectedTime = bookingData.value.time
    bookingData.value.time = ''
    alert(buildConflictMessage(bookingData.value.date, selectedTime))
    return
  }
// 调用 API 层（经 Store）执行保存操作
  try {
    const created = await bookingStore.addBooking({
      id: Date.now(),
      name: bookingData.value.name,
      phone: bookingData.value.phone,
      service: bookingData.value.service,
      date: bookingData.value.date,
      time: bookingData.value.time,
      notes: bookingData.value.notes,
      status: 'pending_payment',
    })
    if (created.status === 'pending_payment') {
      bookingStore.setLastPaymentBooking(created)
      await router.push({
        name: 'bookingPay',
        params: { id: String(created.id) },
      })
    } else {
      bookingStore.setLastPaymentBooking(created)
      alert(
        '预约已提交。当前数据库尚未支持「待支付」状态，以下将进入前端模拟支付页（不回写数据库）。完整支付模拟请在 Supabase 执行 supabase/migration_payment_flow.sql。'
      )
      await router.push({
        name: 'bookingPay',
        params: { id: String(created.id) },
        query: { mock: '1' },
      })
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : '预约提交失败，请稍后重试'
    const isConflict = /已被预约|already booked|另选时间/i.test(message)
    if (isConflict) {
      const selectedTime = bookingData.value.time
      await bookingStore.loadTakenSlotsForDate(bookingData.value.date, { force: true })
      const latestMessage = buildConflictMessage(bookingData.value.date, selectedTime)
      bookingData.value.time = ''
      alert(latestMessage)
      return
    }
    alert(message)
  }
}
onMounted(() => {
  const serviceFromQuery = route.query.service

  if (typeof serviceFromQuery === 'string') {
    bookingData.value.service = serviceFromQuery
  }
})
</script>

<template>
  <section class="booking-page">
    <div class="booking-container">
      <div class="booking-header">
        <p class="booking-label">Appointment</p>
        <h1 class="booking-title">Book Your Beauty Session</h1>
        <p class="booking-description">
          Choose your service, select an available date and time, and complete
          your booking in a few simple steps.
        </p>
      </div>

      <div class="booking-card">
        <div class="section-block">
          <h2 class="section-title">Step 1 · Choose a Service</h2>
          <ServiceSelector
            :service="bookingData.service"
            @update:service="val => bookingData.service = val"
          />
        </div>

        <div class="section-block">
          <TimePicker @select-time="handleTimeSelect" />
        </div>

        <div
          class="booking-summary"
          :class="{
            filled: bookingData.service || bookingData.date || bookingData.time
          }"
        >
          <h3 class="summary-title">Your Selection</h3>

          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-label">Service</span>
              <span class="summary-value">
                {{ bookingData.service || 'Not selected yet' }}
              </span>
            </div>

            <div class="summary-item">
              <span class="summary-label">Date</span>
              <span class="summary-value">
                {{ bookingData.date || 'Not selected yet' }}
              </span>
            </div>

            <div class="summary-item">
              <span class="summary-label">Time</span>
              <span class="summary-value">
                {{ bookingData.time || 'Not selected yet' }}
              </span>
            </div>
          </div>
        </div>

        <div
          v-if="bookingData.service && bookingData.date && bookingData.time"
          class="form-block"
        >
          <h2 class="section-title">Step 3 · Your Details</h2>
          <BookingForm
            :service="bookingData.service"
            :date="bookingData.date"
            :time="bookingData.time"
            @submit-booking="handleSubmitBooking"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.booking-page {
  padding: 80px 20px;
  background: var(--color-bg);
}

.booking-container {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.booking-header {
  text-align: center;
  max-width: 700px;
  margin: 0 auto;
}

.booking-label {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--color-primary);
}

.booking-title {
  margin: 0 0 14px;
  font-size: 52px;
  line-height: 1.1;
  font-family: var(--font-heading);
  color: var(--color-text);
}

.booking-description {
  margin: 0;
  font-size: 16px;
  line-height: 1.7;
  color: var(--color-text-soft);
}

.booking-card {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 32px;
  border-radius: 28px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.05);
}

.section-block,
.form-block {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.section-title {
  margin: 0;
  font-size: 24px;
  font-family: var(--font-heading);
  color: var(--color-text);
}

.booking-summary {
  padding: 24px;
  border-radius: 22px;
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border);
  transition: all 0.25s ease;
}

.booking-summary.filled {
  background: linear-gradient(
    135deg,
    var(--color-primary-soft),
    var(--color-bg-soft)
  );
  border-color: var(--color-primary-light);
}

.summary-title {
  margin: 0 0 16px;
  font-size: 20px;
  font-family: var(--font-heading);
  color: var(--color-text);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.summary-label {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-text-muted);
}

.summary-value {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--color-text);
  word-break: break-word;
}

@media (max-width: 768px) {
  .booking-page {
    padding: 56px 16px;
  }

  .booking-card {
    padding: 22px;
    border-radius: 22px;
  }

  .booking-title {
    font-size: 38px;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
