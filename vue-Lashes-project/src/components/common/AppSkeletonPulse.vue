<!-- 轻量骨架脉冲条，复用于多处 -->
<script setup lang="ts">
withDefaults(
  defineProps<{
    width?: string
    height?: string
    radius?: string
  }>(),
  {
    width: '100%',
    height: '14px',
    radius: '10px',
  }
)
</script>

<template>
  <span
    class="sk-pulse"
    :style="{ width, height, borderRadius: radius }"
    aria-hidden="true"
  />
</template>

<style scoped>
.sk-pulse {
  display: inline-block;
  vertical-align: middle;
  background: linear-gradient(
    90deg,
    var(--color-border) 0%,
    var(--color-bg-soft) 45%,
    var(--color-border) 90%
  );
  background-size: 200% 100%;
  animation: sk-shimmer 1.2s ease-in-out infinite;
}

@keyframes sk-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
</style>
