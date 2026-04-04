<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore, MOCK_LOGIN_PASSWORD } from '@/stores/auth'
import { isSupabaseConfigured } from '@/lib/supabase'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const useCloudAuth = computed(() => isSupabaseConfigured())

const form = reactive({
  email: '',
  password: '',
})

const error = ref('')
const loading = ref(false)

const handleSubmit = async () => {
  error.value = ''
  loading.value = true
  try {
    if (useCloudAuth.value) {
      if (!form.email.trim() || !form.password) {
        error.value = '请填写邮箱与密码'
        return
      }
      const r = await auth.loginWithSupabase(form.email, form.password)
      if (!r.ok) {
        error.value = r.message
        return
      }
    } else {
      if (!form.password) {
        error.value = '请输入口令'
        return
      }
      if (!auth.loginMock(form.password)) {
        error.value = '口令错误（演示默认：demo）'
        return
      }
    }
    const redirect =
      typeof route.query.redirect === 'string' ? route.query.redirect : '/admin'
    void router.replace(redirect || '/')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="login-page">
    <div class="login-card">
      <h1 class="title">
        {{ useCloudAuth ? '管理员登录' : '管理员登录（Mock）' }}
      </h1>
      <p v-if="!useCloudAuth" class="hint">
        演示口令：<code>{{ MOCK_LOGIN_PASSWORD }}</code>
      </p>
      <p v-else class="hint">
        使用已在
        <strong>表 admin_emails</strong>
        中登记的邮箱，并在
        <strong>Authentication → Users</strong>
        创建同邮箱账号后登录。未在白名单的账号无法进入后台。
      </p>
      <form class="form" @submit.prevent="handleSubmit">
        <label v-if="useCloudAuth" class="label">
          邮箱
          <input
            v-model="form.email"
            type="email"
            class="input"
            autocomplete="username"
            placeholder="admin@example.com"
          />
        </label>
        <label class="label">
          {{ useCloudAuth ? '密码' : '口令' }}
          <input
            v-model="form.password"
            type="password"
            class="input"
            autocomplete="current-password"
            :placeholder="useCloudAuth ? '密码' : '输入 demo'"
          />
        </label>
        <p v-if="error" class="error">
          {{ error }}
        </p>
        <button type="submit" class="submit" :disabled="loading">
          {{ loading ? '登录中…' : 'Login' }}
        </button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.login-page {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 32px;
  border-radius: 16px;
  background: var(--color-surface);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.title {
  font-size: 1.5rem;
  margin: 0 0 12px;
}

.hint {
  margin: 0 0 24px;
  font-size: 0.9rem;
  color: var(--color-text-soft);
  line-height: 1.5;
}

.hint code {
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.25);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.95rem;
}

.input {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.2);
  color: inherit;
  font-size: 1rem;
}

.input:focus {
  outline: 2px solid var(--color-primary-light, #c9a962);
  outline-offset: 2px;
}

.error {
  margin: 0;
  font-size: 0.9rem;
  color: #f87171;
}

.submit {
  margin-top: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  cursor: pointer;
  background: var(--color-primary-light, #c9a962);
  color: #1a1a1a;
  font-weight: 600;
}

.submit:hover:not(:disabled) {
  filter: brightness(1.05);
}

.submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
