import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/style/common.css'
import './assets/style/components.css'
import 'element-plus/es/components/message/style/css'
import { useBookingStore } from '@/stores/booking'
import { useReviewStore } from '@/stores/homereview'
import { useAuthStore } from '@/stores/auth'
import { isSupabaseConfigured } from '@/lib/supabase'
import heroFirstWebp from '@/assets/image/hero/background.webp'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const preloadHeroImage = () => {
  const existing = document.querySelector('link[data-hero-preload="true"]')
  if (existing) return
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'image'
  link.href = heroFirstWebp
  link.type = 'image/webp'
  link.setAttribute('fetchpriority', 'high')
  link.setAttribute('data-hero-preload', 'true')
  document.head.appendChild(link)
}

const authStore = useAuthStore()
const bookingStore = useBookingStore()
const reviewStore = useReviewStore()

preloadHeroImage()
app.mount('#app')

// 数据改为挂载后异步拉取，避免阻塞首屏渲染。
void (async () => {
  await authStore.bootstrapAuth()
  const loadAllBookings =
    !isSupabaseConfigured() || authStore.canAccessAdmin
  const bookingsPromise = loadAllBookings
    ? bookingStore.hydrateBookings()
    : Promise.resolve()
  const reviewsPromise = reviewStore.hydrateReviews()
  await Promise.all([bookingsPromise, reviewsPromise])
})()
