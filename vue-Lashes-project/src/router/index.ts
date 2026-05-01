import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
} from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { useAuthStore } from '@/stores/auth'

// 定义路由
const routes = [
  // 首页路由
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  // 服务列表路由
  {
    path: '/services',
    name: 'services',
    component: () => import('../views/ServicesView.vue'),
  },
  // 预约页面路由
  {
    path: '/booking',
    name: 'booking',
    component: () => import('../views/BookingView.vue'),
  },
  // 预约支付页面路由
  {
    path: '/booking/pay/:id',
    name: 'bookingPay',
    component: () => import('../views/BookingPaymentView.vue'),
  },
  // 预约支付结果页面路由
  {
    path: '/booking/pay/:id/result',
    name: 'bookingPayResult',
    component: () => import('../views/BookingPaymentResultView.vue'),
  },
  // 登录页面路由
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { guestOnly: true },
  },
  // 管理员页面路由
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../views/AdminView.vue'),
    meta: { requiresAdmin: true },
  },
]
// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach((to: RouteLocationNormalized) => {
  // 获取授权状态
  const auth = useAuthStore()

  if (to.meta.requiresAdmin) {
    // 如果需要管理员权限，则检查是否具有管理员权限
    if (!auth.canAccessAdmin) {
      // 如果未登录，则跳转到登录页面
      if (!auth.isAuthenticated) {
        return {
          name: 'login',
          query: { redirect: to.fullPath },
        }
      }
      // 如果已登录，则跳转到首页
      return { name: 'home' }
    }
  }

  // 如果需要访客权限，则检查是否具有管理员权限
  if (to.meta.guestOnly && auth.canAccessAdmin) {
    // 如果具有管理员权限，则跳转到首页
    const redirect =
      typeof to.query.redirect === 'string' && to.query.redirect.startsWith('/')
        ? to.query.redirect
        : '/'
    // 如果具有管理员权限，则跳转到首页
    return redirect
  }

  return true
})

// 导出路由实例
export default router
