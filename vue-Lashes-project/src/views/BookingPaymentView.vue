<script setup lang="ts">
import { handlePaymentCallback } from '@/lib/paymentCallback'
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

/** 约 20% 概率模拟渠道失败（无回调、不改库） */
const PAYMENT_FAIL_PROB = 0.2
const simulateTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const booking = computed((): BookingItem | null => {
  const id = orderId.value
  if (!Number.isFinite(id)) return null
  const fromList = bookingStore.bookings.find((b) => b.id === id)
  if (fromList) return fromList
  const snap = bookingStore.lastPaymentBooking
  if (snap?.id === id) return snap
  return null
})

onUnmounted(() => {
  if (simulateTimer.value) clearTimeout(simulateTimer.value)
})

async function onPayChannel(channel: 'alipay' | 'wechat') {
  if (!Number.isFinite(orderId.value) || paying.value) return
  const b = booking.value
  if (!b) return
  const payable = b.status === 'pending_payment' || mockMode.value
  if (!payable) return

  methodChosen.value = channel
  paying.value = true

  simulateTimer.value = setTimeout(async () => {
    simulateTimer.value = null
    try {
      const failed = Math.random() < PAYMENT_FAIL_PROB
      if (failed) {
        paying.value = false
        await router.push({
          name: 'bookingPayResult',
          params: { id: String(orderId.value) },
          query: { ok: '0', channel, mock: mockMode.value ? '1' : '0' },
        })
        return
      }

      if (mockMode.value) {
        // 旧数据库不支持 payment RPC 时，仅做前端演示。
        bookingStore.setLastPaymentBooking({
          ...b,
          status: 'paid',
        })
      } else {
        await handlePaymentCallback(orderId.value)
        bookingStore.setLastPaymentBooking({
          ...b,
          status: 'paid',
        })
        await bookingStore.hydrateBookings()
      }
      paying.value = false
      await router.push({
        name: 'bookingPayResult',
        params: { id: String(orderId.value) },
        query: { ok: '1', channel, mock: mockMode.value ? '1' : '0' },
      })
    } catch (e) {
      paying.value = false
      alert(e instanceof Error ? e.message : '支付处理失败')
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
