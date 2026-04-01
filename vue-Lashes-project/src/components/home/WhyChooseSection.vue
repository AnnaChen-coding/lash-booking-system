<template>
  <section class="why-choose-section">
    <div class="container">
      <div class="section-header">
        <p class="section-subtitle">Why Choose Us</p>
        <h2 class="section-title">Beauty, Comfort, and Care in Every Detail</h2>
        <p class="section-description">
          We create a relaxing beauty experience with premium products, careful technique,
          and personalized service designed to help you look and feel your best.
        </p>
      </div>

      <div class="feature-grid">
        <div
          v-for="item in whyChooseList"
          :key="item.title"
          class="feature-card"
        >
          <div class="feature-icon">{{ item.icon }}</div>
          <h3 class="feature-title">{{ item.title }}</h3>
          <p class="feature-text">{{ item.description }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
<script setup lang ='ts'>
import { whyChooseList } from '@/data/whyChoose';
</script><style scoped>
.why-choose-section {
  padding: var(--space-9) 0;
}

.section-header {
  max-width: 760px;
  margin: 0 auto var(--space-8);
  text-align: center;
}

.section-subtitle {
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--color-primary);
  margin-bottom: var(--space-3);
}

.section-title {
  font-size: var(--text-h2);
  font-family: var(--font-heading);
  color: var(--color-text);
  line-height: 1.2;
  margin-bottom: var(--space-4);
}

.section-description {
  font-size: var(--text-base);
  line-height: 1.8;
  color: var(--color-text-soft);
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-5);
}

.feature-card {
  background: var(--color-surface);
  border: 1px solid rgba(221, 216, 207, 0.7);
  border-radius: var(--radius-lg);
  padding: var(--space-6) var(--space-5);
  text-align: center;
  box-shadow: var(--shadow-sm);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-md);
}

.feature-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto var(--space-5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.feature-title {
  font-size: var(--text-h3);
  font-family: var(--font-heading);
  color: var(--color-text);
  margin-bottom: var(--space-3);
}

.feature-text {
  font-size: var(--text-sm);
  line-height: 1.8;
  color: var(--color-text-soft);
}
</style>