<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const ok = computed(() => route.query.ok === '1')
const mockMode = computed(() => route.query.mock === '1')
const orderId = computed(() => route.params.id)
const channel = computed(() => {
  const c = route.query.channel
  return typeof c === 'string' && c ? c : null
})

const channelLabel = computed(() => {
  if (channel.value === 'alipay') return '支付宝'
  if (channel.value === 'wechat') return '微信支付'
  return null
})
</script>

<template>
  <section class="result-page">
    <div class="result-card" :class="{ fail: !ok }">
      <div class="icon-wrap" aria-hidden="true">
        <span v-if="ok" class="icon ok">✅</span>
        <span v-else class="icon bad">❌</span>
      </div>
      <h1 class="result-title">
        {{ ok ? '支付成功' : '支付失败' }}
      </h1>
      <p v-if="ok" class="result-desc">
        订单 <strong>#{{ orderId }}</strong>
        <template v-if="mockMode">
          已完成前端模拟支付（当前数据库未写回 <code>paid</code>）。
        </template>
        <template v-else>
          已通过模拟回调更新为 <code>paid</code>。
        </template>
        <span v-if="channelLabel">（{{ channelLabel }}）</span>
      </p>
      <p v-else class="result-desc">
        本次为随机模拟失败，订单仍为 <code>pending_payment</code>，可返回支付页重试。
        <span v-if="channelLabel">（{{ channelLabel }}）</span>
      </p>
      <div class="actions">
        <router-link v-if="!ok" class="btn primary" :to="`/booking/pay/${orderId}`">
          重新支付
        </router-link>
        <router-link class="btn" to="/booking">返回预约</router-link>
      </div>
    </div>
  </section>
</template>

<style scoped>
.result-page {
  padding: 80px 20px;
  min-height: 60vh;
  background: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-card {
  max-width: 440px;
  padding: 40px 32px;
  border-radius: 24px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.06);
  text-align: center;
}

.result-card.fail {
  border-color: rgba(220, 80, 80, 0.35);
}

.icon-wrap {
  margin-bottom: 16px;
}

.icon {
  font-size: 48px;
  line-height: 1;
}

.result-title {
  margin: 0 0 14px;
  font-size: 28px;
  font-family: var(--font-heading);
  color: var(--color-text);
}

.result-desc {
  margin: 0 0 28px;
  font-size: 15px;
  line-height: 1.65;
  color: var(--color-text-soft);
}

.result-desc code {
  font-size: 13px;
  padding: 2px 8px;
  border-radius: 8px;
  background: var(--color-bg-soft);
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn {
  display: block;
  padding: 14px 20px;
  border-radius: 14px;
  text-align: center;
  font-weight: 600;
  text-decoration: none;
  color: var(--color-text);
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border);
}

.btn.primary {
  background: var(--color-primary);
  color: #fff;
  border-color: transparent;
}
</style>
