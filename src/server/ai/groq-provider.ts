import Groq from 'groq-sdk'
import { env } from '@/lib/env'
import { AiUnavailableError, type AiProvider, type EodFacts, type EodNarrative } from './types'

/**
 * Groq provider — free-tier friendly, OpenAI-compatible chat completions.
 *
 * The API key is read from the environment at call time and never leaves the
 * server (spec §42). If it isn't set, `isConfigured()` returns false and the EOD
 * pipeline quietly uses its deterministic narrative instead.
 */
export class GroqProvider implements AiProvider {
  readonly name = 'groq'

  get model(): string {
    return env.groqModel
  }

  isConfigured(): boolean {
    return Boolean(env.groqApiKey)
  }

  async generateEodNarrative(facts: EodFacts, strictNoDigits = false): Promise<EodNarrative> {
    const apiKey = env.groqApiKey
    if (!apiKey) throw new AiUnavailableError()

    const client = new Groq({ apiKey, timeout: 20_000, maxRetries: 1 })

    const completion = await client.chat.completions.create({
      model: this.model,
      temperature: 0.4,
      max_tokens: 700,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt(strictNoDigits) },
        { role: 'user', content: JSON.stringify(facts, null, 2) },
      ],
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) throw new Error('Empty response from Groq')

    return parseNarrative(raw)
  }
}

function systemPrompt(strictNoDigits: boolean): string {
  return [
    'You are the reporting assistant for Leadwise, whose team does partnership outreach to partner organisations, clinics, schools, NGOs and enterprises.',
    'You will receive a JSON object of FACTS already computed from the CRM database for a single working day.',
    '',
    'Your job is to write the qualitative narrative of the end-of-day report. Nothing else.',
    '',
    'HARD RULES:',
    '- Never state a number that is not present in the FACTS. Do not compute totals, averages, percentages, ratios or comparisons of your own.',
    strictNoDigits
      ? '- Do not use digits at all. Describe volume in words ("a steady day of calling", "most of the team", "a handful of replies").'
      : '- If you mention a quantity, copy the exact number from the FACTS. When in doubt, describe it in words instead.',
    '- Never invent an organisation name, a person, an outcome or an event. Only use names present in the FACTS.',
    '- Do not congratulate, do not use exclamation marks, do not use emoji.',
    '- Write in plain British English, calm and operational, as an experienced sales manager would brief a founder.',
    '',
    'Return JSON only, exactly this shape:',
    '{"summary": "2 to 4 sentences describing how the day went and what it means.", "highlights": ["3 to 5 short bullets, each under 120 characters, covering notable progress, any risk or blocker (e.g. overdue follow-ups, no responses on a channel), and what the team should focus on tomorrow."]}',
  ].join('\n')
}

function parseNarrative(raw: string): EodNarrative {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Some models wrap JSON in prose or a code fence; recover the object.
    const match = /\{[\s\S]*\}/.exec(raw)
    if (!match) throw new Error('Groq response was not JSON')
    parsed = JSON.parse(match[0])
  }

  if (typeof parsed !== 'object' || parsed === null) throw new Error('Groq response was not an object')

  const record = parsed as Record<string, unknown>
  const summary = typeof record.summary === 'string' ? record.summary.trim() : ''
  const highlights = Array.isArray(record.highlights)
    ? record.highlights
        .filter((h): h is string => typeof h === 'string')
        .map((h) => h.trim().replace(/^[-•*]\s*/, ''))
        .filter(Boolean)
        .slice(0, 6)
    : []

  if (!summary) throw new Error('Groq response had no summary')
  return { summary, highlights }
}
