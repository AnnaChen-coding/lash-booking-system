<template>
  <section class="review-section">
    <div class="container">
      <p class="section-subtitle">Client Reviews</p>
      <h2 class="section-title">What Our Clients Are Saying</h2>

      <div class="review-list">
        <ReviewCard
          v-for="item in reviews"
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
import { ref } from 'vue'
import type { ReviewItem } from '@/types/homereview'
import { initialReviews } from '@/data/homereviews'
import ReviewCard from './ReviewCard.vue'
import ReviewForm from './ReviewForm.vue'


// 响应式reviews（1. 管理）
const reviews = ref(loadReviews())
// 从 localStorage 读取评论数据
function loadReviews() {
  const saved = localStorage.getItem('reviews')

  if (saved) {
    return JSON.parse(saved)
  }

  return initialReviews
}
// 处理“新增评论”的函数
// 这个函数会被子组件 ReviewForm 通过 emit 调用
const handleAddReview = (data: {
  name: string
  rating: number
  comment: string
}) => {
  const newReview: ReviewItem = {
    id: Date.now(),
    name: data.name,
    rating: data.rating,
    comment: data.comment,
    date: new Date().toISOString().split('T')[0] || '',
  }

  reviews.value.unshift(newReview)
  saveReviews()
}
// 把当前 reviews 存到浏览器本地缓存
function saveReviews() {
  localStorage.setItem('reviews', JSON.stringify(reviews.value))
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