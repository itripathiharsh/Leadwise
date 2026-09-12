import type { FollowUpStatus, Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { CurrentUser } from '@/lib/auth/current-user'
import { assertCan, can, canReadOrganisation, followUpScope, ForbiddenError, organisationScope } from '@/lib/rbac'
import { addDaysToKey, startOfDayUtc, todayKey, type DateKey } from '@/lib/dates'
import type { FollowUpCreateInput } from '@/lib/validation'
import { NotFoundError } from '@/server/errors'
import { writeAudit } from './audit'
import { recomputeOrganisationCaches } from './caches'

/**
 * Follow-up service (spec §15).
 *
 * The follow-up page answers one question — "who am I chasing, and when?" — so
 * the read model is a set of buckets rather than a flat list, including the
 * bucket that matters most on a quiet day: organisations with *no* follow-up
 * scheduled at all.
 */

const followUpInclude = {
  organisation: {
    select: {
      id: true,
      name: true,
      status: true,
      priority: true,
      lastContactedAt: true,
      assignedToId: true,
      createdById: true,
      assignedTo: { select: { id: true, name: true, avatarColor: true } },
    },
  },
  contact: { select: { id: true, name: true, designation: true, phone: true, email: true } },
  assignedTo: { select: { id: true, name: true, avatarColor: true } },
} satisfies Prisma.FollowUpInclude

export type FollowUpItem = Prisma.FollowUpGetPayload<{ include: typeof followUpInclude }>

export interface FollowUpBoardParams {
  /** 'ME' | user id | undefined (everyone the viewer may see) */
  assignee?: string
  /** How far ahead "upcoming" reaches. */
  upcomingDays?: number
}

export interface FollowUpBoard {
  overdue: FollowUpItem[]
  today: FollowUpItem[]
  tomorrow: FollowUpItem[]
  upcoming: FollowUpItem[]
  /** Active organisations with nothing scheduled — the silent leak. */
  unscheduled: {
    id: string
    name: string
    status: string
    priority: string
    lastContactedAt: Date | null
    assignedTo: { id: string; name: string; avatarColor: string } | null
  }[]
  counts: { overdue: number; today: number; tomorrow: number; upcoming: number; unscheduled: number }
}

function assigneeClause(
  user: Pick<CurrentUser, 'id' | 'role'>,
  assignee: string | undefined,
): Prisma.FollowUpWhereInput {
  if (!can(user, 'followup:manageAll')) {
    return { assignedToId: user.id }
  }
  if (assignee === 'ME') return { assignedToId: user.id }
  if (assignee && assignee !== 'ALL') return { assignedToId: assignee }
  return {}
}

export async function getFollowUpBoard(
  user: Pick<CurrentUser, 'id' | 'role'>,
  params: FollowUpBoardParams = {},
): Promise<FollowUpBoard> {
  const today = todayKey()
  const startToday = startOfDayUtc(today)
  const startTomorrow = startOfDayUtc(addDaysToKey(today, 1))
  const startDayAfter = startOfDayUtc(addDaysToKey(today, 2))
  const upcomingEnd = startOfDayUtc(addDaysToKey(today, (params.upcomingDays ?? 14) + 1))

  const base: Prisma.FollowUpWhereInput = {
    deletedAt: null,
    status: 'PENDING',
    organisation: { deletedAt: null },
    AND: [assigneeClause(user, params.assignee)],
  }

  const bucket = (where: Prisma.FollowUpWhereInput, take: number) =>
    prisma.followUp.findMany({
      where: { ...base, ...where },
      include: followUpInclude,
      orderBy: [{ dueDate: 'asc' }, { organisation: { priority: 'asc' } }],
      take,
    })

  const [overdue, dueToday, tomorrow, upcoming] = await Promise.all([
    bucket({ dueDate: { lt: startToday } }, 100),
    bucket({ dueDate: { gte: startToday, lt: startTomorrow } }, 100),
    bucket({ dueDate: { gte: startTomorrow, lt: startDayAfter } }, 100),
    bucket({ dueDate: { gte: startDayAfter, lt: upcomingEnd } }, 100),
  ])

  // Organisations that are live but have nothing on the calendar.
  const unscheduledWhere: Prisma.OrganisationWhereInput = {
    deletedAt: null,
    nextFollowupAt: null,
    status: { notIn: ['REJECTED', 'PARTNERSHIP'] },
    AND: [
      organisationScope(user),
      params.assignee === 'ME'
        ? { assignedToId: user.id }
        : params.assignee && params.assignee !== 'ALL'
          ? { assignedToId: params.assignee }
          : {},
    ],
  }

  const [unscheduled, unscheduledCount] = await Promise.all([
    prisma.organisation.findMany({
      where: unscheduledWhere,
      select: {
        id: true,
        name: true,
        status: true,
        priority: true,
        lastContactedAt: true,
        assignedTo: { select: { id: true, name: true, avatarColor: true } },
      },
      orderBy: [{ priority: 'asc' }, { lastContactedAt: { sort: 'asc', nulls: 'first' } }],
      take: 50,
    }),
    prisma.organisation.count({ where: unscheduledWhere }),
  ])

  return {
    overdue,
    today: dueToday,
    tomorrow,
    upcoming,
    unscheduled,
    counts: {
      overdue: overdue.length,
      today: dueToday.length,
      tomorrow: tomorrow.length,
      upcoming: upcoming.length,
      unscheduled: unscheduledCount,
    },
  }
}

/** Counts only — used for nav badges and dashboard tiles. */
export async function countFollowUps(
  user: Pick<CurrentUser, 'id' | 'role'>,
  assignee?: string,
): Promise<{ overdue: number; today: number; pending: number }> {
  const today = todayKey()
  const startToday = startOfDayUtc(today)
  const startTomorrow = startOfDayUtc(addDaysToKey(today, 1))

  const base: Prisma.FollowUpWhereInput = {
    deletedAt: null,
    status: 'PENDING',
    organisation: { deletedAt: null },
    AND: [assigneeClause(user, assignee)],
  }

  const [overdue, dueToday, pending] = await Promise.all([
    prisma.followUp.count({ where: { ...base, dueDate: { lt: startToday } } }),
    prisma.followUp.count({
      where: { ...base, dueDate: { gte: startToday, lt: startTomorrow } },
    }),
    prisma.followUp.count({ where: base }),
  ])

  return { overdue, today: dueToday, pending }
}

export async function getOrganisationFollowUps(organisationId: string) {
  return prisma.followUp.findMany({
    where: { organisationId, deletedAt: null },
    include: {
      contact: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true, avatarColor: true } },
      completedBy: { select: { id: true, name: true } },
    },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
  })
}

