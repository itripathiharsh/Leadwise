import type {
  ActivityOutcome,
  ActivityType,
  ContactStatus,
  OrgStatus,
  Prisma,
} from '@prisma/client'
import { prisma } from '@/lib/db'
import type { CurrentUser } from '@/lib/auth/current-user'
import { activityScope, assertCan, can, canReadOrganisation, canWriteOrganisation, ForbiddenError } from '@/lib/rbac'
import {
  ACTIVITY_TYPE_META,
  CONTACT_STATUS_META,
  ORG_STATUS_META,
  OUTCOME_META,
  resolveContactStatus,
  resolveOrgStatus,
  suggestedContactStatusFor,
  suggestedStatusFor,
} from '@/lib/constants'
import {
  dateTimeInputToUtc,
  endOfDayUtc,
  rangeUtc,
  startOfDayUtc,
  toDateKey,
  type DateKey,
} from '@/lib/dates'
import { normalizeLinkedInUrl } from '@/lib/normalize'
import type { ActivityCreateInput } from '@/lib/validation'
import { NotFoundError, ValidationError } from '@/server/errors'
import { writeAudit } from './audit'
import { recomputeContactCache, recomputeOrganisationCaches } from './caches'

/**
 * Activity service — the heart of the CRM (spec §2, §9–14).
 *
 * Logging an activity is the only way outreach gets recorded, and one call does
 * everything the spec asks for atomically:
 *   • append the immutable activity row
 *   • advance the organisation's status (never backwards)
 *   • advance the contact's status
 *   • schedule the next follow-up
 *   • close out any follow-up this activity satisfied
 *   • refresh the derived caches
 *   • write the audit trail
 *
 * If any step fails, none of it happened.
 */

const timelineInclude = {
  performedBy: { select: { id: true, name: true, avatarColor: true, role: true } },
  contact: { select: { id: true, name: true, designation: true, isDecisionMaker: true } },
} satisfies Prisma.ActivityInclude

const feedInclude = {
  ...timelineInclude,
  organisation: { select: { id: true, name: true, status: true, priority: true } },
} satisfies Prisma.ActivityInclude

export type TimelineActivity = Prisma.ActivityGetPayload<{ include: typeof timelineInclude }>
export type FeedActivity = Prisma.ActivityGetPayload<{ include: typeof feedInclude }>

// ── Logging ──────────────────────────────────────────────────────────────────

export interface LogActivityResult {
  id: string
  organisationId: string
  organisationName: string
  /** Sentence for the success toast. */
  message: string
  statusChange: { from: OrgStatus; to: OrgStatus } | null
  followUpDate: Date | null
  closedFollowUps: number
}

