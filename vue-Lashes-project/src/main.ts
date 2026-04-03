import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/style/common.css'
import './assets/style/components.css'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { useBookingStore } from './stores/booking'
import { useReviewStore } from './stores/homereview'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus)

const bookingStore = useBookingStore()
const reviewStore = useReviewStore()
void Promise.all([bookingStore.hydrateBookings(), reviewStore.hydrateReviews()])

app.mount('#app')
