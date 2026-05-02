<script setup lang="ts">
import { handlePaymentCallback } from '@/lib/paymentCallback'
import { toError } from '@/lib/toError'
import { useBookingStore } from '@/stores/booking'
import type { BookingItem } from '@/types/booking'
import { computed, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const bookingStore = useBookingStore()

const orderId = computed(() => Number(route.params.id))
const mockMode = computed(() => route.query.mock === '1')
const paying = ref(false)
const methodChosen = ref<'alipay' | 'wechat' | null>(null)

/** 默认 0；需在 .env 设置 VITE_PAYMENT_SIMULATE_FAIL_PROB（如 0.2）才随机进失败页 */
const PAYMENT_SIMULATE_FAIL_PROB = Math.min(
  1,
  Math.max(0, Number(import.meta.env.VITE_PAYMENT_SIMULATE_FAIL_PROB) || 0)
)
// 模拟定时器
const simulateTimer = ref<ReturnType<typeof setTimeout> | null>(null)
// 计算预约
const booking = computed((): BookingItem | null => {
  // 获取订单ID
  const id = orderId.value
  // 如果订单ID不是数字，则返回null
  if (!Number.isFinite(id)) return null
  // 从预约列表中查找订单ID
  const fromList = bookingStore.bookings.find((b) => b.id === id)
  // 如果找到，则返回预约
  if (fromList) return fromList
  // 从最后一笔支付预约中查找订单ID
  const snap = bookingStore.lastPaymentBooking
  // 如果找到，则返回最后一笔支付预约
  if (snap?.id === id) return snap
  return null
})

// 卸载时清除定时器
onUnmounted(() => {
  // 如果模拟定时器存在，则清除定时器
  if (simulateTimer.value) clearTimeout(simulateTimer.value)
})

// 支付渠道
async function onPayChannel(channel: 'alipay' | 'wechat') {
  // 如果订单ID不是数字，或者正在支付，则返回
  if (!Number.isFinite(orderId.value) || paying.value) return
  // 获取预约
  const b = booking.value
  // 如果预约不存在，则返回
  if (!b) return
  // 如果预约状态不是待支付，或者模拟模式，则返回
  const payable = b.status === 'pending_payment' || mockMode.value
  if (!payable) return

  // 设置支付渠道
  methodChosen.value = channel
  // 设置正在支付状态
  paying.value = true

  // 设置模拟定时器
  simulateTimer.value = setTimeout(async () => {
    // 清除模拟定时器
    simulateTimer.value = null
    try {
      // 随机模拟失败
      const failed = Math.random() < PAYMENT_SIMULATE_FAIL_PROB
      // 如果失败，则跳转到失败页
      if (failed) {
        paying.value = false
        // 跳转到失败页
        await router.push({
          name: 'bookingPayResult',
          params: { id: String(orderId.value) },
          query: { ok: '0', channel, mock: mockMode.value ? '1' : '0' },
        })
        return
      }

      // 如果模拟模式，则设置预约状态为已支付
      if (mockMode.value) {
        // 旧数据库不支持 payment RPC 时，仅做前端演示。
        bookingStore.setLastPaymentBooking({
          ...b,
          status: 'paid',
        })
      } else {
        // 调用支付回调
        await handlePaymentCallback(orderId.value)
        bookingStore.setLastPaymentBooking({
          ...b,
          status: 'paid',
        })
        // 重新加载预约列表
        await bookingStore.hydrateBookings()
      }
      paying.value = false
      // 跳转到支付结果页
      await router.push({
        name: 'bookingPayResult',
        params: { id: String(orderId.value) },
        query: { ok: '1', channel, mock: mockMode.value ? '1' : '0' },
      })
    } catch (e) {
      paying.value = false
      alert(toError(e).message)
    }
  }, 1000)
}
</script>

<template>
  <section class="pay-page">
    <div class="pay-wrap">
      <p class="pay-label">订单支付（模拟）</p>
      <h1 class="pay-title">选择支付方式</h1>
      <p class="pay-desc">
        以下仅前端模拟：约 1 秒后触发「支付回调」
        <code class="inline">handlePaymentCallback(orderId)</code>
        ，将订单置为已支付。
      </p>
      <p v-if="PAYMENT_SIMULATE_FAIL_PROB > 0" class="hint-warn">
        已开启随机模拟失败（概率 {{ PAYMENT_SIMULATE_FAIL_PROB }}），用于测试失败页与重试。
      </p>
      <p v-if="mockMode" class="hint-warn">
        当前为降级演示模式：会展示支付成功/失败页面，但不会把数据库状态写为 paid。
      </p>

      <div v-if="booking" class="order-card">
        <h2 class="order-title">订单摘要</h2>
        <dl class="order-dl">
          <div>
            <dt>订单号</dt>
            <dd>{{ booking.id }}</dd>
          </div>
          <div>
            <dt>状态</dt>
            <dd class="status">{{ booking.status }}</dd>
          </div>
          <div>
            <dt>服务</dt>
            <dd>{{ booking.service }}</dd>
          </div>
          <div>
            <dt>时间</dt>
            <dd>{{ booking.date }} {{ booking.time }}</dd>
          </div>
        </dl>

        <div v-if="booking.status === 'pending_payment' || mockMode" class="channels">
          <button
            type="button"
            class="channel alipay"
            :disabled="paying"
            @click="onPayChannel('alipay')"
          >
            {{ paying && methodChosen === 'alipay' ? '支付中…' : '支付宝' }}
          </button>
          <button
            type="button"
            class="channel wechat"
            :disabled="paying"
            @click="onPayChannel('wechat')"
          >
            {{ paying && methodChosen === 'wechat' ? '支付中…' : '微信支付' }}
          </button>
        </div>
        <p v-else-if="booking.status === 'paid'" class="hint-done">
          该订单已支付，请到结果页或返回预约页。
        </p>
        <p v-else class="hint-warn">
          当前订单状态无需在此支付。
        </p>
      </div>

      <div v-else class="empty-card">
        <p>未找到订单信息。请先在预约页提交，或检查链接是否正确。</p>
        <router-link class="back-link" to="/booking">返回预约</router-link>
      </div>

      <router-link to="/booking" class="back-link subtle">← 返回预约</router-link>
    </div>
  </section>
</template>

<style scoped>
.pay-page {
  padding: 80px 20px;
  min-height: 60vh;
  background: var(--color-bg);
}

.pay-wrap {
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.pay-label {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--color-primary);
}

.pay-title {
  margin: 0;
  font-size: 36px;
  font-family: var(--font-heading);
  color: var(--color-text);
}

.pay-desc {
  margin: 0;
  font-size: 15px;
  line-height: 1.65;
  color: var(--color-text-soft);
}

.inline {
  font-size: 13px;
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--color-bg-soft);
}

