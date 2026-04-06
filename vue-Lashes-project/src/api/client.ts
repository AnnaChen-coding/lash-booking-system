/**
 * 统一 HTTP 客户端。预约与评价优先走 Supabase（见 VITE_SUPABASE_*）；
 * 否则设置 VITE_API_BASE_URL 时走本文件的 fetch；再否则为 localStorage 等本地实现。
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
// 请求 API
export async function request<T>(
  method: string,
  path: string,
  options?: { body?: unknown }
): Promise<T> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new Error('request() 需要配置 VITE_API_BASE_URL')
  }
  // 拼接完整请求地址
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  // 初始化请求
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
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
