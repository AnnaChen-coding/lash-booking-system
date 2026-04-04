<script setup lang="ts">
import { useBookingStore } from '@/stores/booking'
import BookingTable from '@/components/admin/BookingTable.vue'
import BookingStats from '@/components/admin/BookingStats.vue'
import BookingFilter from '@/components/admin/BookingFilter.vue'
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

      <BookingTable
        v-if="filteredBookings.length > 0"
        :bookings="filteredBookings"
      />

      <div v-else class="empty-state">
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
</style>
