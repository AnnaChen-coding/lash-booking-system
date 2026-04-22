/**
 * Edge Function：根据顾客自然语言描述，调用 **DeepSeek**（OpenAI 兼容 Chat Completions）推荐一项店内服务。
 * 使用 `response_format: { type: "json_object" }`；服务端仍按 JSON Schema 规则做严格校验。
 *
 * 部署（在项目根目录）：
 *   supabase secrets set DEEPSEEK_API_KEY=sk-...
 *   supabase functions deploy service-recommend
 *
 * Secrets / 环境变量：
 *   DEEPSEEK_API_KEY（必填）
 *   DEEPSEEK_MODEL（可选，默认 deepseek-chat）
 *   DEEPSEEK_API_BASE_URL（可选，默认 https://api.deepseek.com，勿尾斜杠）
 *
 * 与前端 `src/data/services.ts` 中的 name 保持一致；修改菜单时请同步更新下方列表与 JSON Schema enum。
 */

type Body = {
  prompt?: string
}

/** 返回给前端的稳定契约（与 src/utils/serviceAiRecommend.ts 对齐） */
type OkResponse = {
  schemaVersion: '1.0'
  serviceName: string
  category: 'nails' | 'lashes'
  confidence: 'high' | 'medium' | 'low'
  responseLanguage: 'zh' | 'en' | 'mixed'
  summary: string
  supportingPoints: string[]
  /** 纯文本拼接，便于搜索/复制 */
  why: string
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

/** 必须与 src/data/services.ts 的 `name` 完全一致 */
const ALLOWED_SERVICES = [
  'Classic Manicure',
  'Gel Manicure',
  'Nail Extension',
  'Classic Lash Extensions',
  'Hybrid Lash Extensions',
  'Lash Lift',
] as const

const SERVICE_CATEGORY: Record<(typeof ALLOWED_SERVICES)[number], 'nails' | 'lashes'> = {
  'Classic Manicure': 'nails',
  'Gel Manicure': 'nails',
  'Nail Extension': 'nails',
  'Classic Lash Extensions': 'lashes',
  'Hybrid Lash Extensions': 'lashes',
  'Lash Lift': 'lashes',
}

const SERVICE_CONTEXT = `Catalog (serviceName must be exactly one of these strings):
- Classic Manicure (nails): clean shaping, cuticles, classic polish; everyday neat look.
- Gel Manicure (nails): chip-resistant glossy gel, longer-lasting than regular polish.
- Nail Extension (nails): added length and sculpted shape for a bolder nail line.
- Classic Lash Extensions (lashes): one-by-one extensions, soft and natural for daily wear.
- Hybrid Lash Extensions (lashes): mix of classic + volume fans; fuller but still balanced.
- Lash Lift (lashes): lifts and curls natural lashes; no lash extensions attached.`

/** 目标 JSON 形状（写入 system 提示 + 服务端校验）；DeepSeek 使用 json_object 而非 API 内 json_schema */
const RECOMMENDATION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    schema_version: {
      type: 'string',
      enum: ['1.0'],
    },
    serviceName: {
      type: 'string',
      enum: [...ALLOWED_SERVICES],
    },
    confidence: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
    },
    responseLanguage: {
      type: 'string',
      enum: ['zh', 'en', 'mixed'],
    },
    summary: {
      type: 'string',
      minLength: 40,
      maxLength: 600,
    },
    supportingPoints: {
      type: 'array',
      minItems: 2,
      maxItems: 4,
      items: {
        type: 'string',
        minLength: 10,
        maxLength: 220,
      },
    },
  },
  required: [
    'schema_version',
    'serviceName',
    'confidence',
    'responseLanguage',
    'summary',
    'supportingPoints',
  ],
} as const

function coerceServiceName(raw: string): (typeof ALLOWED_SERVICES)[number] {
  const t = raw.trim()
  const exact = ALLOWED_SERVICES.find((s) => s === t)
  if (exact) return exact
  const ci = ALLOWED_SERVICES.find((s) => s.toLowerCase() === t.toLowerCase())
  if (ci) return ci
  const loose = ALLOWED_SERVICES.find(
    (s) =>
      t.toLowerCase().includes(s.toLowerCase()) ||
      s.toLowerCase().includes(t.toLowerCase())
  )
  return loose ?? 'Classic Lash Extensions'
}

type ModelPayload = {
  schema_version?: string
  serviceName?: string
  confidence?: string
  responseLanguage?: string
  summary?: string
  supportingPoints?: unknown
}

function isConfidence(v: string): v is OkResponse['confidence'] {
  return v === 'high' || v === 'medium' || v === 'low'
}

function isResponseLanguage(v: string): v is OkResponse['responseLanguage'] {
  return v === 'zh' || v === 'en' || v === 'mixed'
}

