<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { ServiceItem } from '@/types/service'
// 定义组件接收的 props
const props =defineProps<{
    // 声明一个 prop：servicehandleBookNow
    // 父组件会传一个 service 进来
    // 类型是 ServiceItem（必须符合这个结构）
  service: ServiceItem
}>()

const router = useRouter()

const handleBookNow = () => {
  console.log('clicked')
  console.log(props.service.name)

  router.push({
    path: '/booking',
    query: {
      service: props.service.name,
    },
  })
}
</script>

<template>
  <div class="service-card">
    <div class="service-image">
      <picture>
        <source v-if="service.imageWebp" :srcset="service.imageWebp" type="image/webp" />
        <img :src="service.imageFallback || service.image" :alt="service.name" />
      </picture>
    </div>

    <div class="service-content">
      <p class="service-category">{{ service.category }}</p>
      <h3 class="service-title">{{ service.name }}</h3>
      <p class="service-description">{{ service.shortDescription }}</p>

      <div class="service-meta">
        <span>${{ service.price }}</span>
        <span>{{ service.duration }} min</span>
      </div>

      <button class="book-btn" @click="handleBookNow">Book Now</button>
    </div>
  </div>
</template>

<style scoped>
.service-card {
  background: var(--color-surface);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
}

.service-image img {
  width: 100%;
  height: 220px;
  object-fit: cover;
  display: block;
}

.service-content {
  padding: 20px;
}

.service-category {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-primary);
  margin-bottom: 8px;
}

.service-title {
  font-size: 24px;
  font-family: var(--font-heading);
  color: var(--color-text);
  margin-bottom: 10px;
}

.service-description {
  font-size: 15px;
  line-height: 1.6;
  color: var(--color-text-soft);
  margin-bottom: 16px;
}

.service-meta {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: var(--color-text);
  margin-bottom: 16px;
}

.book-btn {
  width: 100%;
  padding: 12px 16px;
  border: none;
  border-radius: 999px;
  background: var(--color-button);
  color: var(--color-button-text);
  font-size: 14px;
  cursor: pointer;

  transition: all 0.25s ease;
}

/* hover 状态 */
.book-btn:hover {
  background: var(--color-accent-hover);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

/* 点击时（更真实） */
.book-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}
</style>