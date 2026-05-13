/**
 * 统一 HTTP 客户端。
 *
 * - 未设置 `VITE_USE_REST_API=true` 时：预约数据仍按「Supabase → VITE_API_BASE_URL → localStorage」
 *   （见 `bookings.ts`）。
 * - 设置 `VITE_USE_REST_API=true` 且配置了 `VITE_API_BASE_URL` 时：预约 API 优先走 FastAPI，
 *   失败再回落 Supabase / 本地（见 `isRestApiPreferred()` 与 `bookings.ts`）。
 */
// 自定义错误类
export class ApiError extends Error {
  // 构造函数
  constructor(
    public status: number,
    message: string,
    public body?: unknown
  ) {
    super(message)
    // 设置错误名称
    this.name = 'ApiError'
  }}
// 环境变量里读取 VITE_API_BASE_URL，如果没有则返回空字符串
export function getApiBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL?.trim()
  if (!base) return ''
  return base.replace(/\/$/, '')
}
// 判断是否是远程 API
export function isRemoteApi(): boolean {
  return getApiBaseUrl() !== ''
}

/** 为 true 且配置了 `VITE_API_BASE_URL` 时，`bookings.ts` 优先走 FastAPI REST。 */
export function isRestApiPreferred(): boolean {
  const raw = import.meta.env.VITE_USE_REST_API?.trim().toLowerCase()
  return raw === 'true' && getApiBaseUrl() !== ''
}

/** 由 main.ts 注册，避免 client 与 auth store 循环依赖 */
let accessTokenGetter: (() => string | null) | null = null

export function registerAccessTokenGetter(fn: () => string | null): void {
  accessTokenGetter = fn
}

function getBearerToken(): string | null {
  return accessTokenGetter?.() ?? null
}

// 请求 API
export async function request<T>(
  method: string,
  path: string,
  options?: { body?: unknown; auth?: boolean }
): Promise<T> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new Error('request() 需要配置 VITE_API_BASE_URL')
  }
  // 拼接完整请求地址
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
  // 初始化请求
  const init: RequestInit = {
    method,
    headers,
  }

  if (
    // 如果 body 不为空，并且方法不是 GET 或 HEAD，则将 body 转换为 JSON 字符串
    options?.body !== undefined &&
    method !== 'GET' &&
    method !== 'HEAD'
  ) {
    // 将 body 转换为 JSON 字符串
    init.body = JSON.stringify(options.body)
  }

  // 发送请求
  const res = await fetch(url, init)
  // 如果请求不成功，则抛出错误
  if (!res.ok) {
    // 先声明一个变量 body，准备等会儿拿来装“服务器返回的错误内容”
    let body: unknown
    try {
      // 将响应体转换为 JSON
      body = await res.json()
    } catch {
      // 如果转换为 JSON 失败，则将响应体转换为文本
      body = await res.text()
    }
    throw new ApiError(res.status, res.statusText, body)
  }
// 请求成功，但服务器没有返回内容。
  if (res.status === 204) {
    return undefined as T
  }
  // 将响应体转换为文本
  const text = await res.text()
  if (!text) {
    return undefined as T
  }
  // 将响应体转换为 JSON 解析返回数据
  return JSON.parse(text) as T
}