.order-card,
.empty-card {
  padding: 28px;
  border-radius: 22px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.05);
}

.order-title {
  margin: 0 0 16px;
  font-size: 20px;
  font-family: var(--font-heading);
}

.order-dl {
  margin: 0 0 24px;
  display: grid;
  gap: 12px;
}

.order-dl dt {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
}

.order-dl dd {
  margin: 4px 0 0;
  font-size: 16px;
  color: var(--color-text);
}

.status {
  font-weight: 600;
  color: var(--color-primary);
}

.channels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.channel {
  padding: 16px 18px;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  color: #fff;
  transition: opacity 0.2s, transform 0.15s;
}

.channel:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.channel:not(:disabled):hover {
  transform: translateY(-1px);
}

.alipay {
  background: linear-gradient(135deg, #1677ff, #0958d9);
}

.wechat {
  background: linear-gradient(135deg, #07c160, #059a4b);
}

.hint-done,
.hint-warn {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-soft);
}

.back-link {
  text-align: center;
  font-weight: 600;
  color: var(--color-primary);
  text-decoration: none;
}

.back-link.subtle {
  font-weight: 500;
  font-size: 14px;
  color: var(--color-text-muted);
}

.empty-card p {
  margin: 0 0 16px;
  color: var(--color-text-soft);
  line-height: 1.6;
}
</style>
