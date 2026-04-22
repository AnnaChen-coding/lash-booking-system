import { services } from '@/data/services'
import type { ServiceItem } from '@/types/service'
import { isSupabaseConfigured } from '@/lib/supabase'
import { recommendServiceViaSupabaseEdge } from '@/services/serviceRecommendEdge'

export type ServiceAiRecommendResult = {
  schemaVersion: '1.0'
  serviceName: string
  category: 'nails' | 'lashes'
  confidence: 'high' | 'medium' | 'low'
  responseLanguage: 'zh' | 'en' | 'mixed'
  /** 主说明（2–4 句量级） */
  summary: string
  /** 2–4 条独立要点 */
  supportingPoints: string[]
  /** summary + 编号要点，便于复制或兼容旧展示 */
  why: string
}

const normalize = (s: string) => s.trim().toLowerCase()

function useOpenAiRecommendPath(): boolean {
  return (
    import.meta.env.VITE_ENABLE_OPENAI_SERVICE_RECOMMEND === 'true' &&
    isSupabaseConfigured()
  )
}

/**
 * 推荐服务：若 `VITE_ENABLE_OPENAI_SERVICE_RECOMMEND=true` 且已配置 Supabase，
 * 则通过 Edge Function（服务端 DeepSeek）；失败或未启用时回退到本地关键词逻辑。
 */
export async function recommendServiceFromPrompt(
  rawInput: string,
  options?: { minDelayMs?: number; forceLocal?: boolean }
): Promise<ServiceAiRecommendResult> {
  const input = rawInput.trim()
  if (!input) {
    throw new Error('Please describe what you are looking for.')
  }

  if (!options?.forceLocal && useOpenAiRecommendPath()) {
    try {
      return await recommendServiceViaSupabaseEdge(input)
    } catch (e) {
      console.warn('[service-ai] Edge / remote model failed, using local rules', e)
    }
  }

  return recommendServiceFromPromptLocal(rawInput, options)
}

/** 本地关键词 + 描述匹配，不调用外网大模型 */
export async function recommendServiceFromPromptLocal(
  rawInput: string,
  options?: { minDelayMs?: number }
): Promise<ServiceAiRecommendResult> {
  const minDelay = options?.minDelayMs ?? 500
  const started = Date.now()
  const input = rawInput.trim()
  if (!input) {
    throw new Error('Please describe what you are looking for.')
  }

  const text = normalize(input)
  const scores = new Map<string, number>()
  for (const s of services) {
    scores.set(s.name, 0)
  }

  const add = (name: string, w: number) => {
    scores.set(name, (scores.get(name) ?? 0) + w)
  }

  // --- 品类倾向 ---
  const nailsHint =
    /nail|manicure|polish|gel|指甲|美甲|甲油|延长甲|手部|修手/.test(text) ||
    /nail\s*extension|延长(?!睫)/.test(text)
  const lashHint =
    /lash|eyelash|睫毛|嫁接|美睫|烫睫|角蛋白|翘睫|单根|hybrid|volume|classic\s+lash/.test(
      text
    )

  if (nailsHint && !lashHint) {
    add('Classic Manicure', 2)
    add('Gel Manicure', 2)
    add('Nail Extension', 2)
  }
  if (lashHint && !nailsHint) {
    add('Classic Lash Extensions', 2)
    add('Hybrid Lash Extensions', 2)
    add('Lash Lift', 2)
  }

  // --- 美甲 ---
  if (/gel|甲油胶|持久|亮面|chip|long-lasting|lasting/.test(text)) {
    add('Gel Manicure', 5)
  }
  if (
    /extension|延长|延长甲|length|long nail|stiletto|长指甲|加长/.test(text)
  ) {
    add('Nail Extension', 6)
  }
  if (
    /manicure|classic manicure|polish|简单|基础|修型|修手(?!胶)/.test(text) ||
    (/指甲|美甲/.test(text) && !/gel|胶|延长/.test(text))
  ) {
    add('Classic Manicure', 4)
  }

  // --- 美睫 ---
  if (/lift|烫|角蛋白|curl|翘睫|自己的睫毛|原生|不嫁接|no extension|natural lash(?! extension)/.test(text)) {
    add('Lash Lift', 7)
  }
  if (
    /hybrid|混合|穿插|浓密一点|fuller|volume|wispy|明显|派对|拍照|妆感/.test(text)
  ) {
    add('Hybrid Lash Extensions', 6)
  }
  if (
    /natural|subtle|daily|work|通勤|日常|自然|淡|轻|soft|light|gentle|不要太浓|不浓|新手|第一次|first/.test(
      text
    )
  ) {
    add('Classic Lash Extensions', 6)
    add('Lash Lift', 2)
  }
  if (/classic lash|单根|classic extension/.test(text)) {
    add('Classic Lash Extensions', 5)
  }

  // 描述文本弱匹配
  for (const item of services) {
    const blob = normalize(`${item.name} ${item.shortDescription} ${item.description}`)
    const tokens = text.split(/[\s,.;，。；、]+/).filter((t) => t.length >= 3)
    for (const t of tokens) {
      if (t.length >= 4 && blob.includes(t)) {
        add(item.name, 1)
      }
    }
  }

  let best: ServiceItem | null = null
  let bestScore = -Infinity
  for (const item of services) {
    const sc = scores.get(item.name) ?? 0
    if (sc > bestScore) {
      bestScore = sc
      best = item
    }
  }

  let resolved = best
  if (!resolved || bestScore <= 0) {
    resolved =
      services.find((s) => s.name === 'Classic Lash Extensions') ?? services[0] ?? null
    bestScore = 0
  }
  if (!resolved) {
    throw new Error('No services configured.')
  }

  const summary = buildWhy(resolved, text, bestScore)
  const isZh = /[\u4e00-\u9fff]/.test(text)
  const supportingPoints = isZh
    ? [
        '适合作为初步方向，最终以到店评估与沟通为准。',
        '若有敏感体质或特殊需求，建议在预约备注中说明。',
      ]
    : [
        'Treat this as a starting direction; your technician will confirm details in person.',
        'Mention sensitivities or special needs in your booking notes when you reserve.',
      ]
  const why =
    `${summary}\n\n` +
    supportingPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')

  const elapsed = Date.now() - started
  if (elapsed < minDelay) {
    await new Promise((r) => setTimeout(r, minDelay - elapsed))
  }

  return {
    schemaVersion: '1.0',
    serviceName: resolved.name,
    category: resolved.category,
    confidence: bestScore > 3 ? 'high' : bestScore > 0 ? 'medium' : 'low',
    responseLanguage: isZh ? 'zh' : 'en',
    summary,
    supportingPoints,
    why,
  }
}

