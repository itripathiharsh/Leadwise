import { normalizeDomain, normalizeOrgName, normalizeEmail } from '@/lib/normalize'
import { prisma } from '@/lib/db'

export interface DomainDetectionResult {
  detectedDomain: string | null
  suggestedOrgName: string | null
  existingOrg: {
    id: string
    name: string
    status: string
    assignedToName: string | null
  } | null
}

const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'rediffmail.com',
  'protonmail.com',
])

/**
 * Deterministically extracts and detects organisation from an email address (Zero Cost).
 */
export async function detectOrgFromEmail(email: string): Promise<DomainDetectionResult> {
  const normalized = normalizeEmail(email)
  if (!normalized || !normalized.includes('@')) {
    return { detectedDomain: null, suggestedOrgName: null, existingOrg: null }
  }

  const domain = normalized.split('@')[1].toLowerCase()
  if (PUBLIC_EMAIL_DOMAINS.has(domain)) {
    return { detectedDomain: domain, suggestedOrgName: null, existingOrg: null }
  }

  // Generate readable org name from domain (e.g. "athenabehavioural.com" -> "Athena Behavioural")
  const baseName = domain.split('.')[0]
  const cleanName = baseName
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

  // Check if organisation already exists
  let existing = null
  try {
    existing = await prisma.organisation.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { domain: domain },
          { nameNormalized: normalizeOrgName(cleanName) },
        ],
      },
      select: {
        id: true,
        name: true,
        status: true,
        assignedTo: { select: { name: true } },
      },
    })
  } catch {
    // Graceful offline fallback
  }

  return {
    detectedDomain: domain,
    suggestedOrgName: cleanName,
    existingOrg: existing
      ? {
          id: existing.id,
          name: existing.name,
          status: existing.status,
          assignedToName: existing.assignedTo?.name || null,
        }
      : null,
  }
}
