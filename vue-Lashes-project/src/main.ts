import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/style/common.css'
import './assets/style/components.css'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { useBookingStore } from '@/stores/booking'
import { useReviewStore } from '@/stores/homereview'
import { useAuthStore } from '@/stores/auth'
import { isSupabaseConfigured } from '@/lib/supabase'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus)

const authStore = useAuthStore()
const bookingStore = useBookingStore()
const reviewStore = useReviewStore()

// 先启动数据拉取再 mount，便于首屏展示 bookingsLoading 骨架（hydrate 在首个 await 前会同步置 loading）
void (async () => {
  await authStore.bootstrapAuth()
  const loadAllBookings =
    !isSupabaseConfigured() || authStore.canAccessAdmin
  const bookingsPromise = loadAllBookings
    ? bookingStore.hydrateBookings()
    : Promise.resolve()
  const reviewsPromise = reviewStore.hydrateReviews()
  app.mount('#app')
  await Promise.all([bookingsPromise, reviewsPromise])
})()
