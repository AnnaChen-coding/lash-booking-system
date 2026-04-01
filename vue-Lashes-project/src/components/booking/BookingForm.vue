<script setup lang="ts">
import { reactive } from 'vue'


defineProps<{
  service: string
  date: string
  time: string
}>()

const emit = defineEmits<{
  (e: 'submit-booking', value: {
    name: string
    phone: string
    notes: string
  }): void
}>()

const form = reactive({
  name: '',
  phone: '',
  notes: '',
})

const handleSubmit = () => {
  if (!form.name || !form.phone) {
    alert('Please fill in your name and phone')
    return
  }

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
  resize: vertical;
}

button {
  padding: 12px 16px;
  border: none;
  border-radius: 999px;
  background: var(--color-button);
  color: var(--color-button-text);
  font-size: 14px;
  cursor: pointer;
}
</style>