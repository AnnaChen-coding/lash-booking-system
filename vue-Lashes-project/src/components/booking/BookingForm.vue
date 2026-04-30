<script setup lang="ts">
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'

// 使用 defineProps 定义组件接收的外部数据


const props = withDefaults(
  defineProps<{
    service: string
    date: string
    time: string
    /** 提交预约进行中，防止重复点击 */
    submitting?: boolean
  }>(),
  { submitting: false }
)

// --- 事件定义 (Emits) ---
// 定义组件可以向外触发的事件
// 这里定义了一个 'submit-booking' 事件，并约束了它携带的参数类型
const emit = defineEmits<{
  (e: 'submit-booking', value: {
    name: string
    email: string
    phone: string
    notes: string
  }): void
}>()
// --- 响应式状态 (State) ---
// 使用 reactive 创建一个响应式对象来绑定表单输入
const form = reactive({
  name: '',
  email: '',
  phone: '',
  notes: '',
})
// --- 逻辑处理 (Methods) ---
const handleSubmit = () => {
  if (props.submitting) return
  const name = form.name.trim()
  const phone = form.phone.trim()
  const notes = form.notes.trim()
  // 基础表单验证：确保姓名和电话不为空
  if (!name || !phone) {
    ElMessage.warning('Please fill in your name and phone')
    return
  }
  const email = form.email.trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    ElMessage.warning('Please enter a valid email address')
    return
  }
  // 验证通过后，将表单数据通过 emit 发送给父组件
  // 父组件可以监听到这个事件并执行后续操作
  emit('submit-booking', {
    name,
    email,
    phone,
    notes,
  })
}
</script>

<template>
  <div class="booking-form">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="booking-meta"
    >
      <template #title>
        Service: {{ props.service }} | Date: {{ props.date }} | Time: {{ props.time }}
      </template>
    </el-alert>

    <el-form
      label-position="top"
      :disabled="props.submitting"
      @submit.prevent="handleSubmit"
    >
      <el-form-item label="Name">
        <el-input
          v-model="form.name"
          placeholder="Your name"
          clearable
        />
      </el-form-item>

      <el-form-item label="Phone">
        <el-input
          v-model="form.phone"
          placeholder="Your phone"
          clearable
        />
      </el-form-item>

      <el-form-item label="Email (optional)">
        <el-input
          v-model="form.email"
          type="email"
          placeholder="Your email"
          clearable
        />
      </el-form-item>

      <el-form-item label="Notes">
        <el-input
          v-model="form.notes"
          type="textarea"
          :rows="4"
          placeholder="Additional notes"
        />
      </el-form-item>

      <el-form-item class="submit-row">
        <el-button
          type="primary"
          round
          native-type="submit"
          :loading="props.submitting"
          :disabled="props.submitting"
        >
          {{ props.submitting ? 'Submitting…' : 'Submit Booking' }}
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.booking-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 24px;
  padding: 24px;
  border-radius: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.booking-meta {
  margin-bottom: 4px;
}

:deep(.el-form-item) {
  margin-bottom: 14px;
}

:deep(.el-form-item__label) {
  font-weight: 600;
  color: var(--color-text);
}

.submit-row {
  margin-top: 6px;
  margin-bottom: 0;
}

.submit-row :deep(.el-form-item__content) {
  justify-content: flex-end;
}
</style>