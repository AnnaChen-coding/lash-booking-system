<template>
    <section class="hero" @mouseenter="stopAutoPlay" @mouseleave="startAutoPlay">
        <picture class="hero-bg" :key="currentIndex">
            <source
              v-if="currentSlice?.imageWebp"
              :srcset="currentSlice?.imageWebp"
              type="image/webp"
            />
            <img
              :src="currentSlice?.imageFallback || currentSlice?.image"
              alt=""
              width="1920"
              height="1080"
              :loading="currentIndex === 0 ? 'eager' : 'lazy'"
              :fetchpriority="currentIndex === 0 ? 'high' : 'auto'"
              @load="onHeroImageLoad"
            />
        </picture>
        <div class="container">
            <div class="hero-content" :key="currentIndex">
                <p class="hero-subtitle">{{ currentSlice?.subtitle }}</p>
                <h1 class="hero-title">{{ currentSlice?.title }}</h1>
                <p class="hero-description">
                    {{ currentSlice?.description }}
                </p>
            <div class="hero-actions">
                <button class="primary-btn">Book Now</button>
                <button class="secondary-btn">View Services</button>
            </div>
            </div>
            <div class="hero-controls">
                <button class="control-btn" @click="handlePrev">‹</button>
                <button class="control-btn" @click="handleNext">›</button>
            </div>
        </div>
    </section>
</template>
<style scoped>
.hero {
    width: 100%;
    min-height: 100vh;
    display: flex;
    align-items: center;
    position: relative;
}
.hero-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
}
.hero-bg img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}
.container {
    position: relative;
    z-index: 1;
}
.hero-content {
    max-width: 680px;
    animation: fadeUp 0.6s ease;
    font-family: var(--font-heading)
}
/* 添加动画 */
@keyframes fadeUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
.hero-subtitle {
    margin-bottom: var(--space-3);
    font-size: var(--text-sm);
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--color-text-light);
}

.hero-title {
    margin-bottom: 20px;
    font-size: var(--text-hero);
    line-height: 1.1;
    color: var(--color-primary-soft);
}

.hero-description {
    margin-bottom: var(--space-6);
    font-size: var(--text-base);
    line-height: 1.7;
    color: var(--color-text-light);
}

.hero-actions {
    display: flex;
    gap: 16px;
}
.primary-btn, 
.secondary-btn{
    height: 80px;
    min-width: 520px;
    border-radius: var(--radius-pill);
    background-color: var(--color-button);
    color: var(--color-button-text);
    font-size: var(--text-h3);
    font-weight: 600;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: all 0.3s ease;
}
button:hover {
    transform: translateY(-2px);
    opacity: 0.95;
}
.hero-controls {
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    transform: translateY(-50%);
    display: flex;
    justify-content: space-between;
    padding: 0 24px;
    box-sizing: border-box;
    z-index: 2;
}
.control-btn {
    width: 48px;
    height: 48px;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.75);
    color: var(--color-text);
    font-size: 24px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.control-btn:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.95);
}
</style>
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted} from 'vue'
import { heroSlides } from '@/data/heroSlides'

let timer: number | undefined
let autoplayDelayTimer: number | undefined
const currentIndex = ref(0)
const heroReady = ref(false)
const currentSlice = computed(() => heroSlides[currentIndex.value]) 
// 下一张
const nextSlide = () => {
  currentIndex.value = (currentIndex.value + 1) % heroSlides.length
}
// 上一张
const prevSlide = () => {
  currentIndex.value =
    (currentIndex.value - 1 + heroSlides.length) % heroSlides.length
}
// 自动播放
// 自动播放开始
const startAutoPlay = () => {
  if (!heroReady.value) return
    // 之前存在的清理掉
  stopAutoPlay()
//创建定时器
  timer = window.setInterval(() => {
    nextSlide()
  }, 3000)
}
// 停止自动播放
const stopAutoPlay = () => {
  if (timer) {
    clearInterval(timer)
    timer = undefined
  }
  if (autoplayDelayTimer) {
    clearTimeout(autoplayDelayTimer)
    autoplayDelayTimer = undefined
  }
}
// 重置自动播放
const resetAutoPlay = () => {
  startAutoPlay()
}
// 点击下一张，顺便重置
const handleNext = () => {
  nextSlide()
  resetAutoPlay()
}
// 点击上一张，顺便重置
const handlePrev = () => {
  prevSlide()
  resetAutoPlay()
}
const onHeroImageLoad = () => {
  if (heroReady.value) return
  heroReady.value = true
  // 首屏图先稳定渲染，再启动轮播，避免 LCP 被轮播延迟。
  autoplayDelayTimer = window.setTimeout(() => {
    startAutoPlay()
  }, 6000)
}
// 页面加载完成后执行
onMounted(() => {
  // 等首屏图片加载完成后再开启自动轮播
})
// 组件销毁时，停止
onUnmounted(() => {
  stopAutoPlay()
})


</script>