function buildWhy(item: ServiceItem, text: string, score: number): string {
  const isZh = /[\u4e00-\u9fff]/.test(text)
  if (item.category === 'lashes') {
    if (item.name === 'Classic Lash Extensions') {
      return isZh
        ? '单根经典款妆感偏淡，适合日常通勤与第一次尝试嫁接、想要自然放大的客人。'
        : 'This style looks natural and works well for daily wear. It is a gentle choice for first-time clients who want a subtle enhancement.'
    }
    if (item.name === 'Hybrid Lash Extensions') {
      return isZh
        ? '混合款在自然与丰盈之间取得平衡，适合想要比单根更明显、但仍保留轻盈层次感的造型。'
        : 'Hybrid sets blend classic and volume fans for a fuller yet still balanced look—great when you want more definition without going extremely heavy.'
    }
    if (item.name === 'Lash Lift') {
      return isZh
        ? '角蛋白烫翘能强化自身睫毛的卷翘与打开感，适合不想接假睫毛、偏好「原生睫毛」清爽效果的人。'
        : 'A lash lift enhances your natural lashes with curl and lift—ideal if you prefer a low-maintenance look without extensions.'
    }
  }
  if (item.name === 'Classic Manicure') {
    return isZh
      ? '经典 manicure 注重整洁甲型与基础保养，适合想要干净优雅日常手部状态的你。'
      : 'A classic manicure focuses on neat shaping and polished everyday nails—perfect for a clean, elegant baseline look.'
  }
  if (item.name === 'Gel Manicure') {
    return isZh
      ? '凝胶甲油光泽持久、相对不易剥落，适合忙碌日程中仍想维持亮面质感的人。'
      : 'Gel offers longer-lasting shine and durability—suited for clients who want glossy nails that hold up through busy weeks.'
  }
  if (item.name === 'Nail Extension') {
    return isZh
      ? '延长甲能调整长度与甲型，适合想要更修长线条或特殊造型需求的客人。'
      : 'Extensions add length and refined shaping—best when you want a more sculpted, statement nail silhouette.'
  }
  if (score <= 0) {
    return isZh
      ? '根据你目前的描述，我们先给出一个通用起点；你也可以再补充「美甲或美睫」「浓淡」「是否接假睫毛」等关键词，让推荐更贴近你的需求。'
      : 'Based on your note, this is a sensible starting pick. Add a bit more detail (nails vs lashes, natural vs fuller, extensions vs lift) to tighten the match.'
  }
  return item.shortDescription
}
