import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { CurrentUser } from '@/lib/auth/current-user'
import { contactScope, organisationScope } from '@/lib/rbac'
import {
  normalizeDomain,
  normalizeEmail,
  normalizeOrgName,
  normalizePersonName,
  normalizePhone,
} from '@/lib/normalize'

/**
 * Global search (spec §21) — organisation name, contact name, email, phone and
 * domain, and it has to feel instant.
 *
 * Speed comes from shape, not luck: when the query looks like a phone number, an
 * email or a domain we hit the normalised, indexed shadow columns exactly rather
 * than running `contains` over free text. Both halves are scoped to what the
 * viewer is allowed to see.
 */

export interface OrganisationHit {
  id: string
  name: string
  status: string
  priority: string
  location: string | null
  category: string | null
  lastContactedAt: Date | null
  assignedTo: { id: string; name: string; avatarColor: string } | null
  contactCount: number
}

export interface ContactHit {
  id: string
  name: string
  designation: string | null
  email: string | null
  phone: string | null
  isDecisionMaker: boolean
  status: string
  organisation: { id: string; name: string }
}

export interface SearchResults {
  query: string
  organisations: OrganisationHit[]
  contacts: ContactHit[]
  counts: { organisations: number; contacts: number }
}

export const MIN_SEARCH_LENGTH = 2

function looksLikePhone(q: string): boolean {
  const digits = q.replace(/\D/g, '')
  return digits.length >= 6 && /^[\d\s+()-]+$/.test(q)
}

export function organisationSearchOr(raw: string): Prisma.OrganisationWhereInput[] {
  const q = raw.trim()
  const or: Prisma.OrganisationWhereInput[] = [
    { name: { contains: q, mode: 'insensitive' } },
    { location: { contains: q, mode: 'insensitive' } },
    { category: { contains: q, mode: 'insensitive' } },
  ]

  const nameKey = normalizeOrgName(q)
  if (nameKey) or.push({ nameNormalized: { contains: nameKey } })

  const domain = normalizeDomain(q)
  if (domain) or.push({ domain: { contains: domain } })

  const email = normalizeEmail(q)
  if (email) or.push({ generalEmail: { equals: email, mode: 'insensitive' } })

  if (looksLikePhone(q)) {
    const phone = normalizePhone(q)
    if (phone) {
      or.push({ generalPhone: { contains: phone } })
      or.push({ contacts: { some: { deletedAt: null, phoneNormalized: phone } } })
    }
  }

  // An organisation is also a match when one of its people matches.
  or.push({
    contacts: {
      some: {
        deletedAt: null,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          ...(email ? [{ emailNormalized: email }] : []),
        ],
      },
    },
  })

  return or
}

export function contactSearchOr(raw: string): Prisma.ContactWhereInput[] {
  const q = raw.trim()
  const or: Prisma.ContactWhereInput[] = [
    { name: { contains: q, mode: 'insensitive' } },
    { designation: { contains: q, mode: 'insensitive' } },
    { email: { contains: q, mode: 'insensitive' } },
    { organisation: { name: { contains: q, mode: 'insensitive' } } },
  ]

  const nameKey = normalizePersonName(q)
  if (nameKey) or.push({ nameNormalized: { contains: nameKey } })

  const email = normalizeEmail(q)
  if (email) or.push({ emailNormalized: email })

  if (looksLikePhone(q)) {
    const phone = normalizePhone(q)
    if (phone) or.push({ phoneNormalized: { contains: phone } })
  }

  return or
}

/** Command-palette / header search. Small `take` — this runs on every keystroke. */
export async function search(
  user: Pick<CurrentUser, 'id' | 'role'>,
  rawQuery: string,
  options: { take?: number } = {},
): Promise<SearchResults> {
  const query = rawQuery.trim()
  if (query.length < MIN_SEARCH_LENGTH) {
    return { query, organisations: [], contacts: [], counts: { organisations: 0, contacts: 0 } }
  }

  const take = Math.min(20, Math.max(3, options.take ?? 6))

  const orgWhere: Prisma.OrganisationWhereInput = {
    deletedAt: null,
    OR: organisationSearchOr(query),
    AND: [organisationScope(user)],
  }
  const contactWhere: Prisma.ContactWhereInput = {
    deletedAt: null,
    organisation: { deletedAt: null },
    OR: contactSearchOr(query),
    AND: [contactScope(user)],
  }

  const [organisations, contacts, orgCount, contactCount] = await Promise.all([
    prisma.organisation.findMany({
      where: orgWhere,
      select: {
        id: true,
        name: true,
        status: true,
        priority: true,
        location: true,
        category: true,
        lastContactedAt: true,
        assignedTo: { select: { id: true, name: true, avatarColor: true } },
        _count: { select: { contacts: { where: { deletedAt: null } } } },
      },
      orderBy: [{ lastContactedAt: { sort: 'desc', nulls: 'last' } }, { name: 'asc' }],
      take,
    }),
    prisma.contact.findMany({
      where: contactWhere,
      select: {
        id: true,
        name: true,
        designation: true,
        email: true,
        phone: true,
        isDecisionMaker: true,
        status: true,
        organisation: { select: { id: true, name: true } },
      },
      orderBy: [{ isDecisionMaker: 'desc' }, { name: 'asc' }],
      take,
    }),
    prisma.organisation.count({ where: orgWhere }),
    prisma.contact.count({ where: contactWhere }),
  ])

  return {
    query,
    organisations: organisations.map((org) => ({
      id: org.id,
      name: org.name,
      status: org.status,
      priority: org.priority,
      location: org.location,
      category: org.category,
      lastContactedAt: org.lastContactedAt,
      assignedTo: org.assignedTo,
      contactCount: org._count.contacts,
    })),
    contacts,
    counts: { organisations: orgCount, contacts: contactCount },
  }
}
