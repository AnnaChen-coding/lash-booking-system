/** Supabase / PostgREST 常返回 { message, code, ... } 纯对象，需包装成 Error 才能被 catch 正确展示 */
export function toError(err: unknown): Error {
  if (err instanceof Error) return err
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const msg = (err as { message: unknown }).message
    if (typeof msg === 'string' && msg.length) return new Error(msg)
  }
  if (typeof err === 'string') return new Error(err)
  try {
    return new Error(JSON.stringify(err))
  } catch {
    return new Error('Unknown error')
  }
}
