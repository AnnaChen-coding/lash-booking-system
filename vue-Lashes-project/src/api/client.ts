/**
 * 统一 HTTP 客户端：Vue 前端 → FastAPI（`VITE_API_BASE_URL`）。
 * 未配置 API 地址时，预约相关模块回退到浏览器 localStorage（仅本地演示）。
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function getApiBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL?.trim()
  if (!base) return ''
  return base.replace(/\/$/, '')
}

export function isRemoteApi(): boolean {
  return getApiBaseUrl() !== ''
}

export const DEFAULT_REQUEST_TIMEOUT_MS = 20_000

let accessTokenGetter: (() => string | null) | null = null

export function registerAccessTokenGetter(fn: () => string | null): void {
  accessTokenGetter = fn
}

function getBearerToken(): string | null {
  return accessTokenGetter?.() ?? null
}

export async function request<T>(
  method: string,
  path: string,
  options?: { body?: unknown; auth?: boolean }
): Promise<T> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new Error('request() 需要配置 VITE_API_BASE_URL')
  }

  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (options?.auth) {
    const t = getBearerToken()
    if (t) {
      headers.Authorization = `Bearer ${t}`
    }
  }

  const init: RequestInit = {
    method,
    headers,
    ...(typeof AbortSignal !== 'undefined' &&
    typeof AbortSignal.timeout === 'function'
      ? { signal: AbortSignal.timeout(DEFAULT_REQUEST_TIMEOUT_MS) }
      : {}),
  }

  if (
    options?.body !== undefined &&
    method !== 'GET' &&
    method !== 'HEAD'
  ) {
    init.body = JSON.stringify(options.body)
  }

  const res = await fetch(url, init)
  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = await res.text()
    }
    throw new ApiError(res.status, res.statusText, body)
  }

  if (res.status === 204) {
    return undefined as T
  }

  const text = await res.text()
  if (!text) {
    return undefined as T
  }
  return JSON.parse(text) as T
}
