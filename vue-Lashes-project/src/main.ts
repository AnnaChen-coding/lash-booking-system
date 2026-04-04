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

void (async () => {
  await authStore.bootstrapAuth()

  const loadAllBookings =
    !isSupabaseConfigured() || authStore.canAccessAdmin

  await Promise.all([
    loadAllBookings ? bookingStore.hydrateBookings() : Promise.resolve(),
    reviewStore.hydrateReviews(),
  ])

  app.mount('#app')
})()
