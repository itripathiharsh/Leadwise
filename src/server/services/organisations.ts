import type { OrgStatus, Prisma, Priority } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { CurrentUser } from '@/lib/auth/current-user'
import {
  assertCan,
  can,
  canWriteOrganisation,
  ForbiddenError,
  organisationScope,
} from '@/lib/rbac'
import {
  normalizeDomain,
  normalizeEmail,
  normalizeLinkedInUrl,
  normalizeOrgName,
  normalizePersonName,
  normalizePhone,
  normalizeWebsite,
} from '@/lib/normalize'
import { ORG_STATUS_META } from '@/lib/constants'
import { addDaysToKey, startOfDayUtc, todayKey } from '@/lib/dates'
import type { OrganisationCreateInput, OrganisationUpdateInput } from '@/lib/validation'
import { NotFoundError } from '@/server/errors'
import { writeAudit } from './audit'
import { findOrganisationDuplicates, type OrganisationDuplicate } from './duplicates'
import { recomputeOrganisationCaches } from './caches'
import { createNotification, notifyOwnersAndTLs } from './notifications'

/**
 * Organisation service (spec §5, §8, §18, §19, §22).
 *
 * Read paths always compose `organisationScope(user)` into the query so an
 * intern's list can never contain another intern's organisations. Write paths
 * call `assertCan` / `canWriteOrganisation` — the UI hiding a button is never
 * the security boundary.
 */

// ── Selections ───────────────────────────────────────────────────────────────

const listSelect = {
  id: true,
  name: true,
  category: true,
  website: true,
  domain: true,
  location: true,
  priority: true,
  status: true,
  lastContactedAt: true,
  nextFollowupAt: true,
  activityCount: true,
  createdAt: true,
  updatedAt: true,
  assignedTo: { select: { id: true, name: true, avatarColor: true, role: true } },
  _count: { select: { contacts: { where: { deletedAt: null } } } },
} satisfies Prisma.OrganisationSelect

export type OrganisationListItem = Prisma.OrganisationGetPayload<{ select: typeof listSelect }>

// ── Filters ──────────────────────────────────────────────────────────────────

export type OrganisationSort =
  | 'recent'
  | 'created'
  | 'name'
  | 'lastContacted'
  | 'stale'
  | 'priority'
  | 'status'
  | 'followup'
  | 'activity'

export type FollowUpFilter = 'ANY' | 'OVERDUE' | 'TODAY' | 'WEEK' | 'NONE'

export interface OrganisationListParams {
  q?: string
  status?: OrgStatus[]
  priority?: Priority[]
  /** user id, 'UNASSIGNED', or undefined for no filter */
  assignee?: string
  category?: string
  followUp?: FollowUpFilter
  sort?: OrganisationSort
  page?: number
  pageSize?: number
}

export const ORGANISATION_PAGE_SIZE = 25

/** Free-text search clause shared by the list page and global search (spec §21). */
export function organisationSearchClause(raw: string): Prisma.OrganisationWhereInput | null {
  const q = raw.trim()
  if (q.length < 2) return null

  const digits = q.replace(/\D/g, '')
  const phoneKey = digits.length >= 5 ? normalizePhone(q) : null
  const nameKey = normalizeOrgName(q)

  const clauses: Prisma.OrganisationWhereInput[] = [
    { name: { contains: q, mode: 'insensitive' } },
    ...(nameKey ? [{ nameNormalized: { contains: nameKey } }] : []),
    { domain: { contains: normalizeDomain(q) ?? q.toLowerCase() } },
    { location: { contains: q, mode: 'insensitive' } },
    { category: { contains: q, mode: 'insensitive' } },
    { generalEmail: { contains: q, mode: 'insensitive' } },
    {
      contacts: {
        some: {
          deletedAt: null,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            ...(phoneKey ? [{ phoneNormalized: { contains: phoneKey } }] : []),
          ],
        },
      },
    },
  ]

  if (phoneKey) clauses.push({ generalPhone: { contains: q } })

  return { OR: clauses }
}

