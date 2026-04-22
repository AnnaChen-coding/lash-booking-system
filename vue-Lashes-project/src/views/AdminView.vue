<script setup lang="ts">
import { useBookingStore } from '@/stores/booking'
import BookingTable from '@/components/admin/BookingTable.vue'
import BookingStats from '@/components/admin/BookingStats.vue'
import BookingFilter from '@/components/admin/BookingFilter.vue'
import AppSkeletonPulse from '@/components/common/AppSkeletonPulse.vue'
import { ref, computed } from 'vue'

const bookingStore = useBookingStore()
const filter = ref('all')

const filteredBookings = computed(() => {
  if (filter.value === 'all') {
    return bookingStore.bookings
  }

  return bookingStore.bookings.filter(
    booking => booking.status === filter.value
  )
})
</script>

<template>
  <section class="admin-page">
    <div class="container">
      <h1 class="admin-title">Admin Bookings</h1>

      <BookingStats />
      <BookingFilter v-model="filter" />

      <div
        v-if="bookingStore.bookingsLoading && bookingStore.bookings.length === 0"
        class="booking-list-skeleton"
        aria-busy="true"
        aria-label="Loading bookings"
      >
        <div
          v-for="i in 5"
          :key="i"
          class="sk-booking-card"
        >
          <div class="sk-booking-main">
            <AppSkeletonPulse
              v-for="j in 6"
              :key="j"
              height="13px"
              :width="j === 1 ? '36%' : `${Math.max(42, 88 - j * 7)}%`"
              class="sk-booking-line"
            />
          </div>
          <div class="sk-booking-aside">
            <AppSkeletonPulse
              height="40px"
              width="100%"
              radius="10px"
            />
            <AppSkeletonPulse
              height="40px"
              width="100%"
              radius="10px"
            />
          </div>
        </div>
      </div>

      <div
        v-else-if="filteredBookings.length > 0"
        class="table-wrap"
        :class="{ 'is-reloading': bookingStore.bookingsLoading }"
      >
        <BookingTable :bookings="filteredBookings" />
      </div>

      <div
        v-else
        class="empty-state"
      >
        No bookings found.
      </div>
    </div>
  </section>
</template>

<style scoped>
.admin-page {
  padding: 60px 20px;
}

.container {
  max-width: 900px;
  margin: 0 auto;
}

.admin-title {
  font-size: 32px;
  margin-bottom: 24px;
}

.empty-state {
  padding: 24px;
  border-radius: 16px;
  background: var(--color-surface);
  color: var(--color-text-soft);
}

.booking-list-skeleton {
  display: grid;
  gap: 16px;
}

.sk-booking-card {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 20px;
  border-radius: 16px;
  background: var(--color-surface);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
}

.sk-booking-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sk-booking-line {
  display: block;
}

.sk-booking-aside {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 140px;
}

.table-wrap {
  position: relative;
}

.table-wrap.is-reloading {
  pointer-events: none;
  opacity: 0.55;
}

.table-wrap.is-reloading::after {
  content: 'Updating…';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  background: rgba(255, 255, 255, 0.35);
  border-radius: 16px;
}
</style>