export async function logActivity(
  user: CurrentUser,
  input: ActivityCreateInput,
): Promise<LogActivityResult> {
  assertCan(user, 'activity:create')

  const org = await prisma.organisation.findFirst({
    where: { id: input.organisationId, deletedAt: null },
    select: {
      id: true,
      name: true,
      status: true,
      assignedToId: true,
      createdById: true,
    },
  })
  if (!org) throw new NotFoundError('Organisation')
  if (!canWriteOrganisation(user, org)) {
    throw new ForbiddenError(
      'This organisation is assigned to someone else. Request reassignment before logging activity.',
    )
  }

  // A contact must belong to this organisation — no cross-wiring.
  let contact: { id: string; name: string; status: ContactStatus } | null = null
  if (input.contactId) {
    const found = await prisma.contact.findFirst({
      where: { id: input.contactId, organisationId: org.id, deletedAt: null },
      select: { id: true, name: true, status: true },
    })
    if (!found) throw new NotFoundError('Contact for this organisation')
    contact = found
  }

  const now = new Date()
  const activityDate = input.activityDate ? dateTimeInputToUtc(input.activityDate) : now
  if (!activityDate) {
    throw new ValidationError('Enter a valid activity date.', {
      activityDate: 'Enter a valid date and time',
    })
  }
  // Guard against typos that would silently move work into tomorrow's EOD.
  if (activityDate.getTime() > now.getTime() + 5 * 60_000) {
    throw new ValidationError('An activity cannot be logged in the future.', {
      activityDate: 'Pick a date and time that has already happened',
    })
  }

  const meetingDate = input.meetingDate ? dateTimeInputToUtc(input.meetingDate) : null
  const followUpAt = input.nextFollowupDate ? startOfDayUtc(input.nextFollowupDate) : null

  // Status progression: an explicit choice by the user wins outright, otherwise
  // the outcome suggests a stage and `resolveOrgStatus` refuses to regress.
  const nextStatus = input.statusOverride
    ? input.statusOverride === org.status
      ? null
      : input.statusOverride
    : resolveOrgStatus(org.status, suggestedStatusFor(input.type, input.outcome))

  const contactStatus = contact
    ? resolveContactStatus(contact.status, suggestedContactStatusFor(input.outcome))
    : null

  const result = await prisma.$transaction(async (tx) => {
    const activity = await tx.activity.create({
      data: {
        organisationId: org.id,
        contactId: contact?.id ?? null,
        performedById: user.id,
        type: input.type,
        outcome: input.outcome,
        activityDate,
        notes: input.notes ?? null,
        nextFollowupDate: followUpAt,
        emailSubject: input.emailSubject ?? null,
        emailTemplate: input.emailTemplate ?? null,
        emailUsed: input.emailUsed ?? null,
        phoneNumberUsed: input.phoneNumberUsed ?? null,
        linkedinUrl: normalizeLinkedInUrl(input.linkedinUrl),
        meetingDate,
        meetingLocation: input.meetingLocation ?? null,
        statusAfter: nextStatus ?? org.status,
      },
      select: { id: true },
    })

    if (nextStatus) {
      await tx.organisation.update({ where: { id: org.id }, data: { status: nextStatus } })
      await writeAudit(
        {
          userId: user.id,
          action: 'organisation.status_changed',
          entityType: 'organisation',
          entityId: org.id,
          entityLabel: org.name,
          summary: `Status ${ORG_STATUS_META[org.status].label} → ${
            ORG_STATUS_META[nextStatus].label
          } (${ACTIVITY_TYPE_META[input.type].label}: ${OUTCOME_META[input.outcome].label})`,
          before: { status: org.status },
          after: { status: nextStatus, activityId: activity.id },
        },
        tx,
      )
    }

    if (contact && contactStatus) {
      await tx.contact.update({ where: { id: contact.id }, data: { status: contactStatus } })
      await writeAudit(
        {
          userId: user.id,
          action: 'contact.status_changed',
          entityType: 'contact',
          entityId: contact.id,
          entityLabel: `${contact.name} · ${org.name}`,
          summary: `Contact status ${CONTACT_STATUS_META[contact.status].label} → ${
            CONTACT_STATUS_META[contactStatus].label
          }`,
          before: { status: contact.status },
          after: { status: contactStatus },
        },
        tx,
      )
    }

    /**
     * Outreach answers whatever follow-up was already due: leaving it pending
     * would make the follow-up page lie. Notes are bookkeeping, so they don't
     * close anything.
     */
    let closedFollowUps = 0
    if (input.type !== 'NOTE') {
      const due = await tx.followUp.findMany({
        where: {
          organisationId: org.id,
          status: 'PENDING',
          deletedAt: null,
          dueDate: { lte: endOfDayUtc(toDateKey(activityDate)) },
        },
        select: { id: true },
      })
      if (due.length > 0) {
        await tx.followUp.updateMany({
          where: { id: { in: due.map((f) => f.id) } },
          data: { status: 'DONE', completedAt: activityDate, completedById: user.id },
        })
        closedFollowUps = due.length
      }
    }

    if (followUpAt) {
      await tx.followUp.create({
        data: {
          organisationId: org.id,
          contactId: contact?.id ?? null,
          activityId: activity.id,
          dueDate: followUpAt,
          note: input.notes ? input.notes.slice(0, 400) : null,
          assignedToId: org.assignedToId ?? user.id,
          createdById: user.id,
        },
      })
    }

    await recomputeOrganisationCaches(tx, org.id)
    if (contact) await recomputeContactCache(tx, contact.id)

    await writeAudit(
      {
        userId: user.id,
        action: 'activity.logged',
        entityType: 'activity',
        entityId: activity.id,
        entityLabel: `${ACTIVITY_TYPE_META[input.type].label} · ${org.name}`,
        summary: `${user.name} ${ACTIVITY_TYPE_META[input.type].verb} ${
          contact ? `${contact.name} at ${org.name}` : org.name
        } — ${OUTCOME_META[input.outcome].label}`,
        after: {
          type: input.type,
          outcome: input.outcome,
          contactId: contact?.id ?? null,
          nextFollowupDate: followUpAt?.toISOString() ?? null,
        },
      },
      tx,
    )

    return { activityId: activity.id, closedFollowUps }
  })

  const typeLabel = ACTIVITY_TYPE_META[input.type].label
  const parts = [`${typeLabel} logged`]
  if (nextStatus) parts.push(`status moved to ${ORG_STATUS_META[nextStatus].label}`)
  if (followUpAt) parts.push('follow-up scheduled')

  return {
    id: result.activityId,
    organisationId: org.id,
    organisationName: org.name,
    message: parts.join(' · '),
    statusChange: nextStatus ? { from: org.status, to: nextStatus } : null,
    followUpDate: followUpAt,
    closedFollowUps: result.closedFollowUps,
  }
}

