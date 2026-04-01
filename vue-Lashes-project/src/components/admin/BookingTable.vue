<script setup lang="ts">
import { useBookingStore } from '@/stores/booking'
import type { BookingItem } from '@/types/booking'

const bookingStore = useBookingStore()

const handleDelete = (id: number) => {
  bookingStore.removeBooking(id)
}
const props = defineProps<{
  bookings: BookingItem[]
}>()

const handleStatusChange = (id: number, event: Event) => {
  const target = event.target as HTMLSelectElement
  bookingStore.updateStatus(
    id,
    target.value as 'pending' | 'confirmed' | 'cancelled'
  )
}
</script>

<template>
  <div class="booking-list">
    <div
      v-for="booking in props.bookings"
      :key="booking.id"
      class="booking-card"
    >
      <div class="booking-info">
        <p><strong>Name:</strong> {{ booking.name }}</p>
        <p><strong>Phone:</strong> {{ booking.phone }}</p>
        <p><strong>Service:</strong> {{ booking.service }}</p>
        <p><strong>Date:</strong> {{ booking.date }}</p>
        <p><strong>Time:</strong> {{ booking.time }}</p>
        <p><strong>Notes:</strong> {{ booking.notes || 'No notes' }}</p>
        <p><strong>Status:</strong> {{ booking.status }}</p>
      </div>

      <div class="booking-actions">
        <select
          :value="booking.status"
          @change="handleStatusChange(booking.id, $event)"
        >
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <button class="delete-btn" @click="handleDelete(booking.id)">
          Delete
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.booking-list {
  display: grid;
  gap: 16px;
}

.booking-card {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 20px;
  border-radius: 16px;
  background: var(--color-surface);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
}

.booking-info {
  flex: 1;
}

.booking-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 140px;
}

.booking-actions select {
  padding: 10px 12px;
  border-radius: 10px;
}

.delete-btn {
  padding: 10px 12px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
}
</style>