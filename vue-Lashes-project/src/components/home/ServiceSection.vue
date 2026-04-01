<template>
    <section class="services-section">
        <div class="container">
            <p class="section-subtitle">Our Signature Plans</p>
            <h2 class="section-title">Luxury Beauty, Tailored to You</h2>
            <div class="services-list">
                 <ServiceCard
                    v-for="service in services"
                    :key="service.id"
                    :serviceName="service"
                    />
                
            </div>
        </div>

    </section>
</template>
<style scoped>
.services-section {
  padding: 80px 0;
}

.section-subtitle {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--color-primary);
  margin-bottom: 12px;
}
.section-title {
  font-size: 40px;
  font-family: var(--font-heading);
  color: var(--color-text);
}
.services-list {
  margin-top: 56px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
}


</style>
<script setup lang="ts">
import { services } from '@/data/homeservices'
import ServiceCard from './ServiceCard.vue'
</script>