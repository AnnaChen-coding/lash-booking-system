/**
 * 统一 HTTP 客户端。预约与评价优先走 Supabase（见 VITE_SUPABASE_*）；
 * 否则设置 VITE_API_BASE_URL 时走本文件的 fetch；再否则为 localStorage 等本地实现。
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

export async function request<T>(
  method: string,
  path: string,
  options?: { body?: unknown }
): Promise<T> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new Error('request() 需要配置 VITE_API_BASE_URL')
  }

  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
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
