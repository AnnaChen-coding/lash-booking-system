import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
} from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ServicesView from '../views/ServicesView.vue'
import BookingView from '../views/BookingView.vue'
import BookingPaymentView from '../views/BookingPaymentView.vue'
import BookingPaymentResultView from '../views/BookingPaymentResultView.vue'
import AdminView from '../views/AdminView.vue'
import LoginView from '../views/LoginView.vue'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/services',
    name: 'services',
    component: ServicesView,
  },
  {
    path: '/booking',
    name: 'booking',
    component: BookingView,
  },
  {
    path: '/booking/pay/:id',
    name: 'bookingPay',
    component: BookingPaymentView,
  },
  {
    path: '/booking/pay/:id/result',
    name: 'bookingPayResult',
    component: BookingPaymentResultView,
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { guestOnly: true },
  },
  {
    path: '/admin',
    name: 'admin',
    component: AdminView,
    meta: { requiresAdmin: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to: RouteLocationNormalized) => {
  const auth = useAuthStore()

  if (to.meta.requiresAdmin) {
    if (!auth.canAccessAdmin) {
      if (!auth.isAuthenticated) {
        return {
          name: 'login',
          query: { redirect: to.fullPath },
        }
      }
      return { name: 'home' }
    }
  }

  if (to.meta.guestOnly && auth.canAccessAdmin) {
    const redirect =
      typeof to.query.redirect === 'string' && to.query.redirect.startsWith('/')
        ? to.query.redirect
        : '/'
    return redirect
  }

  return true
})

export default router
