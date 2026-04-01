<template>
  <section class="contact-section">
    <div class="contact-info">
        <p class="section-subtitle">Contact</p>
        <h2 class="section-title">Visit Our Studio</h2>

        <div class="info-list">
            <div class="info-item">
            <span>📍</span>
            <p>{{ contactInfo.address }}</p>
            </div>

            <div class="info-item">
            <span>📞</span>
            <a href="tel:+49123456789">{{ contactInfo.phone }}</a>
            </div>

            <div class="info-item">
            <span>📧</span>
            <p>{{ contactInfo.email }}</p>
            </div>

            <div class="info-item">
            <span>🕒</span>
            <p>{{ contactInfo.hours }}</p>
            </div>
        </div>

        <button class="primary-btn">Book Appointment</button>
    </div>  
  </section>
</template>
<style scoped>
.contact-section {
  padding: 100px 0;
  background-image: url(../../assets/image/background\ hero.jpg);
  background-size: cover;

  display: flex;
  justify-content: center;  /* 水平居中 */
  align-items: center;      /* 垂直居中 */
  text-align: center;       /* 文本居中 */
}

/* 左右布局 */
.contact-grid {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 60px;
  align-items: center;
}
.section-subtitle {
  font-size: 14px;
  letter-spacing: 2px;
  color: var(--color-primary);
  margin-bottom: 10px;
  text-transform: uppercase;
}
.section-title {
  font-size: 40px;
  font-family: var(--font-heading);
  margin-bottom: 30px;
}

.info-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

/* 每一行 */
.info-item {
  display: flex;
  justify-content: center;
  gap: 12px;
  font-size: 16px;
  color: var(--color-text-soft);
}

.info-item span {
  font-size: 18px;
}

/* 按钮 */
.primary-btn {
  margin-top: 40px;
  padding: 14px 32px;

  background: linear-gradient(
    135deg,
    var(--color-primary),
    var(--color-primary-light)
  );

  color: white;
  font-size: 16px;
  font-weight: 500;

  border: none;
  border-radius: 999px; /* 胶囊按钮 */

  cursor: pointer;
  transition: all 0.3s ease;

  box-shadow: 0 8px 20px rgba(0,0,0,0.1);
}
.primary-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(0,0,0,0.15);

  background: linear-gradient(
    135deg,
    var(--color-primary-dark),
    var(--color-primary)
  );
}
</style>
<script setup lang="ts">
const contactInfo = {
  address: 'Karlsplatz, 80335 München, Germany',
  phone: '+49 123 456 789',
  email: 'hello@gazeandglaze.com',
  hours: 'Mon - Sat: 10:00 - 20:00'
}
</script>