export async function getActivity(user: CurrentUser, id: string) {
  const activity = await prisma.activity.findFirst({
    where: { id, deletedAt: null },
    include: {
      organisation: { select: { id: true, name: true, assignedToId: true, createdById: true } },
      contact: { select: { id: true, name: true, designation: true } },
      performedBy: { select: { id: true, name: true, avatarColor: true } },
      followUps: true,
    },
  })
  if (!activity) throw new NotFoundError('Activity')
  if (!canReadOrganisation(user, activity.organisation)) throw new ForbiddenError()
  return activity
}

/**
 * Editing an activity re-derives every cache it touches. The organisation's
 * status is deliberately *not* rolled back — a human decision recorded later
 * shouldn't be undone by fixing a typo in an old note.
 */
export async function updateActivity(
  user: CurrentUser,
  input: ActivityCreateInput & { id: string },
): Promise<{ id: string }> {
  assertCan(user, 'activity:create')

  const existing = await prisma.activity.findFirst({
    where: { id: input.id, deletedAt: null },
    select: {
      id: true,
      type: true,
      outcome: true,
      notes: true,
      activityDate: true,
      contactId: true,
      performedById: true,
      organisationId: true,
      organisation: { select: { id: true, name: true, assignedToId: true, createdById: true } },
    },
  })
  if (!existing) throw new NotFoundError('Activity')
  if (!canWriteOrganisation(user, existing.organisation)) throw new ForbiddenError()
  // Interns may correct their own entries; Owner/TL may correct anyone's.
  if (existing.performedById !== user.id && !can(user, 'org:edit')) {
    throw new ForbiddenError('You can only edit activities you logged yourself.')
  }

  const activityDate = input.activityDate
    ? dateTimeInputToUtc(input.activityDate)
    : existing.activityDate
  if (!activityDate) {
    throw new ValidationError('Enter a valid activity date.', {
      activityDate: 'Enter a valid date and time',
    })
  }

  await prisma.$transaction(async (tx) => {
    await tx.activity.update({
      where: { id: existing.id },
      data: {
        type: input.type,
        outcome: input.outcome,
        activityDate,
        notes: input.notes ?? null,
        emailSubject: input.emailSubject ?? null,
        emailTemplate: input.emailTemplate ?? null,
        emailUsed: input.emailUsed ?? null,
        phoneNumberUsed: input.phoneNumberUsed ?? null,
        linkedinUrl: normalizeLinkedInUrl(input.linkedinUrl),
        meetingDate: input.meetingDate ? dateTimeInputToUtc(input.meetingDate) : null,
        meetingLocation: input.meetingLocation ?? null,
      },
    })

    await recomputeOrganisationCaches(tx, existing.organisationId)
    if (existing.contactId) await recomputeContactCache(tx, existing.contactId)

    await writeAudit(
      {
        userId: user.id,
        action: 'activity.updated',
        entityType: 'activity',
        entityId: existing.id,
        entityLabel: `${ACTIVITY_TYPE_META[input.type].label} · ${existing.organisation.name}`,
        summary: `Edited ${ACTIVITY_TYPE_META[existing.type].label.toLowerCase()} on ${
          existing.organisation.name
        }`,
        before: { type: existing.type, outcome: existing.outcome, notes: existing.notes },
        after: { type: input.type, outcome: input.outcome, notes: input.notes ?? null },
      },
      tx,
    )
  })

  return { id: existing.id }
}