function followUpClause(filter: FollowUpFilter | undefined): Prisma.OrganisationWhereInput | null {
  if (!filter || filter === 'ANY') return null
  const today = todayKey()

  switch (filter) {
    case 'NONE':
      return { nextFollowupAt: null }
    case 'OVERDUE':
      return { nextFollowupAt: { lt: startOfDayUtc(today) } }
    case 'TODAY':
      return {
        nextFollowupAt: { gte: startOfDayUtc(today), lt: startOfDayUtc(addDaysToKey(today, 1)) },
      }
    case 'WEEK':
      return {
        nextFollowupAt: { gte: startOfDayUtc(today), lt: startOfDayUtc(addDaysToKey(today, 8)) },
      }
  }
}

function orderFor(sort: OrganisationSort = 'recent'): Prisma.OrganisationOrderByWithRelationInput[] {
  switch (sort) {
    case 'name':
      return [{ name: 'asc' }]
    case 'created':
      return [{ createdAt: 'desc' }]
    case 'lastContacted':
      return [{ lastContactedAt: { sort: 'desc', nulls: 'last' } }, { updatedAt: 'desc' }]
    case 'stale':
      return [{ lastContactedAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }]
    case 'priority':
      return [{ priority: 'asc' }, { updatedAt: 'desc' }]
    case 'status':
      return [{ status: 'asc' }, { updatedAt: 'desc' }]
    case 'followup':
      return [{ nextFollowupAt: { sort: 'asc', nulls: 'last' } }, { priority: 'asc' }]
    case 'activity':
      return [{ activityCount: 'desc' }, { updatedAt: 'desc' }]
    case 'recent':
    default:
      return [{ updatedAt: 'desc' }]
  }
}

export function buildOrganisationWhere(
  user: Pick<CurrentUser, 'id' | 'role'>,
  params: OrganisationListParams,
): Prisma.OrganisationWhereInput {
  const and: Prisma.OrganisationWhereInput[] = [organisationScope(user)]

  if (params.q) {
    const clause = organisationSearchClause(params.q)
    if (clause) and.push(clause)
  }

  const followUp = followUpClause(params.followUp)
  if (followUp) and.push(followUp)

  if (params.assignee === 'UNASSIGNED') {
    and.push({ assignedToId: null })
  } else if (params.assignee) {
    and.push({ assignedToId: params.assignee })
  }

  return {
    deletedAt: null,
    ...(params.status?.length ? { status: { in: params.status } } : {}),
    ...(params.priority?.length ? { priority: { in: params.priority } } : {}),
    ...(params.category ? { category: { equals: params.category, mode: 'insensitive' } } : {}),
    AND: and,
  }
}

export async function listOrganisations(
  user: Pick<CurrentUser, 'id' | 'role'>,
  params: OrganisationListParams = {},
) {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(100, Math.max(5, params.pageSize ?? ORGANISATION_PAGE_SIZE))
  const where = buildOrganisationWhere(user, params)

  const [items, total] = await Promise.all([
    prisma.organisation.findMany({
      where,
      select: listSelect,
      orderBy: orderFor(params.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.organisation.count({ where }),
  ])

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  }
}

/** Distinct categories present in the data, for the filter dropdown. */
export async function listOrganisationCategories(
  user: Pick<CurrentUser, 'id' | 'role'>,
): Promise<string[]> {
  const rows = await prisma.organisation.findMany({
    where: { deletedAt: null, category: { not: null }, AND: [organisationScope(user)] },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
    take: 200,
  })
  return rows.map((r) => r.category!).filter(Boolean)
}

// ── Detail ───────────────────────────────────────────────────────────────────

export async function getOrganisation(user: Pick<CurrentUser, 'id' | 'role'>, id: string) {
  const org = await prisma.organisation.findFirst({
    where: { id, deletedAt: null, AND: [organisationScope(user)] },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, avatarColor: true, role: true } },
      createdBy: { select: { id: true, name: true, avatarColor: true } },
      _count: {
        select: {
          contacts: { where: { deletedAt: null } },
          activities: { where: { deletedAt: null } },
          followUps: { where: { deletedAt: null, status: 'PENDING' } },
        },
      },
    },
  })
  return org
}

