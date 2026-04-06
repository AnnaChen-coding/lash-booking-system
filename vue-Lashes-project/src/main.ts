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

// void 的作用是：我知道这是个 Promise，但我这里不接它的返回值，我就想让它执行，执行完了就完事了。
void (async () => {
  await authStore.bootstrapAuth()
  // 如果 Supabase 没有配置，或者用户有管理员权限，则加载所有预约
  const loadAllBookings =
    !isSupabaseConfigured() || authStore.canAccessAdmin
  // 加载所有预约和评价
  await Promise.all([
    loadAllBookings ? bookingStore.hydrateBookings() : Promise.resolve(),
    reviewStore.hydrateReviews(), // 加载所有评价
  ])
  // 挂载应用
  app.mount('#app')
})()
