/**
 * Centralised, lazily-validated environment access.
 *
 * Everything is read through a getter so that a missing secret surfaces as a
 * clear runtime error on the request that needs it, rather than crashing the
 * production build at module-evaluation time.
 *
 * Nothing in this file may be imported from a client component.
 */

function required(name: string, value: string | undefined, hint?: string): string {
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable ${name}.` +
        (hint ? ` ${hint}` : '') +
        ' See .env.example.',
    )
  }
  return value
}

export const env = {
  get databaseUrl(): string {
    return required('DATABASE_URL', process.env.DATABASE_URL)
  },

  get authSecret(): string {
    const secret = required(
      'AUTH_SECRET',
      process.env.AUTH_SECRET,
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"',
    )
    if (secret.length < 32) {
      throw new Error('AUTH_SECRET must be at least 32 characters long.')
    }
    return secret
  },

  get sessionDays(): number {
    const raw = process.env.AUTH_SESSION_DAYS
    const parsed = raw ? Number.parseInt(raw, 10) : 7
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 7
  },

  /** IANA timezone that defines "today" for dashboards, follow-ups and EOD. */
  get timezone(): string {
    return process.env.APP_TIMEZONE?.trim() || 'Asia/Kolkata'
  },

  get aiProvider(): 'groq' | 'none' {
    const raw = (process.env.AI_PROVIDER || 'groq').toLowerCase()
    if (raw === 'none') return 'none'
    return 'groq'
  },

  get groqApiKey(): string | undefined {
    const key = process.env.GROQ_API_KEY?.trim()
    return key ? key : undefined
  },

  get groqModel(): string {
    return process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile'
  },

  get eodWhatsappNumber(): string | undefined {
    const raw = process.env.EOD_WHATSAPP_NUMBER?.replace(/\D/g, '')
    return raw ? raw : undefined
  },

  get isProduction(): boolean {
    return process.env.NODE_ENV === 'production'
  },

  get seedPassword(): string {
    const pass = process.env.SEED_PASSWORD
    if (!pass || pass.trim() === '') throw new Error('Missing required environment variable SEED_PASSWORD. See .env.example.')
    return pass
  },
}