export type OrganisationDetail = NonNullable<Awaited<ReturnType<typeof getOrganisation>>>

/**
 * Minimal, deliberately unscoped read used for the "already being worked by
 * someone else" gate (spec §8). An intern who lands on an organisation they do
 * not own sees who holds it and when it was last contacted — enough to avoid
 * duplicate work — and nothing else.
 */
export async function getOrganisationGate(id: string) {
  return prisma.organisation.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      status: true,
      lastContactedAt: true,
      assignedTo: { select: { id: true, name: true, avatarColor: true, role: true } },
    },
  })
}

export async function getOrganisationContacts(organisationId: string) {
  return prisma.contact.findMany({
    where: { organisationId, deletedAt: null },
    orderBy: [{ isDecisionMaker: 'desc' }, { priority: 'asc' }, { name: 'asc' }],
    include: {
      assignedTo: { select: { id: true, name: true, avatarColor: true } },
      _count: { select: { activities: { where: { deletedAt: null } } } },
    },
  })
}

// ── Create / update ──────────────────────────────────────────────────────────

export type CreateOrganisationResult =
  | { status: 'DUPLICATE'; duplicates: OrganisationDuplicate[] }
  | { status: 'CREATED'; id: string; name: string }

export async function createOrganisation(
  user: CurrentUser,
  input: OrganisationCreateInput,
): Promise<CreateOrganisationResult> {
  assertCan(user, 'org:create')

  if (!input.confirmDuplicate) {
    const duplicates = await findOrganisationDuplicates({
      name: input.name,
      website: input.website ?? null,
    })
    if (duplicates.length > 0) return { status: 'DUPLICATE', duplicates }
  }

  // Sticky lead assignment: whosoever gets/creates the lead handles it throughout.
  // Owner and TL may assign to themselves, others, or leave unassigned (null).
  // Interns are always assigned to themselves.
  const assignedToId = can(user, 'org:assign')
    ? (input.assignedToId !== undefined ? input.assignedToId : user.id)
    : user.id
  const website = normalizeWebsite(input.website)

  // Map initial status
  let status: OrgStatus = 'ASSIGNED'
  let nextAction: string | null = null
  if (input.status === 'CONTACTED') {
    status = 'CONTACTED'
  } else if (input.status === 'FOLLOW_UP') {
    status = 'CONTACTED'
    nextAction = 'Follow-up scheduled'
  } else if (input.status === 'RESPONDED') {
    status = 'RESPONDED'
  } else if (input.status === 'MEETING') {
    status = 'MEETING'
  } else if (input.status === 'INTERESTED') {
    status = 'INTERESTED'
  } else if (input.status === 'PARTNERSHIP') {
    status = 'PARTNERSHIP'
  } else if (input.status === 'REJECTED') {
    status = 'REJECTED'
  } else if (input.status === 'ASSIGNED') {
    status = 'ASSIGNED'
  } else {
    status = 'ASSIGNED'
  }

  const domain = input.domain?.trim() || (website ? normalizeDomain(website) : null)
  const leadSource = input.leadSource?.trim() || null

  const customFields: Record<string, unknown> = {}
  if (input.organisationType) {
    customFields.organisationType = input.organisationType
  }
  if (input.numberOfProfessionals !== undefined && input.numberOfProfessionals !== null) {
    customFields.numberOfProfessionals = input.numberOfProfessionals
  }

  const org = await prisma.$transaction(async (tx) => {
    const created = await tx.organisation.create({
      data: {
        name: input.name,
        nameNormalized: normalizeOrgName(input.name),
        category: input.category ?? input.domain ?? null,
        website,
        domain,
        leadSource,
        generalEmail: input.generalEmail ?? null,
        generalPhone: input.generalPhone ?? null,
        linkedinUrl: normalizeLinkedInUrl(input.linkedinUrl),
        location: input.location ?? null,
        priority: input.priority,
        status,
        nextAction,
        notes: input.notes ?? null,
        customFields: Object.keys(customFields).length > 0 ? (customFields as Prisma.InputJsonValue) : undefined,
        assignedToId,
        createdById: user.id,
      },
      select: { id: true, name: true, status: true, assignedToId: true },
    })

    // Create primary contact if name is provided
    if (input.primaryContact?.name?.trim()) {
      const contactName = input.primaryContact.name.trim()
      await tx.contact.create({
        data: {
          organisationId: created.id,
          name: contactName,
          nameNormalized: normalizePersonName(contactName),
          designation: input.primaryContact.designation?.trim() || null,
          email: input.primaryContact.email?.trim() || null,
          emailNormalized: input.primaryContact.email ? normalizeEmail(input.primaryContact.email) : null,
          phone: input.primaryContact.phone?.trim() || null,
          phoneNormalized: input.primaryContact.phone ? normalizePhone(input.primaryContact.phone) : null,
          linkedinUrl: normalizeLinkedInUrl(input.primaryContact.linkedinUrl),
          isDecisionMaker: input.primaryContact.isDecisionMaker ?? false,
          priority: input.primaryContact.priority ?? 'MEDIUM',
          assignedToId,
          createdById: user.id,
        },
      })
    }

    // Link or create tags if provided
    if (input.tags && input.tags.length > 0) {
      for (const rawTag of input.tags) {
        const tagName = rawTag.trim()
        if (!tagName) continue
        const tag = await tx.tag.upsert({
          where: { name: tagName },
          update: { isArchived: false },
          create: {
            name: tagName,
            color: 'violet',
            createdById: user.id,
          },
        })
        await tx.organisationTag.upsert({
          where: {
            organisationId_tagId: {
              organisationId: created.id,
              tagId: tag.id,
            },
          },
          update: {},
          create: {
            organisationId: created.id,
            tagId: tag.id,
          },
        })
      }
    }

    await writeAudit(
      {
        userId: user.id,
        action: 'organisation.created',
        entityType: 'organisation',
        entityId: created.id,
        entityLabel: created.name,
        summary: `Created organisation "${created.name}"`,
        after: { status: created.status, assignedToId: created.assignedToId },
      },
      tx,
    )

    return created
  })

  return { status: 'CREATED', id: org.id, name: org.name }
}

