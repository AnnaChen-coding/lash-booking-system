<template>
  <section class="review-section">
    <div class="container">
      <p class="section-subtitle">Client Reviews</p>
      <h2 class="section-title">What Our Clients Are Saying</h2>

      <div class="review-list">
        <ReviewCard
          v-for="item in reviewStore.reviews"
          :key="item.id"
          :review="item"
        />
      </div>

      <div class="review-form-wrapper">
        <ReviewForm @submit-review="handleAddReview" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useReviewStore } from '@/stores/homereview'
import ReviewCard from './ReviewCard.vue'
import ReviewForm from './ReviewForm.vue'

const reviewStore = useReviewStore()

const handleAddReview = (data: {
  name: string
  rating: number
  comment: string
}) => {
  void reviewStore.addReview(data)
}
</script>

<style scoped>
.review-section {
  padding: 80px 0;
  background: var(--color-bg-soft);
}

.section-subtitle {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--color-primary);
  margin-bottom: 12px;
  text-align: center;
}

.section-title {
  font-size: 40px;
  font-family: var(--font-heading);
  color: var(--color-text);
  text-align: center;
  margin-bottom: 48px;
}

.review-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 40px;
}

.review-form-wrapper {
  max-width: 720px;
  margin: 0 auto;
}
</style>
