<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { recommendServiceFromPrompt } from '@/utils/serviceAiRecommend'

const props = withDefaults(
  defineProps<{
    /** 是否在结果区提供「选用该服务」 */
    showApply?: boolean
  }>(),
  { showApply: true }
)

const emit = defineEmits<{
  (e: 'apply-service', serviceName: string): void
}>()

const query = ref('')
const loading = ref(false)
const recommendedName = ref('')
const summaryText = ref('')
const points = ref<string[]>([])
const metaLine = ref('')

const ask = async () => {
  if (loading.value) return
  recommendedName.value = ''
  summaryText.value = ''
  points.value = []
  metaLine.value = ''
  const q = query.value.trim()
  if (!q) {
    ElMessage.warning('Please describe what you are looking for.')
    return
  }
  loading.value = true
  try {
    const r = await recommendServiceFromPrompt(q)
    recommendedName.value = r.serviceName
    summaryText.value = r.summary
    points.value = [...r.supportingPoints]
    metaLine.value = `${r.category} · ${r.confidence} confidence · ${r.responseLanguage}`
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Something went wrong. Please try again.'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

const apply = () => {
  if (!recommendedName.value) return
  emit('apply-service', recommendedName.value)
}
</script>

<template>
  <div class="ai-helper">
    <p class="ai-helper-kicker">
      Need help choosing?
    </p>
    <p class="ai-helper-hint">
      Describe your style or routine — in English or 中文 is fine.
    </p>
    <el-input
      v-model="query"
      type="textarea"
      :rows="3"
      maxlength="400"
      show-word-limit
      placeholder="e.g. I want something natural for daily work, not too heavy / 我想要自然一点、日常通勤，不要太浓"
      :disabled="loading"
    />
    <div class="ai-helper-actions">
      <el-button
        type="primary"
        round
        :loading="loading"
        :disabled="loading"
        @click="ask"
      >
        Ask AI
      </el-button>
      <el-button
        v-if="props.showApply && recommendedName"
        round
        plain
        type="primary"
        @click="apply"
      >
        Use this service
      </el-button>
    </div>

    <div
      v-if="recommendedName"
      class="ai-helper-result"
      role="status"
    >
      <p class="result-label">
        Recommended
      </p>
      <p class="result-name">
        {{ recommendedName }}
      </p>
      <p
        v-if="metaLine"
        class="result-meta"
      >
        {{ metaLine }}
      </p>
      <p class="result-why-label">
        Summary
      </p>
      <p class="result-why">
        {{ summaryText }}
      </p>
      <template v-if="points.length">
        <p class="result-why-label points-label">
          Highlights
        </p>
        <ul class="result-points">
          <li
            v-for="(p, idx) in points"
            :key="idx"
          >
            {{ p }}
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<style scoped>
.ai-helper {
  padding: 20px 22px;
  border-radius: 20px;
  border: 1px solid var(--color-border);
  background: linear-gradient(
    145deg,
    var(--color-bg-soft),
    var(--color-surface)
  );
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ai-helper-kicker {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  font-family: var(--font-heading);
  color: var(--color-text);
}

.ai-helper-hint {
  margin: -4px 0 4px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text-muted);
}

.ai-helper-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.ai-helper-result {
  margin-top: 4px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--color-primary-soft);
  border: 1px solid var(--color-primary-light);
}

.result-label,
.result-why-label {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-primary);
}

.result-name {
  margin: 0 0 6px;
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.35;
}

.result-meta {
  margin: 0 0 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-muted);
  letter-spacing: 0.02em;
}

.result-why {
  margin: 0;
  font-size: 14px;
  line-height: 1.65;
  color: var(--color-text-soft);
}

.points-label {
  margin-top: 12px;
}

.result-points {
  margin: 0;
  padding-left: 1.15rem;
  font-size: 14px;
  line-height: 1.55;
  color: var(--color-text-soft);
}

.result-points li {
  margin-bottom: 6px;
}

.result-points li:last-child {
  margin-bottom: 0;
}
</style>