export async function updateOrganisation(
  user: CurrentUser,
  input: OrganisationUpdateInput,
): Promise<CreateOrganisationResult> {
  const existing = await prisma.organisation.findFirst({
    where: { id: input.id, deletedAt: null },
    select: {
      id: true,
      name: true,
      status: true,
      priority: true,
      assignedToId: true,
      createdById: true,
      website: true,
      category: true,
      location: true,
    },
  })
  if (!existing) throw new NotFoundError('Organisation')
  if (!canWriteOrganisation(user, existing)) throw new ForbiddenError()

  const nameChanged = existing.name.trim() !== input.name.trim()
  if (nameChanged && !input.confirmDuplicate) {
    const duplicates = await findOrganisationDuplicates({
      name: input.name,
      website: input.website ?? null,
      excludeId: input.id,
    })
    if (duplicates.length > 0) return { status: 'DUPLICATE', duplicates }
  }

  const website = normalizeWebsite(input.website)

  // Only Owner/TL may move ownership through the edit form; an intern editing
  // details keeps the existing assignee.
  const assignedToId = can(user, 'org:assign') ? (input.assignedToId ?? null) : existing.assignedToId

  await prisma.$transaction(async (tx) => {
    const updated = await tx.organisation.update({
      where: { id: input.id },
      data: {
        name: input.name,
        nameNormalized: normalizeOrgName(input.name),
        category: input.category ?? null,
        website,
        domain: normalizeDomain(website),
        generalEmail: input.generalEmail ?? null,
        generalPhone: input.generalPhone ?? null,
        linkedinUrl: normalizeLinkedInUrl(input.linkedinUrl),
        location: input.location ?? null,
        notes: input.notes ?? null,
        assignedToId,
        ...(input.status && input.status !== 'FOLLOW_UP' && can(user, 'org:changeStatus')
          ? { status: input.status as OrgStatus }
          : {}),
      },
      select: { id: true, name: true, status: true, priority: true, assignedToId: true },
    })

    await writeAudit(
      {
        userId: user.id,
        action: 'organisation.updated',
        entityType: 'organisation',
        entityId: updated.id,
        entityLabel: updated.name,
        summary: `Updated organisation "${updated.name}"`,
        before: {
          name: existing.name,
          priority: existing.priority,
          website: existing.website,
          category: existing.category,
          location: existing.location,
        },
        after: { name: updated.name, priority: updated.priority },
      },
      tx,
    )

    if (existing.status !== updated.status) {
      await writeAudit(
        {
          userId: user.id,
          action: 'organisation.status_changed',
          entityType: 'organisation',
          entityId: updated.id,
          entityLabel: updated.name,
          summary: `Status ${ORG_STATUS_META[existing.status].label} → ${
            ORG_STATUS_META[updated.status].label
          }`,
          before: { status: existing.status },
          after: { status: updated.status },
        },
        tx,
      )
    }
  })

  return { status: 'CREATED', id: input.id, name: input.name }
}

