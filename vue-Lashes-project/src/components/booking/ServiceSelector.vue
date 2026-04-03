<script setup lang="ts">
import { services } from '@/data/services'
// -- 属性定义 (Props) ---
// 接收一个名为 service 的 string，代表当前被选中的服务名称
const props = defineProps<{
  service: string
}>()
// --- 事件定义 (Emits) ---
// 使用 update: 前缀是 Vue 3 v-model 的语法糖标准写法
// 当点击按钮时，会触发此事件通知父组件更新数据
const emit = defineEmits<{
  (e: 'update:service', value: string): void
}>()
</script>

<template>
  <div class="service-selector">
    <!-- 动态类名：如果当前项的名称等于 Props 传入的名称，则应用 .active 样式 -->
     <!-- 点击时向父组件发送最新的服务名称 -->
    <button
      v-for="item in services"
      :key="item.id"
      class="service-card"
      :class="{ active: props.service === item.name }"
      @click="emit('update:service', item.name)"
    >
      <span class="service-title">{{ item.name }}</span>
      <span class="service-desc">{{ item.shortDescription }}</span>
    </button>
  </div>
</template>

<style scoped>
.service-selector {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.service-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  text-align: left;

  padding: 18px 20px;
  border: 1px solid var(--color-border);
  border-radius: 18px;
  background: var(--color-surface);
  cursor: pointer;

  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;
}

.service-card:hover {
  transform: translateY(-2px);
  border-color: var(--color-primary-light);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
}

.service-card.active {
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
  box-shadow: 0 10px 24px rgba(111, 134, 111, 0.12);
}

.service-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.4;
}

.service-desc {
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text-soft);
}

@media (max-width: 900px) {
  .service-selector {
    grid-template-columns: 1fr;
  }
}
</style>