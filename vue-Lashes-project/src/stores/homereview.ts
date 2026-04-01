import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ReviewItem {
  id: number
  name: string
  rating: number
  comment: string
}

const initialReviews: ReviewItem[] = [
  {
    id: 1,
    name: 'Sophia',
    rating: 5,
    comment: 'Amazing service and such a relaxing experience!'
  },
  {
    id: 2,
    name: 'Emma',
    rating: 4,
    comment: 'Loved my nails, very clean and elegant design.'
  }
]

function loadReviews(): ReviewItem[] {
  try {
    const saved = localStorage.getItem('reviews')
    return saved ? JSON.parse(saved) : initialReviews
  } catch (error) {
    return initialReviews
  }
}

export const useReviewStore = defineStore('review', () => {
  const reviews = ref<ReviewItem[]>(loadReviews())

  const saveReviews = () => {
    localStorage.setItem('reviews', JSON.stringify(reviews.value))
  }

  const addReview = (data: Omit<ReviewItem, 'id'>) => {
    const newReview: ReviewItem = {
      id: Date.now(),
      ...data
    }

    reviews.value.unshift(newReview)
    saveReviews()
  }

  return {
    reviews,
    addReview
  }
})