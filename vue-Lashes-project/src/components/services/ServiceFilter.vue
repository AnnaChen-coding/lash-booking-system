<script setup lang="ts">
// 定义当前组件可以“发出的事件”
const emit = defineEmits<{
    // 定义一个事件：'change-category'
  (e: 'change-category', category: string): void
}>()
// 点击事件处理函数（给按钮用的）
const handleClick = (category: string) => {
    // 触发事件（子 → 父通信）
  emit('change-category', category)
}
</script>

<template>
  <div class="filter">
    <button @click="handleClick('all')">All</button>
    <button @click="handleClick('nails')">Nails</button>
    <button @click="handleClick('lashes')">Lashes</button>
    <button @click="handleClick('popular')">Popular</button>
  </div>
</template>

<style scoped>
.filter {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 40px;
}

button {
  padding: 10px 20px;
  border-radius: 999px;
  border: none;
  background: var(--color-surface-soft);
  cursor: pointer;
}

button:hover {
  background: var(--color-primary-light);
}
</style>