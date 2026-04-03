<script setup lang="ts">
import { reactive } from 'vue'

// 使用 defineProps 定义组件接收的外部数据


defineProps<{
  service: string
  date: string
  time: string
}>()

// --- 事件定义 (Emits) ---
// 定义组件可以向外触发的事件
// 这里定义了一个 'submit-booking' 事件，并约束了它携带的参数类型
const emit = defineEmits<{
  (e: 'submit-booking', value: {
    name: string
    phone: string
    notes: string
  }): void
}>()
// --- 响应式状态 (State) ---
// 使用 reactive 创建一个响应式对象来绑定表单输入
const form = reactive({
  name: '',
  phone: '',
  notes: '',
})
// --- 逻辑处理 (Methods) ---
const handleSubmit = () => {
  // 基础表单验证：确保姓名和电话不为空
  if (!form.name || !form.phone) {
    alert('Please fill in your name and phone')
    return
  }
  // 验证通过后，将表单数据通过 emit 发送给父组件
  // 父组件可以监听到这个事件并执行后续操作
  emit('submit-booking', {
    name: form.name,
    phone: form.phone,
    notes: form.notes,
  })
}
</script>

<template>
  <div class="booking-form">
    <h2>Booking Form</h2>

    <p><strong>Service:</strong> {{ service }}</p>
    <p><strong>Date:</strong> {{ date }}</p>
    <p><strong>Time:</strong> {{ time }}</p>
<!-- 使用 v-model 进行双向数据绑定 -->
    <form @submit.prevent="handleSubmit">
      <input
        v-model="form.name"
        type="text"
        placeholder="Your name"
      />

      <input
        v-model="form.phone"
        type="text"
        placeholder="Your phone"
      />

      <textarea
        v-model="form.notes"
        placeholder="Notes"
      ></textarea>

      <button type="submit">Submit Booking</button>
    </form>
  </div>
</template>

<style scoped>
.booking-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
  padding: 20px;
  border-radius: 16px;
  background: var(--color-surface);
}

form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

input,
textarea {
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  font-size: 14px;
}

textarea {
  min-height: 100px;
  /* 允许用户垂直拉伸输入框 */
  resize: vertical;
}

button {
  padding: 12px 16px;
  border: none;
  /* 胶囊形状按钮 */
  border-radius: 999px;
  background: var(--color-button);
  color: var(--color-button-text);
  font-size: 14px;
  cursor: pointer;
}
</style>