// ── Assignment (spec §8) ─────────────────────────────────────────────────────

export interface AssignmentConflict {
  organisationId: string
  organisationName: string
  currentAssignee: { id: string; name: string }
  lastContactedAt: Date | null
  activityCount: number
}

export type AssignResult =
  | { status: 'CONFLICT'; conflict: AssignmentConflict }
  | { status: 'ASSIGNED'; assigneeName: string | null }

export async function assignOrganisation(
  user: CurrentUser,
  input: { id: string; assignedToId?: string; confirmReassign?: boolean },
): Promise<AssignResult> {
  assertCan(user, 'org:assign')

  const org = await prisma.organisation.findFirst({
    where: { id: input.id, deletedAt: null },
    select: {
      id: true,
      name: true,
      status: true,
      activityCount: true,
      lastContactedAt: true,
      assignedToId: true,
      assignedTo: { select: { id: true, name: true } },
    },
  })
  if (!org) throw new NotFoundError('Organisation')

  const nextId = input.assignedToId ?? null

  if (nextId === org.assignedToId) {
    return { status: 'ASSIGNED', assigneeName: org.assignedTo?.name ?? null }
  }

  // Never silently move work away from whoever is already on it.
  if (org.assignedTo && nextId && !input.confirmReassign) {
    return {
      status: 'CONFLICT',
      conflict: {
        organisationId: org.id,
        organisationName: org.name,
        currentAssignee: org.assignedTo,
        lastContactedAt: org.lastContactedAt,
        activityCount: org.activityCount,
      },
    }
  }

  let assignee: { id: string; name: string } | null = null
  if (nextId) {
    assignee = await prisma.user.findFirst({
      where: { id: nextId, deletedAt: null, isActive: true },
      select: { id: true, name: true },
    })
    if (!assignee) throw new NotFoundError('Team member')
  }

  await prisma.$transaction(async (tx) => {
    await tx.organisation.update({
      where: { id: org.id },
      data: {
        assignedToId: nextId,
        // Handing over an untouched organisation moves it out of NEW.
        ...(nextId && org.status === 'NEW' ? { status: 'ASSIGNED' } : {}),
      },
    })

    // Pending follow-ups travel with the organisation, otherwise the previous
    // owner keeps seeing work they no longer hold.
    if (nextId) {
      await tx.followUp.updateMany({
        where: { organisationId: org.id, status: 'PENDING', deletedAt: null },
        data: { assignedToId: nextId },
      })
    }

    const action = org.assignedTo ? (nextId ? 'reassigned' : 'unassigned') : 'assigned'
    const summary = !nextId
      ? `Unassigned from ${org.assignedTo?.name ?? 'nobody'}`
      : org.assignedTo
        ? `Reassigned from ${org.assignedTo.name} to ${assignee!.name}`
        : `Assigned to ${assignee!.name}`

    await writeAudit(
      {
        userId: user.id,
        action: `organisation.${action}` as
          | 'organisation.assigned'
          | 'organisation.unassigned'
          | 'organisation.reassigned',
        entityType: 'organisation',
        entityId: org.id,
        entityLabel: org.name,
        summary,
        before: { assignedToId: org.assignedToId, assignee: org.assignedTo?.name ?? null },
        after: { assignedToId: nextId, assignee: assignee?.name ?? null },
      },
      tx,
    )
  })

  if (nextId && nextId !== user.id) {
    await createNotification({
      userId: nextId,
      type: 'ASSIGNMENT',
      priority: 'INFO',
      title: 'New organisation assigned',
      message: `You have been assigned "${org.name}" by ${user.name}.`,
      linkUrl: `/organisations/${org.id}`,
      entityType: 'organisation',
      entityId: org.id,
    }).catch(() => {})
  }

  return { status: 'ASSIGNED', assigneeName: assignee?.name ?? null }
}

