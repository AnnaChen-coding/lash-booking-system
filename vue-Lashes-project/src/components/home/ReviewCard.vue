<template>
  <article class="review-card">
    <div class="review-header">
      <h3 class="review-name">{{ review.name }}</h3>
      <p class="review-date">{{ review.date }}</p>
    </div>

    <p class="review-rating">
      {{ '★'.repeat(review.rating) }}
    </p>

    <p class="review-comment">
      {{ review.comment }}
    </p>
  </article>
</template>

<script setup lang="ts">
import type { ReviewItem } from '@/types/homereview'

defineProps<{
  review: ReviewItem
}>()
</script>

<style scoped>
.review-card {
  background: var(--color-surface);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.06);
  border: 1px solid var(--color-border);
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.review-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
}

.review-date {
  font-size: 14px;
  color: var(--color-text-muted);
}

.review-rating {
  font-size: 18px;
  margin-bottom: 14px;
}

.review-comment {
  font-size: 15px;
  line-height: 1.7;
  color: var(--color-text-soft);
}
</style>