function normalizePayload(raw: ModelPayload): OkResponse | null {
  if (raw.schema_version !== '1.0') return null
  const serviceName = coerceServiceName(typeof raw.serviceName === 'string' ? raw.serviceName : '')
  const conf = typeof raw.confidence === 'string' ? raw.confidence : ''
  const lang = typeof raw.responseLanguage === 'string' ? raw.responseLanguage : ''
  const summary = typeof raw.summary === 'string' ? raw.summary.trim() : ''
  if (!isConfidence(conf) || !isResponseLanguage(lang) || summary.length < 40) return null

  if (!Array.isArray(raw.supportingPoints)) return null
  const points = raw.supportingPoints.filter(
    (p): p is string => typeof p === 'string' && p.trim().length >= 10
  )
  if (points.length < 2 || points.length > 4) return null

  const category = SERVICE_CATEGORY[serviceName]
  const why =
    `${summary}\n\n` +
    points
      .map((p, i) => `${i + 1}. ${p.trim()}`)
      .join('\n')

  return {
    schemaVersion: '1.0',
    serviceName,
    category,
    confidence: conf,
    responseLanguage: lang,
    summary,
    supportingPoints: points.map((p) => p.trim()),
    why,
  }
}

type ChatCompletionResponse = {
  choices?: Array<{
    message?: { content?: string | null; refusal?: string | null }
    finish_reason?: string
  }>
  error?: { message?: string; type?: string }
}

function stripMarkdownCodeFence(raw: string): string {
  let t = raw.trim()
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  }
  return t.trim()
}

function buildDeepSeekSystemPrompt(): string {
  const schemaJson = JSON.stringify(RECOMMENDATION_JSON_SCHEMA, null, 2)
  return `You are a beauty salon assistant. Recommend exactly ONE service from the catalog.

${SERVICE_CONTEXT}

You MUST reply with a single JSON object only (no markdown fences, no extra text). The word json is required by the API.

The JSON object MUST:
- Use exactly these property names: schema_version, serviceName, confidence, responseLanguage, summary, supportingPoints
- Match this JSON Schema (types, enums, lengths, array size):
${schemaJson}

Rules:
- schema_version must be "1.0"
- serviceName must be copied exactly from the allowed catalog names
- summary: 2–4 sentences in the customer's primary language (Chinese if they wrote mostly Chinese; English otherwise); length at least 40 characters
- supportingPoints: 2–4 distinct short strings (each at least 10 characters); add new information (fit, lifestyle, maintenance)—do not repeat the summary
- confidence: high when the request clearly maps to one service; low when ambiguous
- responseLanguage: zh, en, or mixed according to the customer's message`
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: Body = {}
  try {
    const text = await req.text()
    if (!text.trim()) {
      return new Response(JSON.stringify({ error: 'Empty body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    body = JSON.parse(text) as Body
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: `Invalid JSON: ${msg}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Missing prompt' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const apiKey = Deno.env.get('DEEPSEEK_API_KEY')?.trim()
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'DEEPSEEK_API_KEY is not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const model = Deno.env.get('DEEPSEEK_MODEL')?.trim() || 'deepseek-chat'
  const baseUrl = (Deno.env.get('DEEPSEEK_API_BASE_URL')?.trim() || 'https://api.deepseek.com').replace(
    /\/$/,
    ''
  )
  const url = `${baseUrl}/chat/completions`

  const systemPrompt = buildDeepSeekSystemPrompt()

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Customer request:\n${prompt}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.35,
        max_tokens: 1200,
      }),
    })

    const raw = await res.text()
    if (!res.ok) {
      console.error('[service-recommend] DeepSeek HTTP', res.status, raw)
      return new Response(
        JSON.stringify({ error: `DeepSeek error (${res.status})` }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    let completion: ChatCompletionResponse
    try {
      completion = JSON.parse(raw) as ChatCompletionResponse
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid DeepSeek response' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (completion.error?.message) {
      return new Response(
        JSON.stringify({ error: completion.error.message }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const rawContent = completion.choices?.[0]?.message?.content
    const content =
      typeof rawContent === 'string' && rawContent.trim()
        ? stripMarkdownCodeFence(rawContent)
        : ''

    if (!content) {
      console.error('[service-recommend] empty content', completion.choices?.[0]?.finish_reason)
      return new Response(JSON.stringify({ error: 'Empty model output' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let parsed: ModelPayload
    try {
      parsed = JSON.parse(content) as ModelPayload
    } catch {
      return new Response(JSON.stringify({ error: 'Model output was not valid JSON' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const out = normalizePayload(parsed)
    if (!out) {
      return new Response(JSON.stringify({ error: 'Model JSON failed server validation' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(out), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[service-recommend]', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
