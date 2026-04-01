<script setup lang="ts">
import { ref } from 'vue'
import { timeSlots } from '@/data/timeSlots'
import { useBookingStore } from '@/stores/booking'

const emit = defineEmits<{
  (e: 'select-time', value: { date: string; time: string }): void
}>()

const bookingStore = useBookingStore()

const selectedDate = ref('')
const selectedTime = ref('')

const handleSelectTime = (time: string) => {
  if (!selectedDate.value) return

  selectedTime.value = time

  emit('select-time', {
    date: selectedDate.value,
    time,
  })
}
</script>

<template>
  <div class="time-picker">
    <div class="section-heading">
      <p class="section-label">Step 2</p>
      <h2>Select Date & Time</h2>
      <p class="section-text">
        Choose your preferred appointment date and an available time slot.
      </p>
    </div>

    <div class="date-box">
      <label class="input-label">Appointment Date</label>
      <input v-model="selectedDate" type="date" class="date-input" />
    </div>

    <div v-if="selectedDate" class="slots-wrapper">
      <p class="slot-title">Available Time Slots</p>

      <div class="time-slots">
        <button
          v-for="time in timeSlots"
          :key="time"
          class="time-btn"
          :class="{ selected: selectedTime === time }"
          :disabled="bookingStore.isBooked(selectedDate, time)"
          @click="handleSelectTime(time)"
        >
          <span v-if="bookingStore.isBooked(selectedDate, time)">Booked</span>
          <span v-else>{{ time }}</span>
        </button>
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
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  font-size: 15px;
  font-family: inherit;
  background: #fff;
  color: var(--color-text);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.date-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(111, 134, 111, 0.12);
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

.time-slots {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.time-btn {
  padding: 14px 12px;
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  background: var(--color-button-soft);
  color: var(--color-text);
  font-size: 14px;
  font-weight: 500;
  transition:
    transform 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.time-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  background: var(--color-button);
  color: var(--color-button-text);
}

.time-btn.selected {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
  box-shadow: 0 8px 18px rgba(111, 134, 111, 0.18);
}

.time-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  background: #ece9e4;
  color: #8e8a84;
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