export async function bulkAssignOrganisations(
  user: CurrentUser,
  input: { ids: string[]; assignedToId?: string },
): Promise<{ count: number; assigneeName: string | null }> {
  assertCan(user, 'org:assign')

  const nextId = input.assignedToId ?? null
  let assignee: { id: string; name: string } | null = null
  if (nextId) {
    assignee = await prisma.user.findFirst({
      where: { id: nextId, deletedAt: null, isActive: true },
      select: { id: true, name: true },
    })
    if (!assignee) throw new NotFoundError('Team member')
  }

  const targets = await prisma.organisation.findMany({
    where: { id: { in: input.ids }, deletedAt: null },
    select: { id: true, name: true, status: true, assignedToId: true },
  })

  await prisma.$transaction(async (tx) => {
    for (const target of targets) {
      if (target.assignedToId === nextId) continue

      await tx.organisation.update({
        where: { id: target.id },
        data: {
          assignedToId: nextId,
          ...(nextId && target.status === 'NEW' ? { status: 'ASSIGNED' } : {}),
        },
      })

      if (nextId) {
        await tx.followUp.updateMany({
          where: { organisationId: target.id, status: 'PENDING', deletedAt: null },
          data: { assignedToId: nextId },
        })
      }

      await writeAudit(
        {
          userId: user.id,
          action: nextId ? 'organisation.assigned' : 'organisation.unassigned',
          entityType: 'organisation',
          entityId: target.id,
          entityLabel: target.name,
          summary: nextId ? `Bulk assigned to ${assignee!.name}` : 'Bulk unassigned',
          before: { assignedToId: target.assignedToId },
          after: { assignedToId: nextId },
        },
        tx,
      )
    }
  })

  if (nextId && nextId !== user.id && targets.length > 0) {
    await createNotification({
      userId: nextId,
      type: 'ASSIGNMENT',
      priority: 'INFO',
      title: `${targets.length} organisations assigned`,
      message: `You were assigned ${targets.length} new organisations by ${user.name}.`,
      linkUrl: `/organisations?assignee=${nextId}`,
      entityType: 'organisation',
    }).catch(() => {})
  }

  return { count: targets.length, assigneeName: assignee?.name ?? null }
}

// ── Status ───────────────────────────────────────────────────────────────────

