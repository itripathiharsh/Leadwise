import Groq from 'groq-sdk'

let cachedGroqClient: Groq | null = null

function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey || apiKey.trim() === '') {
    return null
  }
  if (!cachedGroqClient) {
    cachedGroqClient = new Groq({ apiKey })
  }
  return cachedGroqClient
}

export interface AiCompletionOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  responseFormat?: 'json' | 'text'
}

/**
 * Robust AI Completion Provider.
 * Gracefully falls back to null if GROQ_API_KEY is not configured or if the call fails.
 */
export async function generateAiCompletion(
  systemPrompt: string,
  userPrompt: string,
  options: AiCompletionOptions = {},
): Promise<string | null> {
  const groq = getGroqClient()
  if (!groq) {
    return null
  }

  const model = options.model || process.env.GROQ_MODEL || 'openai/gpt-oss-120b'
  const temperature = options.temperature ?? 0.3
  const max_tokens = options.maxTokens ?? 1024

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000)

    const response = await groq.chat.completions.create(
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens,
        ...(options.responseFormat === 'json'
          ? { response_format: { type: 'json_object' } }
          : {}),
      },
      { signal: controller.signal as any },
    )

    clearTimeout(timeoutId)
    return response.choices[0]?.message?.content || null
  } catch (err) {
    console.warn('⚠️ Groq AI request fallback triggered:', err instanceof Error ? err.message : String(err))
    return null
  }
}