// ── Mutations ────────────────────────────────────────────────────────────────

async function loadWritableFollowUp(user: CurrentUser, id: string) {
  const followUp = await prisma.followUp.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      dueDate: true,
      note: true,
      status: true,
      assignedToId: true,
      organisationId: true,
      organisation: { select: { id: true, name: true, assignedToId: true, createdById: true } },
    },
  })
  if (!followUp) throw new NotFoundError('Follow-up')

  const mayManage =
    can(user, 'followup:manageAll') ||
    followUp.assignedToId === user.id ||
    followUp.organisation.assignedToId === user.id

  if (!mayManage) throw new ForbiddenError()
  return followUp
}

export async function createFollowUp(
  user: CurrentUser,
  input: FollowUpCreateInput,
): Promise<{ id: string; dueDate: Date }> {
  assertCan(user, 'followup:create')

  const org = await prisma.organisation.findFirst({
    where: { id: input.organisationId, deletedAt: null },
    select: { id: true, name: true, assignedToId: true, createdById: true },
  })
  if (!org) throw new NotFoundError('Organisation')

  const mayCreate =
    can(user, 'followup:manageAll') || org.assignedToId === user.id || org.createdById === user.id
  if (!mayCreate) throw new ForbiddenError()

  const assignedToId = can(user, 'followup:manageAll')
    ? (input.assignedToId ?? org.assignedToId ?? user.id)
    : (org.assignedToId ?? user.id)

  const dueDate = startOfDayUtc(input.dueDate)

  const created = await prisma.$transaction(async (tx) => {
    const followUp = await tx.followUp.create({
      data: {
        organisationId: org.id,
        contactId: input.contactId ?? null,
        activityId: input.activityId ?? null,
        dueDate,
        note: input.note ?? null,
        assignedToId,
        createdById: user.id,
      },
      select: { id: true, dueDate: true },
    })

    await recomputeOrganisationCaches(tx, org.id)

    await writeAudit(
      {
        userId: user.id,
        action: 'followup.created',
        entityType: 'followup',
        entityId: followUp.id,
        entityLabel: org.name,
        summary: `Follow-up scheduled for ${org.name} on ${input.dueDate}`,
        after: { dueDate: input.dueDate, note: input.note ?? null, assignedToId },
      },
      tx,
    )

    return followUp
  })

  return created
}

export async function rescheduleFollowUp(
  user: CurrentUser,
  input: { id: string; dueDate: DateKey; note?: string },
): Promise<{ id: string; dueDate: Date }> {
  const followUp = await loadWritableFollowUp(user, input.id)
  const dueDate = startOfDayUtc(input.dueDate)

  await prisma.$transaction(async (tx) => {
    await tx.followUp.update({
      where: { id: followUp.id },
      data: {
        dueDate,
        status: 'PENDING',
        completedAt: null,
        completedById: null,
        ...(input.note !== undefined ? { note: input.note ?? null } : {}),
      },
    })
    await recomputeOrganisationCaches(tx, followUp.organisationId)

    await writeAudit(
      {
        userId: user.id,
        action: 'followup.rescheduled',
        entityType: 'followup',
        entityId: followUp.id,
        entityLabel: followUp.organisation.name,
        summary: `Follow-up for ${followUp.organisation.name} moved to ${input.dueDate}`,
        before: { dueDate: followUp.dueDate.toISOString() },
        after: { dueDate: dueDate.toISOString() },
      },
      tx,
    )
  })

  return { id: followUp.id, dueDate }
}

