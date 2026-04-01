<template>
  <form class="review-form" @submit.prevent="handleSubmit">
    <h3 class="form-title">Leave a Review</h3>

    <div class="form-group">
      <label for="name">Your Name</label>
      <input
        id="name"
        v-model="form.name"
        type="text"
        placeholder="Enter your name"
      />
    </div>

    <div class="form-group">
      <label for="rating">Rating</label>
      <select id="rating" v-model.number="form.rating">
        <option :value="5">5 Stars</option>
        <option :value="4">4 Stars</option>
        <option :value="3">3 Stars</option>
        <option :value="2">2 Stars</option>
        <option :value="1">1 Star</option>
      </select>
    </div>

    <div class="form-group">
      <label for="comment">Your Review</label>
      <textarea
        id="comment"
        v-model="form.comment"
        rows="5"
        placeholder="Share your experience..."
      ></textarea>
    </div>

    <button type="submit" class="submit-btn">
      Submit Review
    </button>
  </form>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

const emit = defineEmits<{
  (e: 'submit-review', data: {
    name: string
    rating: number
    comment: string
  }): void
}>()

const form = reactive({
  name: '',
  rating: 5,
  comment: '',
})

const handleSubmit = () => {
  emit('submit-review', {
  name: form.name,
  rating: form.rating,
  comment: form.comment,
})
}
</script>

<style scoped>
.review-form {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.05);
}

.form-title {
  font-size: 24px;
  font-family: var(--font-heading);
  color: var(--color-text);
  margin-bottom: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 18px;
}

.form-group label {
  font-size: 14px;
  color: var(--color-text);
  margin-bottom: 8px;
}

.form-group input,
.form-group select,
.form-group textarea {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 15px;
  font-family: inherit;
  color: var(--color-text);
  background: var(--color-bg);
  outline: none;
}

.form-group textarea {
  resize: vertical;
  min-height: 120px;
}

.submit-btn {
  width: 100%;
  border: none;
  border-radius: 12px;
  padding: 14px 18px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  background: var(--color-primary);
  color: white;
}
</style>