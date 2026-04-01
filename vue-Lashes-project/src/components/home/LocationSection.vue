<template>
  <section class="location-section">
    <div class="location-container">
      <div class="map-wrapper">
        <iframe
          class="map-frame"
          src="https://www.google.com/maps?q=Karlsplatz,80335%20M%C3%BCnchen,Germany&output=embed"
          loading="lazy"
          allowfullscreen
          referrerpolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>

      <div class="location-content">
        <p class="section-subtitle">Visit Us</p>
        <h2 class="section-title">Find Our Studio</h2>
        <p class="location-address">Karlsplatz, 80335 München, Germany</p>
        <p class="location-hours">Mon - Sat · 10:00 AM - 7:00 PM</p>

        <div class="location-actions">
          <a
            class="location-btn"
            href="https://www.google.com/maps/search/?api=1&query=Karlsplatz,80335%20M%C3%BCnchen,Germany"
            target="_blank"
            rel="noopener noreferrer"
          >
            Get Directions
          </a>

          <a class="location-btn secondary" href="mailto:hello@gazeandglaze.com">
            Email Us
          </a>
        </div>
</div>

    </div>
  </section>
</template>
<style scoped>
.location-section {
  padding: 100px 0;
  background-color: var(--color-bg);
}

.location-container {
  width: min(1200px, 90%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 48px;
  align-items: center;
}

.map-wrapper {
  width: 100%;
  height: 500px;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
}

.map-frame {
  width: 100%;
  height: 100%;
  border: none;
}

.location-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 24px;
}

.section-subtitle {
  font-size: 14px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--color-primary);
  margin: 0;
}

.section-title {
  font-family: var(--font-heading);
  font-size: 56px;
  line-height: 1.1;
  color: var(--color-text);
  margin: 0;
}

.location-address {
  font-size: 18px;
  line-height: 1.7;
  color: var(--color-text-soft);
  max-width: 320px;
  margin: 0;
}

.location-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 220px;
  padding: 16px 28px;
  border-radius: 999px;
  background-color: var(--color-primary);
  color: white;
  text-decoration: none;
  font-size: 18px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.location-btn:hover {
  transform: translateY(-2px);
  background-color: var(--color-primary-dark);
}
.location-hours {
  font-size: 16px;
  color: var(--color-text-muted);
  margin: 0;
}

.location-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.location-btn.secondary {
  background-color: var(--color-primary-light);
}

.location-btn.secondary:hover {
  background-color: var(--color-primary);
}

@media (max-width: 900px) {
  .location-container {
    grid-template-columns: 1fr;
  }

  .map-wrapper {
    height: 380px;
  }

  .section-title {
    font-size: 42px;
  }
}
</style>