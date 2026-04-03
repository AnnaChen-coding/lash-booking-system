import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ReviewItem } from '@/types/homereview'
import { createReview, fetchReviews } from '@/api/reviews'

export const useReviewStore = defineStore('review', () => {
  const reviews = ref<ReviewItem[]>([])

  const hydrateReviews = async () => {
    reviews.value = await fetchReviews()
  }

  const addReview = async (
    data: Pick<ReviewItem, 'name' | 'rating' | 'comment'>
  ) => {
    const created = await createReview(data)
    reviews.value.unshift(created)
  }

  return {
    reviews,
    hydrateReviews,
    addReview,
  }
})
