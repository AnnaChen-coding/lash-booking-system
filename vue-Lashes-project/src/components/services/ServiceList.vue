<script setup lang="ts">
// 1. 拿数据
import { services } from '@/data/services'
import ServiceDetailCard from './ServiceDetailCard.vue'
import ServiceFilter from './ServiceFilter.vue'
import {ref, computed} from 'vue'
// 当前选中的分类（响应式）
// 'all' 表示默认显示全部服务
const currentCategory = ref('all')
// 分类切换函数（事件处filteredServices理)
// 子组件（ServiceFilter）会通过 emit 调用这个函数
// 当用户点击分类按钮时，会把 category 传进来
const handleCategoryChange = (category: string) => {
    // 更新当前分类 （ref 必须用 .value 修改)
  currentCategory.value = category
}
// 计算属性：根据分类过滤服务
// computed = “自动计算 + 自动更新”
const filteredServices = computed(() => {
    // 依赖 currentCategory，当它变化时，这里会自动重新执行
  if (currentCategory.value === 'all') {
    return services
  }
// filter：遍历 services，返回符合条件的新数组
// 只保留 category === 当前选中的分类
  return services.filter(service => service.category === currentCategory.value)
})
</script>

<template>
  <section class="services-page">
    <div class="container">
      <p class="section-subtitle">Our Services</p>
      <h2 class="section-title">Treat Yourself to Luxury Care</h2>
      <p class="section-description">
        Explore our full range of nail and lash services, designed to bring out your confidence and style.
      </p>
      <ServiceFilter
        :current-category="currentCategory"
        @change-category="handleCategoryChange"
      />

      <div class="services-grid">
        <ServiceDetailCard
          v-for="service in filteredServices"
          :key="service.id"
          :service="service"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.services-page {
  padding: 80px 0;
}

.section-subtitle {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--color-primary);
  margin-bottom: 12px;
  text-align: center;
}

.section-title {
  font-size: 40px;
  font-family: var(--font-heading);
  color: var(--color-text);
  text-align: center;
  margin-bottom: 16px;
}

.section-description {
  max-width: 680px;
  margin: 0 auto 48px;
  text-align: center;
  font-size: 16px;
  line-height: 1.7;
  color: var(--color-text-soft);
}

.services-grid {
  margin-top: 40px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
</style>