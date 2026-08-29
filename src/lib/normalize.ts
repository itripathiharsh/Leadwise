/**
 * Normalisation helpers backing duplicate detection.
 *
 * Every "shadow" column in the schema (nameNormalized, domain, emailNormalized,
 * phoneNormalized, linkedinHandle) is produced here. Detection quality depends
 * entirely on these being applied consistently on create, update and import —
 * so they live in one place and nowhere else.
 */

/** Legal-entity suffixes that shouldn't make two records look different. */
const COMPANY_SUFFIXES = [
  'pvt ltd', 'pvt. ltd.', 'private limited', 'pvt', 'ltd', 'limited',
  'llp', 'llc', 'inc', 'incorporated', 'corp', 'corporation', 'co',
  'company', 'foundation', 'trust', 'society', 'ngo',
  'clinic', 'clinics', 'hospital', 'hospitals', 'centre', 'center',
]

/**
 * Aggressive name key for duplicate matching:
 *   "Athena Behavioural Health Pvt. Ltd." -> "athena behavioural health"
 *   "The  Athena-Behavioural  Health!"    -> "athena behavioural health"
 */
export function normalizeOrgName(raw: string): string {
  let value = raw
    .normalize('NFKD')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (value.startsWith('the ')) value = value.slice(4)

  // Strip trailing legal/facility suffixes, repeatedly ("... clinic pvt ltd").
  let changed = true
  while (changed) {
    changed = false
    for (const suffix of COMPANY_SUFFIXES) {
      if (value.endsWith(` ${suffix}`)) {
        value = value.slice(0, -(suffix.length + 1)).trim()
        changed = true
      }
    }
  }

  return value.replace(/\s+/g, ' ').trim()
}

/** Person names get a lighter touch — only case/punctuation/whitespace. */
export function normalizePersonName(raw: string): string {
  return raw
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Bare registrable hostname from anything a user might paste.
 *   "https://www.Athena.com/about?x=1" -> "athena.com"
 *   "athena.com"                        -> "athena.com"
 */
export function normalizeDomain(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  let host = trimmed
  try {
    const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    host = new URL(withProtocol).hostname
  } catch {
    // Not URL-shaped; fall back to the raw token before any slash.
    host = trimmed.split('/')[0] ?? trimmed
  }

  host = host.toLowerCase().replace(/^www\./, '').replace(/\.$/, '')
  // A domain must contain a dot and no spaces to be usable as a match key.
  if (!host.includes('.') || /\s/.test(host)) return null
  return host
}

/** Store websites with a protocol so links always work. */
export function normalizeWebsite(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withProtocol)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

export function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null
  const value = raw.trim().toLowerCase()
  return value ? value : null
}

/**
 * Phone match key: digits only, keeping the last 10 significant digits so that
 * "+91 98765 43210", "098765 43210" and "9876543210" all collide.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 7) return null
  return digits.length > 10 ? digits.slice(-10) : digits
}

/** Keep the phone as typed for display, but tidied. */
export function cleanPhoneDisplay(raw: string | null | undefined): string | null {
  if (!raw) return null
  const value = raw.replace(/[^\d+\-()\s]/g, '').replace(/\s+/g, ' ').trim()
  return value ? value : null
}

/**
 * LinkedIn identity key.
 *   "https://www.linkedin.com/in/John-Doe-123/"      -> "in/john-doe-123"
 *   "linkedin.com/company/athena-behavioural"        -> "company/athena-behavioural"
 */
export function normalizeLinkedIn(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  let pathname = trimmed
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const url = new URL(withProtocol)
    if (!/(^|\.)linkedin\.com$/i.test(url.hostname)) {
      // Not a LinkedIn URL — no reliable handle to extract.
      return null
    }
    pathname = url.pathname
  } catch {
    pathname = trimmed.replace(/^.*linkedin\.com/i, '')
  }

  const cleaned = pathname
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/+/g, '/')
  if (!cleaned) return null

  const segments = cleaned.split('/')
  // Keep "in/slug" or "company/slug"; ignore deeper paths like /in/x/details.
  if (segments.length >= 2 && ['in', 'company', 'school', 'pub'].includes(segments[0]!)) {
    return `${segments[0]}/${segments[1]}`
  }
  return segments[0] ?? null
}

/** Full LinkedIn URL for storage/display, when the input looks like one. */
export function normalizeLinkedInUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const handle = normalizeLinkedIn(raw)
  if (handle) return `https://www.linkedin.com/${handle}`
  const trimmed = raw.trim()
  return trimmed ? trimmed : null
}

/** Collapse whitespace and drop empties — used on every free-text field. */
export function cleanText(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null
  const value = String(raw).replace(/\s+/g, ' ').trim()
  return value ? value : null
}

/** Preserve intentional line breaks in notes, but trim trailing noise. */
export function cleanMultiline(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null
  const value = String(raw)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .trim()
  return value ? value : null
}
