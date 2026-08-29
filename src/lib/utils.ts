import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Tailwind-aware class merge used by every UI primitive. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** "Athena Behavioural Health" -> "AB" */
export function initials(name: string, max = 2): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => /[a-zA-Z0-9]/.test(p))
  if (parts.length === 0) return '?'
  return parts
    .slice(0, max)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export function truncate(value: string, length = 80): string {
  if (value.length <= length) return value
  return `${value.slice(0, length - 1).trimEnd()}…`
}

/** Deterministic accent key from a string — stable avatar colours per user. */
const AVATAR_KEYS = ['violet', 'teal', 'amber', 'rose', 'sky', 'emerald', 'indigo'] as const
export type AvatarKey = (typeof AVATAR_KEYS)[number]

export function avatarKeyFor(seed: string): AvatarKey {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000
  }
  return AVATAR_KEYS[hash % AVATAR_KEYS.length]!
}

export function pluralise(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`
}

/** Build a query string, dropping empty values so URLs stay clean. */
export function buildQuery(
  params: Record<string, string | number | undefined | null>,
): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === 'ALL') continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

/** Ensure an external link is safe to render in an anchor tag. */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withProtocol)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

/** Strip a URL down to something readable in a table cell. */
export function prettyUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '')
}
