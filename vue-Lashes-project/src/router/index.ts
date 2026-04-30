import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
} from 'vue-router'
import HomeView from '../views/HomeView.vue'
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
    component: () => import('../views/ServicesView.vue'),
  },
  {
    path: '/booking',
    name: 'booking',
    component: () => import('../views/BookingView.vue'),
  },
  {
    path: '/booking/pay/:id',
    name: 'bookingPay',
    component: () => import('../views/BookingPaymentView.vue'),
  },
  {
    path: '/booking/pay/:id/result',
    name: 'bookingPayResult',
    component: () => import('../views/BookingPaymentResultView.vue'),
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../views/AdminView.vue'),
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