export async function softDeleteActivity(user: CurrentUser, id: string): Promise<void> {
  assertCan(user, 'activity:delete')

  const activity = await prisma.activity.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      type: true,
      outcome: true,
      organisationId: true,
      contactId: true,
      organisation: { select: { name: true } },
    },
  })
  if (!activity) throw new NotFoundError('Activity')

  await prisma.$transaction(async (tx) => {
    await tx.activity.update({ where: { id }, data: { deletedAt: new Date() } })
    await recomputeOrganisationCaches(tx, activity.organisationId)
    if (activity.contactId) await recomputeContactCache(tx, activity.contactId)

    await writeAudit(
      {
        userId: user.id,
        action: 'activity.deleted',
        entityType: 'activity',
        entityId: id,
        entityLabel: `${ACTIVITY_TYPE_META[activity.type].label} · ${activity.organisation.name}`,
        summary: `Removed ${ACTIVITY_TYPE_META[activity.type].label.toLowerCase()} (${
          OUTCOME_META[activity.outcome].label
        }) from ${activity.organisation.name}`,
      },
      tx,
    )
  })
}

// ── Reads ────────────────────────────────────────────────────────────────────

export async function getOrganisationTimeline(
  organisationId: string,
  options: { take?: number; skip?: number } = {},
) {
  const take = options.take ?? 60
  const [items, total] = await Promise.all([
    prisma.activity.findMany({
      where: { organisationId, deletedAt: null },
      include: timelineInclude,
      orderBy: [{ activityDate: 'desc' }, { createdAt: 'desc' }],
      take,
      skip: options.skip ?? 0,
    }),
    prisma.activity.count({ where: { organisationId, deletedAt: null } }),
  ])
  return { items, total }
}

export async function listActivitiesForOrganisation(
  user: Pick<CurrentUser, 'id' | 'role'>,
  organisationId: string,
) {
  const result = await getOrganisationTimeline(organisationId)
  return result.items
}

export async function getContactTimeline(contactId: string, take = 40) {
  return prisma.activity.findMany({
    where: { contactId, deletedAt: null },
    include: timelineInclude,
    orderBy: [{ activityDate: 'desc' }, { createdAt: 'desc' }],
    take,
  })
}

export type ActivitySort = 'recent' | 'oldest'

export interface ActivityListParams {
  q?: string
  type?: ActivityType[]
  outcome?: ActivityOutcome[]
  performedById?: string
  organisationId?: string
  contactId?: string
  from?: DateKey
  to?: DateKey
  sort?: ActivitySort
  page?: number
  pageSize?: number
}

export const ACTIVITY_PAGE_SIZE = 30

export function buildActivityWhere(
  user: Pick<CurrentUser, 'id' | 'role'>,
  params: ActivityListParams,
): Prisma.ActivityWhereInput {
  const and: Prisma.ActivityWhereInput[] = [activityScope(user)]

  if (params.q && params.q.trim().length >= 2) {
    const q = params.q.trim()
    and.push({
      OR: [
        { notes: { contains: q, mode: 'insensitive' } },
        { emailSubject: { contains: q, mode: 'insensitive' } },
        { organisation: { name: { contains: q, mode: 'insensitive' } } },
        { contact: { name: { contains: q, mode: 'insensitive' } } },
      ],
    })
  }

  if (params.from || params.to) {
    const from = params.from ?? params.to!
    const to = params.to ?? params.from!
    const { start, end } = rangeUtc(from, to)
    and.push({ activityDate: { gte: start, lt: end } })
  }

  return {
    deletedAt: null,
    organisation: { deletedAt: null },
    ...(params.type?.length ? { type: { in: params.type } } : {}),
    ...(params.outcome?.length ? { outcome: { in: params.outcome } } : {}),
    ...(params.performedById ? { performedById: params.performedById } : {}),
    ...(params.organisationId ? { organisationId: params.organisationId } : {}),
    ...(params.contactId ? { contactId: params.contactId } : {}),
    AND: and,
  }
}

export async function listActivities(
  user: Pick<CurrentUser, 'id' | 'role'>,
  params: ActivityListParams = {},
) {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(100, Math.max(5, params.pageSize ?? ACTIVITY_PAGE_SIZE))
  const where = buildActivityWhere(user, params)

  const [items, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: feedInclude,
      orderBy:
        params.sort === 'oldest'
          ? [{ activityDate: 'asc' }, { createdAt: 'asc' }]
          : [{ activityDate: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.activity.count({ where }),
  ])

  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) }
}

/** Compact feed for dashboards. */
export async function getRecentActivities(
  user: Pick<CurrentUser, 'id' | 'role'>,
  take = 8,
): Promise<FeedActivity[]> {
  return prisma.activity.findMany({
    where: { deletedAt: null, organisation: { deletedAt: null }, AND: [activityScope(user)] },
    include: feedInclude,
    orderBy: [{ activityDate: 'desc' }, { createdAt: 'desc' }],
    take,
  })
}
