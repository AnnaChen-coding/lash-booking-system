<script setup lang="ts">
import { computed } from 'vue'
import { useBookingStore } from '@/stores/booking'

const bookingStore = useBookingStore()

const totalBookings = computed(() => bookingStore.bookings.length)


const pendingBookings = computed(() => {
  return bookingStore.bookings.filter(booking => booking.status === 'pending').length
})

const confirmedBookings = computed(() => {
  return bookingStore.bookings.filter(booking => booking.status === 'confirmed').length
})

const cancelledBookings = computed(() => {
  return bookingStore.bookings.filter(booking => booking.status === 'cancelled').length
})
</script>

<template>
  <div class="stats-grid">
    <div class="stat-card">
      <p class="stat-label">Total</p>
      <h3 class="stat-value">{{ totalBookings }}</h3>
    </div>

    <div class="stat-card">
      <p class="stat-label">Pending</p>
      <h3 class="stat-value">{{ pendingBookings }}</h3>
    </div>

    <div class="stat-card">
      <p class="stat-label">Confirmed</p>
      <h3 class="stat-value">{{ confirmedBookings }}</h3>
    </div>

    <div class="stat-card">
      <p class="stat-label">Cancelled</p>
      <h3 class="stat-value">{{ cancelledBookings }}</h3>
    </div>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
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
  font-size: 28px;
  margin: 0;
}
</style>