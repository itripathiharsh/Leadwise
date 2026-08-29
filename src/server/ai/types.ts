/**
 * AI provider contract (spec §43).
 *
 * The application talks to `AIService`, never to Groq directly. Swapping in
 * OpenAI, a local model, or nothing at all is a matter of adding a provider —
 * no caller changes.
 */

export interface EodUserFact {
  name: string
  role: string
  calls: number
  emails: number
  linkedin: number
  meetings: number
  responses: number
  interested: number
  organisationsContacted: number
  activities: number
}

export interface EodKeyUpdateFact {
  organisation: string
  headline: string
  detail?: string
}

/**
 * The complete, already-computed set of facts handed to the model.
 * Everything here came from a database query.
 */
export interface EodFacts {
  dateKey: string
  dateLabel: string
  teamName: string
  metrics: {
    organisationsContacted: number
    calls: number
    emails: number
    linkedin: number
    meetings: number
    followUps: number
    notes: number
    responses: number
    interested: number
    rejected: number
    meetingsScheduled: number
    meetingsCompleted: number
    newOrganisations: number
    newContacts: number
    followUpsPending: number
    followUpsOverdue: number
    followUpsCompleted: number
  }
  perUser: EodUserFact[]
  keyUpdates: EodKeyUpdateFact[]
  /** Yesterday's headline numbers, for "up from"-style narrative only. */
  previous?: { organisationsContacted: number; responses: number; interested: number } | null
}

export interface EodNarrative {
  /** 2–4 sentence prose summary of the day. */
  summary: string
  /** Short bullets: notable progress, risks, tomorrow's focus. */
  highlights: string[]
}

export interface AiProvider {
  readonly name: string
  readonly model: string
  isConfigured(): boolean
  generateEodNarrative(facts: EodFacts, strictNoDigits?: boolean): Promise<EodNarrative>
}

export class AiUnavailableError extends Error {
  constructor(message = 'AI provider is not configured.') {
    super(message)
    this.name = 'AiUnavailableError'
  }
}