export async function changeOrganisationStatus(
  user: CurrentUser,
  input: { id: string; status: OrgStatus; reason?: string },
): Promise<{ from: OrgStatus; to: OrgStatus }> {
  assertCan(user, 'org:changeStatus')

  const org = await prisma.organisation.findFirst({
    where: { id: input.id, deletedAt: null },
    select: { id: true, name: true, status: true, assignedToId: true, createdById: true },
  })
  if (!org) throw new NotFoundError('Organisation')
  if (!canWriteOrganisation(user, org) && org.assignedToId !== null) throw new ForbiddenError()

  if (org.status === input.status) return { from: org.status, to: input.status }

  await prisma.$transaction(async (tx) => {
    await tx.organisation.update({
      where: { id: org.id },
      data: {
        status: input.status,
        ...(org.assignedToId === null ? { assignedToId: user.id } : {}),
      },
    })

    await writeAudit(
      {
        userId: user.id,
        action: 'organisation.status_changed',
        entityType: 'organisation',
        entityId: org.id,
        entityLabel: org.name,
        summary: `Status ${ORG_STATUS_META[org.status].label} → ${
          ORG_STATUS_META[input.status].label
        }${input.reason ? ` — ${input.reason}` : ''}`,
        before: { status: org.status },
        after: { status: input.status, reason: input.reason ?? null },
      },
      tx,
    )
  })

  // Drop notification to TL and OWNER when moved by an intern
  if (user.role === 'INTERN') {
    const fromLabel = ORG_STATUS_META[org.status]?.label ?? org.status
    const toLabel = ORG_STATUS_META[input.status]?.label ?? input.status

    await notifyOwnersAndTLs({
      type: 'SYSTEM',
      priority: input.status === 'PARTNERSHIP' ? 'URGENT' : input.status === 'REJECTED' ? 'WARNING' : 'INFO',
      title: `Organisation Status Updated by ${user.name}`,
      message: `${user.name} moved "${org.name}" from ${fromLabel} → ${toLabel}.${
        input.reason ? ` Reason: ${input.reason}` : ''
      }`,
      linkUrl: `/organisations/${org.id}`,
      entityType: 'organisation',
      entityId: org.id,
    }).catch((err) => {
      console.error('Failed to notify owners/TLs on organisation status change:', err)
    })
  }

  return { from: org.status, to: input.status }
}

// ── Soft delete (spec §32) ───────────────────────────────────────────────────

export async function softDeleteOrganisation(user: CurrentUser, id: string): Promise<void> {
  assertCan(user, 'org:delete')

  const org = await prisma.organisation.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true },
  })
  if (!org) throw new NotFoundError('Organisation')

  const now = new Date()

  await prisma.$transaction(async (tx) => {
    // Archive the organisation and its dependents together. Activities are kept
    // intact so the historical record survives (spec §32) — they simply stop
    // appearing in active views.
    await tx.organisation.update({ where: { id }, data: { deletedAt: now } })
    await tx.contact.updateMany({
      where: { organisationId: id, deletedAt: null },
      data: { deletedAt: now },
    })
    await tx.followUp.updateMany({
      where: { organisationId: id, deletedAt: null, status: 'PENDING' },
      data: { deletedAt: now, status: 'CANCELLED' },
    })

    await writeAudit(
      {
        userId: user.id,
        action: 'organisation.deleted',
        entityType: 'organisation',
        entityId: id,
        entityLabel: org.name,
        summary: `Archived organisation "${org.name}" (recoverable)`,
      },
      tx,
    )
  })
}

export async function restoreOrganisation(user: CurrentUser, id: string): Promise<void> {
  assertCan(user, 'org:delete')

  const org = await prisma.organisation.findFirst({
    where: { id, deletedAt: { not: null } },
    select: { id: true, name: true },
  })
  if (!org) throw new NotFoundError('Archived organisation')

  await prisma.$transaction(async (tx) => {
    await tx.organisation.update({ where: { id }, data: { deletedAt: null } })
    await tx.contact.updateMany({ where: { organisationId: id }, data: { deletedAt: null } })
    await recomputeOrganisationCaches(tx, id)

    await writeAudit(
      {
        userId: user.id,
        action: 'organisation.restored',
        entityType: 'organisation',
        entityId: id,
        entityLabel: org.name,
        summary: `Restored organisation "${org.name}"`,
      },
      tx,
    )
  })
}

// ── Reassignment requests (spec §8) ──────────────────────────────────────────

