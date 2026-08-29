import { prisma } from '@/lib/db'
import {
  normalizeDomain,
  normalizeEmail,
  normalizeLinkedIn,
  normalizeOrgName,
  normalizePersonName,
  normalizePhone,
} from '@/lib/normalize'

/**
 * Duplicate detection (spec §22).
 *
 * The rule throughout the app: never silently create a duplicate, and never
 * silently block one either. We surface the matches we found with a reason, and
 * the user decides. Import uses the same functions so behaviour is identical
 * whether a record arrives through the form or a spreadsheet.
 */

export type DuplicateReason =
  | 'EXACT_NAME'
  | 'SIMILAR_NAME'
  | 'DOMAIN'
  | 'EMAIL'
  | 'PHONE'
  | 'LINKEDIN'

const REASON_LABEL: Record<DuplicateReason, string> = {
  EXACT_NAME: 'Same name',
  SIMILAR_NAME: 'Very similar name',
  DOMAIN: 'Same website domain',
  EMAIL: 'Same email address',
  PHONE: 'Same phone number',
  LINKEDIN: 'Same LinkedIn profile',
}

export function duplicateReasonLabel(reason: DuplicateReason): string {
  return REASON_LABEL[reason]
}

export interface OrganisationDuplicate {
  id: string
  name: string
  website: string | null
  status: string
  reasons: DuplicateReason[]
  assignedTo: { id: string; name: string } | null
  lastContactedAt: Date | null
  contactCount: number
}

export interface OrganisationDuplicateQuery {
  name: string
  website?: string | null
  /** Ignore this record (used when editing). */
  excludeId?: string
}

export async function findOrganisationDuplicates(
  query: OrganisationDuplicateQuery,
): Promise<OrganisationDuplicate[]> {
  const nameNormalized = normalizeOrgName(query.name)
  const domain = normalizeDomain(query.website)

  if (!nameNormalized && !domain) return []

  const candidates = await prisma.organisation.findMany({
    where: {
      deletedAt: null,
      ...(query.excludeId ? { id: { not: query.excludeId } } : {}),
      OR: [
        ...(nameNormalized ? [{ nameNormalized }] : []),
        ...(nameNormalized ? [{ name: { equals: query.name.trim(), mode: 'insensitive' as const } }] : []),
        ...(domain ? [{ domain }] : []),
      ],
    },
    select: {
      id: true,
      name: true,
      nameNormalized: true,
      website: true,
      domain: true,
      status: true,
      lastContactedAt: true,
      assignedTo: { select: { id: true, name: true } },
      _count: { select: { contacts: { where: { deletedAt: null } } } },
    },
    take: 10,
  })

  return candidates.map((candidate) => {
    const reasons: DuplicateReason[] = []
    if (candidate.name.trim().toLowerCase() === query.name.trim().toLowerCase()) {
      reasons.push('EXACT_NAME')
    } else if (nameNormalized && candidate.nameNormalized === nameNormalized) {
      reasons.push('SIMILAR_NAME')
    }
    if (domain && candidate.domain === domain) reasons.push('DOMAIN')

    return {
      id: candidate.id,
      name: candidate.name,
      website: candidate.website,
      status: candidate.status,
      reasons,
      assignedTo: candidate.assignedTo,
      lastContactedAt: candidate.lastContactedAt,
      contactCount: candidate._count.contacts,
    }
  })
}

export interface ContactDuplicate {
  id: string
  name: string
  designation: string | null
  email: string | null
  phone: string | null
  reasons: DuplicateReason[]
  organisation: { id: string; name: string }
  /** True when the match sits on a different organisation. */
  isCrossOrganisation: boolean
}

export interface ContactDuplicateQuery {
  organisationId: string
  name?: string
  email?: string | null
  phone?: string | null
  linkedinUrl?: string | null
  excludeId?: string
}

export async function findContactDuplicates(
  query: ContactDuplicateQuery,
): Promise<ContactDuplicate[]> {
  const emailNormalized = normalizeEmail(query.email)
  const phoneNormalized = normalizePhone(query.phone)
  const linkedinHandle = normalizeLinkedIn(query.linkedinUrl)
  const nameNormalized = query.name ? normalizePersonName(query.name) : null

  const clauses = [
    ...(emailNormalized ? [{ emailNormalized }] : []),
    ...(phoneNormalized ? [{ phoneNormalized }] : []),
    ...(linkedinHandle ? [{ linkedinHandle }] : []),
    // A same-named person is only suspicious inside the same organisation.
    ...(nameNormalized ? [{ nameNormalized, organisationId: query.organisationId }] : []),
  ]

  if (clauses.length === 0) return []

  const candidates = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      ...(query.excludeId ? { id: { not: query.excludeId } } : {}),
      OR: clauses,
    },
    select: {
      id: true,
      name: true,
      nameNormalized: true,
      designation: true,
      email: true,
      emailNormalized: true,
      phone: true,
      phoneNormalized: true,
      linkedinHandle: true,
      organisationId: true,
      organisation: { select: { id: true, name: true } },
    },
    take: 10,
  })

  return candidates.map((candidate) => {
    const reasons: DuplicateReason[] = []
    if (emailNormalized && candidate.emailNormalized === emailNormalized) reasons.push('EMAIL')
    if (phoneNormalized && candidate.phoneNormalized === phoneNormalized) reasons.push('PHONE')
    if (linkedinHandle && candidate.linkedinHandle === linkedinHandle) reasons.push('LINKEDIN')
    if (
      nameNormalized &&
      candidate.nameNormalized === nameNormalized &&
      candidate.organisationId === query.organisationId
    ) {
      reasons.push('EXACT_NAME')
    }

    return {
      id: candidate.id,
      name: candidate.name,
      designation: candidate.designation,
      email: candidate.email,
      phone: candidate.phone,
      reasons,
      organisation: candidate.organisation,
      isCrossOrganisation: candidate.organisationId !== query.organisationId,
    }
  })
}

/** Human sentence for the duplicate warning banner. */
export function describeDuplicates(reasons: DuplicateReason[]): string {
  if (reasons.length === 0) return 'Possible duplicate'
  return reasons.map(duplicateReasonLabel).join(' · ')
}
