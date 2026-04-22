<script setup lang="ts">
import ServiceSelector from '@/components/booking/ServiceSelector.vue'
import TimePicker from '@/components/booking/TimePicker.vue'
import BookingForm from '@/components/booking/BookingForm.vue'
import ServiceAiHelper from '@/components/common/ServiceAiHelper.vue'
import { useBookingStore } from '@/stores/booking'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { BookingFormData } from '@/types/booking'
import { dispatchBookingSuccessNotification } from '@/services/bookingNotification'
import { ElMessage } from 'element-plus'

// --- 统一的状态管理 ---
// 使用一个响应式对象 bookingData 收集所有步骤的数据
const bookingData = ref<BookingFormData>({
  name: '',
  email: '',
  phone: '',
  service: '',
  date: '',
  time: '',
  notes: '',
})

const isSubmitting = ref(false)

const route = useRoute()
const router = useRouter()

const bookingStore = useBookingStore()

const buildConflictMessage = (date: string, time: string) => {
  const suggestions = bookingStore.recommendAvailableSlots(
    date,
    time,
    3,
    bookingData.value.service
  )
  if (!suggestions.length) {
    return 'This slot was just booked. No more slots are available on this date. Please choose another date.'
  }
  return `This slot was just booked. Suggested alternatives: ${suggestions.join(' / ')}`
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
  email: string
  phone: string
  notes: string
}) => {
  if (isSubmitting.value) return
  // 1. 合并最后一步的表单数据
  bookingData.value.name = value.name
  bookingData.value.email = value.email
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

  isSubmitting.value = true
  try {
    // 冲突校验前强制刷新当前日期缓存，避免把本地缓存当成绝对真相
    await bookingStore.loadTakenSlotsForDate(bookingData.value.date, { force: true })
    const alreadyBooked = bookingStore.isBooked(
      bookingData.value.date,
      bookingData.value.time,
      bookingData.value.service
    )

    if (alreadyBooked) {
      const selectedTime = bookingData.value.time
      bookingData.value.time = ''
      alert(buildConflictMessage(bookingData.value.date, selectedTime))
      return
    }

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
    const notifyResult = await dispatchBookingSuccessNotification({
      customerName: bookingData.value.name,
      customerEmail: bookingData.value.email,
      customerPhone: bookingData.value.phone,
      service: bookingData.value.service,
      date: bookingData.value.date,
      time: bookingData.value.time,
      notes: bookingData.value.notes,
      booking: created,
    })
    if (notifyResult.warnings.length) {
      alert(
        `Booking submitted, but notification flow partially failed: ${notifyResult.warnings.join('; ')}. Fallback channel is used automatically.`
      )
    }
    if (created.status === 'pending_payment') {
      bookingStore.setLastPaymentBooking(created)
      await router.push({
        name: 'bookingPay',
        params: { id: String(created.id) },
      })
    } else {
      bookingStore.setLastPaymentBooking(created)
      alert(
        'Booking submitted. The database does not support pending payment yet, so you will enter a frontend mock payment page (no DB write-back). Run supabase/migration_payment_flow.sql in Supabase for full flow.'
      )
      await router.push({
        name: 'bookingPay',
        params: { id: String(created.id) },
        query: { mock: '1' },
      })
    }
  } catch (e) {
    const message = e instanceof Error
      ? e.message
      : 'Booking submission failed, please try again later.'
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
  } finally {
    isSubmitting.value = false
  }
}
onMounted(() => {
  const serviceFromQuery = route.query.service

  if (typeof serviceFromQuery === 'string') {
    bookingData.value.service = serviceFromQuery
  }
})

const handleAiApplyService = (name: string) => {
  bookingData.value.service = name
  ElMessage.success(`Service updated: ${name}`)
}
</script>

<template>
  <section class="booking-page">
    <div class="booking-container">
      <div class="booking-header">
        <p class="booking-label">Appointment</p>
        <h1 class="booking-title">Book Your Beauty Session</h1>
        <p class="booking-description">
          Choose your service, date and time, then finish your booking in a few steps.
        </p>
      </div>

      <div class="booking-card">
        <div class="section-block">
          <h2 class="section-title">Step 1 · Choose a Service</h2>
          <ServiceSelector
            :service="bookingData.service"
            @update:service="val => bookingData.service = val"
          />
          <ServiceAiHelper @apply-service="handleAiApplyService" />
        </div>

        <div class="section-block">
          <TimePicker
            :service="bookingData.service"
            @select-time="handleTimeSelect"
          />
        </div>

        <el-card
          class="booking-summary-card"
          shadow="never"
          :class="{
            filled: bookingData.service || bookingData.date || bookingData.time
          }"
        >
          <template #header>
            <h3 class="summary-title">Your Selection</h3>
          </template>

          <el-descriptions
            :column="3"
            border
            size="large"
          >
            <el-descriptions-item label="Service">
              <span :class="{ pending: !bookingData.service }">
                {{ bookingData.service || 'Not selected yet' }}
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="Date">
              <span :class="{ pending: !bookingData.date }">
                {{ bookingData.date || 'Not selected yet' }}
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="Time">
              <span :class="{ pending: !bookingData.time }">
                {{ bookingData.time || 'Not selected yet' }}
              </span>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <div
          v-if="bookingData.service && bookingData.date && bookingData.time"
          class="form-block"
        >
          <h2 class="section-title">Step 3 · Your Details</h2>
          <BookingForm
            :service="bookingData.service"
            :date="bookingData.date"
            :time="bookingData.time"
            :submitting="isSubmitting"
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

.booking-summary-card {
  border-radius: 22px;
  border-color: var(--color-border);
  background: var(--color-bg-soft);
  transition: all 0.25s ease;
}

.booking-summary-card.filled {
  background: linear-gradient(
    135deg,
    var(--color-primary-soft),
    var(--color-bg-soft)
  );
  border-color: var(--color-primary-light);
}

.summary-title {
  margin: 0;
  font-size: 20px;
  font-family: var(--font-heading);
  color: var(--color-text);
}

:deep(.booking-summary-card .el-card__header) {
  border-bottom: none;
  padding-bottom: 6px;
}

:deep(.booking-summary-card .el-card__body) {
  padding-top: 8px;
}

:deep(.booking-summary-card .el-descriptions__label) {
  font-weight: 600;
  color: var(--color-text-muted);
}

:deep(.booking-summary-card .el-descriptions__content) {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--color-text);
}

.pending {
  color: var(--color-text-soft);
  font-weight: 400;
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

  :deep(.booking-summary-card .el-descriptions__body .el-descriptions__table) {
    display: block;
  }

  :deep(.booking-summary-card .el-descriptions__body tr) {
    display: grid;
    grid-template-columns: 1fr;
  }

  :deep(.booking-summary-card .el-descriptions__body td) {
    width: 100%;
  }
}
</style>
