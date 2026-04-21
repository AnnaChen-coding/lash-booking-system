<script setup lang="ts">
import { services } from '@/data/services'
import { SCHEDULE_LINES } from '@/data/scheduleConfig'
import type { ServiceItem } from '@/types/service'

const scheduleHint = (category: ServiceItem['category']) => {
  const c = SCHEDULE_LINES[category]
  return `${c.technicianCount} techs · ~${c.serviceDurationMinutes} min + ${c.bufferMinutes} min buffer`
}
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

const selectService = (serviceName: string) => {
  emit('update:service', serviceName)
}
</script>

<template>
  <div class="service-selector">
    <el-card
      v-for="item in services"
      :key="item.id"
      class="service-card"
      :class="{ active: props.service === item.name }"
      shadow="hover"
    >
      <div class="service-content">
        <span class="service-title">{{ item.name }}</span>
        <span class="service-desc">{{ item.shortDescription }}</span>
        <span class="service-schedule">{{ scheduleHint(item.category) }}</span>
      </div>

      <template #footer>
        <el-button
          class="service-btn"
          :type="props.service === item.name ? 'primary' : 'default'"
          round
          @click="selectService(item.name)"
        >
          {{ props.service === item.name ? 'Selected' : 'Choose this service' }}
        </el-button>
      </template>
    </el-card>
  </div>
</template>

<style scoped>
.service-selector {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.service-card {
  border-color: var(--color-border);
  border-radius: 18px;
  background: var(--color-surface);
}

.service-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  text-align: left;
  min-height: 94px;
}

.service-card.active {
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
  box-shadow: 0 10px 24px rgba(111, 134, 111, 0.12);
}

:deep(.service-card .el-card__body) {
  padding: 18px 20px 14px;
}

:deep(.service-card .el-card__footer) {
  border-top: none;
  padding: 0 20px 18px;
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

.service-schedule {
  font-size: 12px;
  line-height: 1.45;
  color: var(--color-text-muted);
  font-weight: 500;
}

.service-btn {
  width: 100%;
}

@media (max-width: 900px) {
  .service-selector {
    grid-template-columns: 1fr;
  }
}
</style>