export async function requestReassignment(
  user: CurrentUser,
  input: { organisationId: string; reason?: string },
): Promise<{ organisationName: string }> {
  assertCan(user, 'reassign:request')

  const org = await prisma.organisation.findFirst({
    where: { id: input.organisationId, deletedAt: null },
    select: { id: true, name: true, assignedToId: true },
  })
  if (!org) throw new NotFoundError('Organisation')

  const existing = await prisma.reassignmentRequest.findFirst({
    where: { organisationId: org.id, requestedById: user.id, status: 'PENDING' },
    select: { id: true },
  })

  await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.reassignmentRequest.update({
        where: { id: existing.id },
        data: { reason: input.reason ?? null, currentAssigneeId: org.assignedToId },
      })
    } else {
      await tx.reassignmentRequest.create({
        data: {
          organisationId: org.id,
          requestedById: user.id,
          currentAssigneeId: org.assignedToId,
          reason: input.reason ?? null,
        },
      })
    }

    await writeAudit(
      {
        userId: user.id,
        action: 'reassignment.requested',
        entityType: 'organisation',
        entityId: org.id,
        entityLabel: org.name,
        summary: `${user.name} requested reassignment of "${org.name}"`,
        after: { reason: input.reason ?? null },
      },
      tx,
    )
  })

  return { organisationName: org.name }
}

export async function listReassignmentRequests(status: 'PENDING' | 'ALL' = 'PENDING') {
  return prisma.reassignmentRequest.findMany({
    where: status === 'ALL' ? {} : { status },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      organisation: {
        select: {
          id: true,
          name: true,
          status: true,
          lastContactedAt: true,
          assignedTo: { select: { id: true, name: true, avatarColor: true } },
        },
      },
      requestedBy: { select: { id: true, name: true, avatarColor: true, role: true } },
      decidedBy: { select: { id: true, name: true } },
    },
  })
}

export async function countPendingReassignments(): Promise<number> {
  return prisma.reassignmentRequest.count({ where: { status: 'PENDING' } })
}

export async function decideReassignment(
  user: CurrentUser,
  input: { id: string; approve: boolean; decisionNote?: string },
): Promise<{ organisationName: string; approved: boolean }> {
  assertCan(user, 'reassign:approve')

  const request = await prisma.reassignmentRequest.findUnique({
    where: { id: input.id },
    include: {
      organisation: { select: { id: true, name: true, status: true, assignedToId: true } },
      requestedBy: { select: { id: true, name: true } },
    },
  })
  if (!request) throw new NotFoundError('Reassignment request')
  if (request.status !== 'PENDING') throw new NotFoundError('Pending reassignment request')

  await prisma.$transaction(async (tx) => {
    await tx.reassignmentRequest.update({
      where: { id: request.id },
      data: {
        status: input.approve ? 'APPROVED' : 'REJECTED',
        decidedById: user.id,
        decidedAt: new Date(),
        decisionNote: input.decisionNote ?? null,
      },
    })

    if (input.approve) {
      await tx.organisation.update({
        where: { id: request.organisationId },
        data: {
          assignedToId: request.requestedById,
          ...(request.organisation.status === 'NEW' ? { status: 'ASSIGNED' } : {}),
        },
      })
      await tx.followUp.updateMany({
        where: { organisationId: request.organisationId, status: 'PENDING', deletedAt: null },
        data: { assignedToId: request.requestedById },
      })
    }

    await writeAudit(
      {
        userId: user.id,
        action: input.approve ? 'reassignment.approved' : 'reassignment.rejected',
        entityType: 'organisation',
        entityId: request.organisationId,
        entityLabel: request.organisation.name,
        summary: input.approve
          ? `Approved reassignment of "${request.organisation.name}" to ${request.requestedBy.name}`
          : `Rejected reassignment of "${request.organisation.name}"`,
        after: { note: input.decisionNote ?? null },
      },
      tx,
    )
  })

  return { organisationName: request.organisation.name, approved: input.approve }
}
