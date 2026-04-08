<script setup lang="ts">
const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const handleChange = (value: string) => {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="filter-group">
    <button
      :class="{ active: props.modelValue === 'all' }"
      @click="handleChange('all')"
    >
      All
    </button>

    <button
      :class="{ active: props.modelValue === 'pending' }"
      @click="handleChange('pending')"
    >
      Pending
    </button>

    <button
      :class="{ active: props.modelValue === 'confirmed' }"
      @click="handleChange('confirmed')"
    >
      Confirmed
    </button>

    <button
      :class="{ active: props.modelValue === 'cancelled' }"
      @click="handleChange('cancelled')"
    >
      Cancelled
    </button>

    <button
      :class="{ active: props.modelValue === 'pending_payment' }"
      @click="handleChange('pending_payment')"
    >
      Pending pay
    </button>

    <button
      :class="{ active: props.modelValue === 'paid' }"
      @click="handleChange('paid')"
    >
      Paid
    </button>
  </div>
</template>

<style scoped>
.filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

button {
  padding: 8px 14px;
  border-radius: 999px;
  border: none;
  background: var(--color-surface-soft);
  cursor: pointer;
}

button.active {
  background: var(--color-primary);
  color: white;
}
</style>