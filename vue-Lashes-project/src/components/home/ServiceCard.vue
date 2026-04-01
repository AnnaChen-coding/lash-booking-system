<template>
  <article class="service-card">
    <div class="service-image-wrapper">
      <img :src="serviceName.image" :alt="serviceName.title" class="service-image" />
      <div class="service-overlay">
        <h3 class="service-title">{{ serviceName.title }}</h3>
      </div>
    </div>

    <div class="service-content">
      <p class="service-price">
        <span class="price-main">{{ serviceName.price }}</span>
        <span class="price-period">{{ serviceName.period }}</span>
      </p>

      <p class="service-highlight">{{ serviceName.highlight }}</p>
      <p v-if="serviceName.subHighlight" class="service-subhighlight">
        {{ serviceName.subHighlight }}
      </p>

      <ul class="service-benefits">
        <li v-for="(item, index) in serviceName.benefits" :key="index">
          {{ item }}
        </li>
      </ul>

      <p class="service-note">{{ serviceName.note }}</p>

      <button class="service-btn">{{ serviceName.buttonText }}</button>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ServiceItem } from '@/data/homeservices'

defineProps<{
  serviceName: ServiceItem
}>()
</script>

<style scoped>
.service-card {
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.service-image-wrapper {
  position: relative;
  overflow: hidden;
}

.service-image {
  width: 100%;
  height: 320px;
  display: block;
  object-fit: cover;
}

.service-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 32px 24px;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.22),
    rgba(0, 0, 0, 0.04)
  );
}

.service-title {
  font-size: 48px;
  font-family: var(--font-heading);
  color: white;
  text-align: center;
  margin: 0;
}

.service-content {
  padding: 36px 24px 40px;
  text-align: center;
}

.service-price {
  margin: 0 0 28px;
  color: var(--color-primary);
}

.price-main {
  font-size: 40px;
  font-weight: 500;
}

.price-period {
  font-size: 20px;
}

.service-highlight {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 20px;
}

.service-subhighlight {
  font-size: 16px;
  font-style: italic;
  color: var(--color-primary-light);
  margin-bottom: 10px;
}

.service-benefits {
  list-style: none;
  padding: 0;
  margin: 0 0 28px;
}

.service-benefits li {
  font-size: 16px;
  line-height: 1.9;
  color: var(--color-primary);
}

.service-note {
  font-size: 14px;
  color: var(--color-primary-light);
  margin-bottom: 36px;
  line-height: 1.7;
}

.service-btn {
  border: none;
  background: var(--color-accent);
  color: var(--color-button-text);
  padding: 16px 42px;
  border-radius: 999px;
  font-size: 18px;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.service-btn:hover {
  transform: translateY(-2px);
}
</style>