export async function setFollowUpStatus(
  user: CurrentUser,
  input: { id: string; status: FollowUpStatus },
): Promise<{ id: string; status: FollowUpStatus }> {
  const followUp = await loadWritableFollowUp(user, input.id)

  await prisma.$transaction(async (tx) => {
    await tx.followUp.update({
      where: { id: followUp.id },
      data: {
        status: input.status,
        completedAt: input.status === 'DONE' ? new Date() : null,
        completedById: input.status === 'DONE' ? user.id : null,
      },
    })
    await recomputeOrganisationCaches(tx, followUp.organisationId)

    await writeAudit(
      {
        userId: user.id,
        action: input.status === 'DONE' ? 'followup.completed' : 'followup.cancelled',
        entityType: 'followup',
        entityId: followUp.id,
        entityLabel: followUp.organisation.name,
        summary:
          input.status === 'DONE'
            ? `Follow-up for ${followUp.organisation.name} marked done`
            : `Follow-up for ${followUp.organisation.name} cancelled`,
        before: { status: followUp.status },
        after: { status: input.status },
      },
      tx,
    )
  })

  return { id: followUp.id, status: input.status }
}

export async function completeFollowUp(user: CurrentUser, id: string) {
  return setFollowUpStatus(user, { id, status: 'DONE' })
}

export async function getFollowUp(user: CurrentUser, id: string) {
  const followUp = await prisma.followUp.findFirst({
    where: { id, deletedAt: null },
    include: followUpInclude,
  })
  if (!followUp) throw new NotFoundError('Follow-up')
  if (!canReadOrganisation(user, followUp.organisation)) throw new ForbiddenError()
  return followUp
}

export async function softDeleteFollowUp(user: CurrentUser, id: string): Promise<void> {
  const followUp = await loadWritableFollowUp(user, id)
  await prisma.$transaction(async (tx) => {
    await tx.followUp.update({
      where: { id: followUp.id },
      data: { deletedAt: new Date() },
    })
    await recomputeOrganisationCaches(tx, followUp.organisationId)
    await writeAudit(
      {
        userId: user.id,
        action: 'followup.cancelled',
        entityType: 'followup',
        entityId: followUp.id,
        entityLabel: followUp.organisation.name,
        summary: `Follow-up for ${followUp.organisation.name} deleted`,
      },
      tx,
    )
  })
}

export async function listFollowUpsForOrganisation(
  user: Pick<CurrentUser, 'id' | 'role'>,
  organisationId: string,
) {
  return getOrganisationFollowUps(organisationId)
}

export async function listFollowUps(
  user: Pick<CurrentUser, 'id' | 'role'>,
  params: {
    bucket?: 'TODAY' | 'OVERDUE' | 'TOMORROW' | 'UPCOMING'
    from?: string
    to?: string
    page?: number
    pageSize?: number
    assignee?: string
  } = {},
) {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 25))
  const skip = (page - 1) * pageSize

  const today = todayKey()
  const startToday = startOfDayUtc(today)
  const startTomorrow = startOfDayUtc(addDaysToKey(today, 1))
  const startDayAfter = startOfDayUtc(addDaysToKey(today, 2))
  const upcomingEnd = startOfDayUtc(addDaysToKey(today, 15))

  const baseWhere: Prisma.FollowUpWhereInput = {
    deletedAt: null,
    status: 'PENDING',
    organisation: { deletedAt: null },
    AND: [assigneeClause(user, params.assignee)],
  }

  let dateFilter: Prisma.FollowUpWhereInput = {}
  if (params.from || params.to) {
    const fromDate = params.from ? startOfDayUtc(params.from as DateKey) : undefined
    const toDate = params.to ? startOfDayUtc(addDaysToKey(params.to as DateKey, 1)) : undefined
    dateFilter = {
      dueDate: {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lt: toDate } : {}),
      },
    }
  } else if (params.bucket === 'OVERDUE') {
    dateFilter = { dueDate: { lt: startToday } }
  } else if (params.bucket === 'TODAY') {
    dateFilter = { dueDate: { gte: startToday, lt: startTomorrow } }
  } else if (params.bucket === 'TOMORROW') {
    dateFilter = { dueDate: { gte: startTomorrow, lt: startDayAfter } }
  } else if (params.bucket === 'UPCOMING') {
    dateFilter = { dueDate: { gte: startDayAfter, lt: upcomingEnd } }
  }

  const where: Prisma.FollowUpWhereInput = {
    ...baseWhere,
    ...dateFilter,
  }

  const [items, total] = await Promise.all([
    prisma.followUp.findMany({
      where,
      include: followUpInclude,
      orderBy: [{ dueDate: 'asc' }, { organisation: { priority: 'asc' } }],
      skip,
      take: pageSize,
    }),
    prisma.followUp.count({ where }),
  ])

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  }
}

