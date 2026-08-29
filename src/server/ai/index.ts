import { env } from '@/lib/env'
import { GroqProvider } from './groq-provider'
import { AiUnavailableError, type AiProvider, type EodFacts, type EodNarrative } from './types'

export * from './types'

/**
 * AIService — the only entry point the application uses for generative text
 * (spec §43). Providers are swappable; nothing outside this folder knows Groq
 * exists.
 *
 * The service also enforces spec §26: the model may write prose, never numbers
 * of its own. Anything it returns is checked against the facts it was given, and
 * a violation means we discard the narrative rather than publish a wrong figure.
 */

let cached: AiProvider | null | undefined

function resolveProvider(): AiProvider | null {
  if (cached !== undefined) return cached
  cached = env.aiProvider === 'groq' ? new GroqProvider() : null
  return cached
}

export interface NarrativeResult {
  narrative: EodNarrative | null
  provider: string | null
  model: string | null
  /** Present when the narrative was rejected or the call failed. */
  error: string | null
}

export const AIService = {
  isConfigured(): boolean {
    const provider = resolveProvider()
    return Boolean(provider?.isConfigured())
  },

  describe(): { provider: string; model: string | null; configured: boolean } {
    const provider = resolveProvider()
    if (!provider) return { provider: 'none', model: null, configured: false }
    return {
      provider: provider.name,
      model: provider.model,
      configured: provider.isConfigured(),
    }
  },

  /**
   * Ask the provider for the EOD narrative.
   *
   * Never throws: a failure here must not stop the report from being generated,
   * because the report's numbers don't come from the AI in the first place. The
   * caller falls back to the deterministic narrative and surfaces `error`.
   */
  async eodNarrative(facts: EodFacts): Promise<NarrativeResult> {
    const provider = resolveProvider()
    if (!provider) return { narrative: null, provider: null, model: null, error: 'AI is disabled.' }
    if (!provider.isConfigured()) {
      return {
        narrative: null,
        provider: provider.name,
        model: provider.model,
        error: 'No AI API key configured.',
      }
    }

    const meta = { provider: provider.name, model: provider.model }
    let lastError = 'AI narrative unavailable.'

    // Attempt 1 allows quoting real figures; attempt 2 forbids digits entirely.
    for (const strictNoDigits of [false, true]) {
      try {
        const narrative = await provider.generateEodNarrative(facts, strictNoDigits)
        const violation = findNumberViolation(narrative, facts)
        if (!violation) return { narrative, ...meta, error: null }
        lastError = `AI narrative rejected: ${violation}`
        console.warn(`[ai] ${lastError}`)
      } catch (error) {
        lastError =
          error instanceof AiUnavailableError
            ? error.message
            : `AI request failed: ${error instanceof Error ? error.message : 'unknown error'}`
        console.error('[ai] eodNarrative', error)
        if (error instanceof AiUnavailableError) break
      }
    }

    return { narrative: null, ...meta, error: lastError }
  },
}

// ── The "no invented numbers" guard (spec §26) ───────────────────────────────

/** Every digit run present in the facts we handed the model. */
function allowedNumbers(facts: EodFacts): Set<string> {
  const allowed = new Set<string>()
  for (const match of JSON.stringify(facts).matchAll(/\d+/g)) {
    allowed.add(stripLeadingZeros(match[0]))
  }
  return allowed
}

function stripLeadingZeros(value: string): string {
  const trimmed = value.replace(/^0+(?=\d)/, '')
  return trimmed === '' ? '0' : trimmed
}

/**
 * Labels whose counts the model must never get wrong. A number attached to one
 * of these words has to match the team total or one person's total exactly.
 */
const LABEL_SOURCES: Array<{ pattern: RegExp; values: (f: EodFacts) => number[] }> = [
  {
    pattern: /calls?/i,
    values: (f) => [f.metrics.calls, ...f.perUser.map((u) => u.calls)],
  },
  {
    pattern: /emails?/i,
    values: (f) => [f.metrics.emails, ...f.perUser.map((u) => u.emails)],
  },
  {
    pattern: /linkedin/i,
    values: (f) => [f.metrics.linkedin, ...f.perUser.map((u) => u.linkedin)],
  },
  {
    pattern: /meetings?/i,
    values: (f) => [
      f.metrics.meetings,
      f.metrics.meetingsScheduled,
      f.metrics.meetingsCompleted,
      ...f.perUser.map((u) => u.meetings),
    ],
  },
  {
    pattern: /responses?|replies|replied/i,
    values: (f) => [f.metrics.responses, ...f.perUser.map((u) => u.responses)],
  },
  {
    pattern: /organisations?|organizations?|orgs?/i,
    values: (f) => [
      f.metrics.organisationsContacted,
      f.metrics.newOrganisations,
      f.metrics.interested,
      f.metrics.rejected,
      ...f.perUser.map((u) => u.organisationsContacted),
    ],
  },
  {
    pattern: /follow-?ups?/i,
    values: (f) => [
      f.metrics.followUps,
      f.metrics.followUpsPending,
      f.metrics.followUpsOverdue,
      f.metrics.followUpsCompleted,
    ],
  },
]

const NUMBER_WORD = /(\d[\d,]*)\s+([A-Za-z-]+)/g

/**
 * Returns a human-readable reason when the narrative contains a number it was
 * not given, or attaches a real number to the wrong label. `null` means clean.
 */
export function findNumberViolation(narrative: EodNarrative, facts: EodFacts): string | null {
  const text = [narrative.summary, ...narrative.highlights].join('\n')

  // Percentages, ratios and averages are always the model's own arithmetic.
  if (/%|per cent|percent/i.test(text)) return 'contains a percentage'

  const allowed = allowedNumbers(facts)
  for (const match of text.matchAll(/\d[\d,]*/g)) {
    const value = stripLeadingZeros(match[0].replace(/,/g, ''))
    if (!allowed.has(value)) return `number "${match[0]}" is not in the report data`
  }

  for (const match of text.matchAll(NUMBER_WORD)) {
    const value = Number.parseInt(match[1]!.replace(/,/g, ''), 10)
    if (!Number.isFinite(value)) continue
    const label = match[2]!
    for (const source of LABEL_SOURCES) {
      // Anchor the label so "callback" doesn't count as "calls".
      if (!new RegExp(`^(?:${source.pattern.source})$`, 'i').test(label)) continue
      if (!source.values(facts).includes(value)) {
        return `"${match[0]}" does not match the computed figures`
      }
    }
  }

  return null
}
