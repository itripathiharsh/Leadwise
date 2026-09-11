import type { ActivityOutcome, ActivityType, OrgStatus, Prisma, Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { CurrentUser } from '@/lib/auth/current-user'
import { activityScope, organisationScope } from '@/lib/rbac'
import {
  HOT_STATUSES,
  INTERESTED_OUTCOMES,
  ORG_STATUS_ORDER,
  RESPONSE_OUTCOMES,
} from '@/lib/constants'
import {
  addDaysToKey,
  dayRangeUtc,
  rangeUtc,
  startOfDayUtc,
  toDateKey,
  todayKey,
  type DateKey,
} from '@/lib/dates'

/**
 * Metrics (spec §16, §17, §25).
 *
 * Every number the dashboards and the EOD report show is computed here, from
 * the database, deterministically. The AI layer is handed these values as facts
 * and is never allowed to produce a number of its own (spec §26).
 *
 * Definitions, fixed once so the same word means the same thing everywhere:
 *   • Organisations contacted — distinct organisations with at least one
 *     non-NOTE activity in the window.
 *   • Responses — activities whose outcome shows the other side engaged
 *     (connected, replied, connection accepted, interested, not interested,
 *     meeting scheduled/completed).
 *   • Interested — distinct organisations with an INTERESTED outcome.
 */

export interface ChannelCounts {
  calls: number
  emails: number
  linkedin: number
  meetings: number
  followUps: number
  notes: number
}

export interface CoreMetrics extends ChannelCounts {
  activities: number
  organisationsContacted: number
  responses: number
  interested: number
  meetingsScheduled: number
  meetingsCompleted: number
  rejected: number
}

export interface DayMetrics extends CoreMetrics {
  dateKey: DateKey
  newOrganisations: number
  newContacts: number
  followUpsCompleted: number
  followUpsPending: number
  followUpsOverdue: number
}

export interface UserMetrics extends CoreMetrics {
  userId: string
  name: string
  role: Role
  avatarColor: string
  followUpsDueToday: number
  followUpsOverdue: number
}

interface ActivityRow {
  performedById: string
  organisationId: string
  type: ActivityType
  outcome: ActivityOutcome
}

const EMPTY_CORE = (): CoreMetrics => ({
  activities: 0,
  calls: 0,
  emails: 0,
  linkedin: 0,
  meetings: 0,
  followUps: 0,
  notes: 0,
  organisationsContacted: 0,
  responses: 0,
  interested: 0,
  meetingsScheduled: 0,
  meetingsCompleted: 0,
  rejected: 0,
})

export function accumulate(rows: ActivityRow[]): CoreMetrics {
  const core = EMPTY_CORE()
  const contactedOrgs = new Set<string>()
  const interestedOrgs = new Set<string>()
  const rejectedOrgs = new Set<string>()

  for (const row of rows) {
    core.activities += 1

    switch (row.type) {
      case 'CALL':
        core.calls += 1
        break
      case 'EMAIL':
        core.emails += 1
        break
      case 'LINKEDIN':
        core.linkedin += 1
        break
      case 'MEETING':
        core.meetings += 1
        break
      case 'FOLLOW_UP':
        core.followUps += 1
        break
      case 'NOTE':
        core.notes += 1
        break
    }

    if (row.type !== 'NOTE') contactedOrgs.add(row.organisationId)
    if (RESPONSE_OUTCOMES.includes(row.outcome)) core.responses += 1
    if (INTERESTED_OUTCOMES.includes(row.outcome)) interestedOrgs.add(row.organisationId)
    if (row.outcome === 'NOT_INTERESTED') rejectedOrgs.add(row.organisationId)
    if (row.outcome === 'MEETING_SCHEDULED') core.meetingsScheduled += 1
    if (row.outcome === 'MEETING_COMPLETED') core.meetingsCompleted += 1
  }

  core.organisationsContacted = contactedOrgs.size
  core.interested = interestedOrgs.size
  core.rejected = rejectedOrgs.size
  return core
}

function activityWindowWhere(
  user: Pick<CurrentUser, 'id' | 'role'> | null,
  start: Date,
  end: Date,
): Prisma.ActivityWhereInput {
  return {
    deletedAt: null,
    activityDate: { gte: start, lt: end },
    organisation: { deletedAt: null },
    ...(user ? { AND: [activityScope(user)] } : {}),
  }
}

/**
 * Whole-team metrics for one calendar day. Pass `user` to scope to what that
 * user may see; pass null for the organisation-wide EOD figures.
 */
export async function getDayMetrics(
  dateKey: DateKey,
  user: Pick<CurrentUser, 'id' | 'role'> | null = null,
): Promise<DayMetrics> {
  const { start, end } = dayRangeUtc(dateKey)
  const orgScope = user ? organisationScope(user) : {}

  const [rows, newOrganisations, newContacts, followUpsCompleted, followUpsPending, followUpsOverdue] =
    await Promise.all([
      prisma.activity.findMany({
        where: activityWindowWhere(user, start, end),
        select: { performedById: true, organisationId: true, type: true, outcome: true },
      }),
      prisma.organisation.count({
        where: { deletedAt: null, createdAt: { gte: start, lt: end }, AND: [orgScope] },
      }),
      prisma.contact.count({
        where: {
          deletedAt: null,
          createdAt: { gte: start, lt: end },
          organisation: { deletedAt: null, AND: [orgScope] },
        },
      }),
      prisma.followUp.count({
        where: {
          deletedAt: null,
          status: 'DONE',
          completedAt: { gte: start, lt: end },
          organisation: { deletedAt: null, AND: [orgScope] },
        },
      }),
      prisma.followUp.count({
        where: {
          deletedAt: null,
          status: 'PENDING',
          organisation: { deletedAt: null, AND: [orgScope] },
        },
      }),
      prisma.followUp.count({
        where: {
          deletedAt: null,
          status: 'PENDING',
          dueDate: { lt: startOfDayUtc(todayKey()) },
          organisation: { deletedAt: null, AND: [orgScope] },
        },
      }),
    ])

  return {
    dateKey,
    ...accumulate(rows),
    newOrganisations,
    newContacts,
    followUpsCompleted,
    followUpsPending,
    followUpsOverdue,
  }
}

/** Per-person breakdown for the same day — the EOD "team performance" table. */
export async function getUserDayMetrics(
  dateKey: DateKey,
  user: Pick<CurrentUser, 'id' | 'role'> | null = null,
): Promise<UserMetrics[]> {
  const { start, end } = dayRangeUtc(dateKey)

  const [rows, users, overdueGroups, dueTodayGroups] = await Promise.all([
    prisma.activity.findMany({
      where: activityWindowWhere(user, start, end),
      select: { performedById: true, organisationId: true, type: true, outcome: true },
    }),
    prisma.user.findMany({
      where: { deletedAt: null, isActive: true, role: { not: 'OWNER' } },
      select: { id: true, name: true, role: true, avatarColor: true },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    }),
    prisma.followUp.groupBy({
      by: ['assignedToId'],
      _count: { id: true },
      where: {
        deletedAt: null,
        status: 'PENDING',
        dueDate: { lt: start },
        organisation: { deletedAt: null },
      },
    }),
    prisma.followUp.groupBy({
      by: ['assignedToId'],
      _count: { id: true },
      where: {
        deletedAt: null,
        status: 'PENDING',
        dueDate: { gte: start, lt: end },
        organisation: { deletedAt: null },
      },
    }),
  ])

  const overdueByUser = new Map(overdueGroups.map((g) => [g.assignedToId, g._count.id]))
  const dueTodayByUser = new Map(dueTodayGroups.map((g) => [g.assignedToId, g._count.id]))

  const byUser = new Map<string, ActivityRow[]>()
  for (const row of rows) {
    const bucket = byUser.get(row.performedById)
    if (bucket) bucket.push(row)
    else byUser.set(row.performedById, [row])
  }

  const result: UserMetrics[] = users.map((u) => ({
    userId: u.id,
    name: u.name,
    role: u.role,
    avatarColor: u.avatarColor,
    followUpsDueToday: dueTodayByUser.get(u.id) ?? 0,
    followUpsOverdue: overdueByUser.get(u.id) ?? 0,
    ...accumulate(byUser.get(u.id) ?? []),
  }))

  // Someone deactivated mid-day still did the work — keep their row.
  for (const [userId, userRows] of byUser) {
    if (result.some((r) => r.userId === userId)) continue
    const person = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true, avatarColor: true },
    })
    if (!person || person.role === 'OWNER') continue
    result.push({
      userId: person.id,
      name: person.name,
      role: person.role,
      avatarColor: person.avatarColor,
      followUpsDueToday: dueTodayByUser.get(person.id) ?? 0,
      followUpsOverdue: overdueByUser.get(person.id) ?? 0,
      ...accumulate(userRows),
    })
  }

  return result.sort((a, b) => b.activities - a.activities || a.name.localeCompare(b.name))
}

/** Metrics for one person over an arbitrary window (intern dashboard). */
export async function getPersonMetrics(
  userId: string,
  fromKey: DateKey,
  toKey: DateKey,
): Promise<CoreMetrics> {
  const { start, end } = rangeUtc(fromKey, toKey)
  const rows = await prisma.activity.findMany({
    where: {
      deletedAt: null,
      performedById: userId,
      activityDate: { gte: start, lt: end },
      organisation: { deletedAt: null },
    },
    select: { performedById: true, organisationId: true, type: true, outcome: true },
  })
  return accumulate(rows)
}

/** Metrics for the whole team over an arbitrary window (workspace owner / team view). */
export async function getTeamMetrics(
  fromKey: DateKey,
  toKey: DateKey,
): Promise<CoreMetrics> {
  const { start, end } = rangeUtc(fromKey, toKey)
  const rows = await prisma.activity.findMany({
    where: {
      deletedAt: null,
      activityDate: { gte: start, lt: end },
      organisation: { deletedAt: null },
    },
    select: { performedById: true, organisationId: true, type: true, outcome: true },
  })
  return accumulate(rows)
}

// ── Trend & pipeline ─────────────────────────────────────────────────────────

export interface TrendPoint {
  dateKey: DateKey
  label: string
  calls: number
  emails: number
  linkedin: number
  meetings: number
  total: number
}

/** Daily activity trend for the dashboard chart (spec §17, §35). */
export async function getActivityTrend(
  user: Pick<CurrentUser, 'id' | 'role'> | null,
  days = 14,
  performedById?: string,
): Promise<TrendPoint[]> {
  const to = todayKey()
  const from = addDaysToKey(to, -(days - 1))
  const { start, end } = rangeUtc(from, to)

  const rows = await prisma.activity.findMany({
    where: {
      ...activityWindowWhere(user, start, end),
      ...(performedById ? { performedById } : {}),
    },
    select: { activityDate: true, type: true },
  })

  const buckets = new Map<DateKey, TrendPoint>()
  for (let i = 0; i < days; i++) {
    const key = addDaysToKey(from, i)
    const [, month, day] = key.split('-')
    buckets.set(key, {
      dateKey: key,
      label: `${Number(day)}/${Number(month)}`,
      calls: 0,
      emails: 0,
      linkedin: 0,
      meetings: 0,
      total: 0,
    })
  }

  for (const row of rows) {
    const point = buckets.get(toDateKey(row.activityDate))
    if (!point) continue
    point.total += 1
    if (row.type === 'CALL') point.calls += 1
    else if (row.type === 'EMAIL') point.emails += 1
    else if (row.type === 'LINKEDIN') point.linkedin += 1
    else if (row.type === 'MEETING') point.meetings += 1
  }

  return [...buckets.values()]
}

export interface PipelineSlice {
  status: OrgStatus
  count: number
}

export async function getPipeline(
  user: Pick<CurrentUser, 'id' | 'role'>,
  assigneeId?: string,
): Promise<PipelineSlice[]> {
  const grouped = await prisma.organisation.groupBy({
    by: ['status'],
    where: {
      deletedAt: null,
      ...(assigneeId ? { assignedToId: assigneeId } : {}),
      AND: [organisationScope(user)],
    },
    _count: { _all: true },
  })

  const map = new Map(grouped.map((g) => [g.status, g._count._all]))
  return ORG_STATUS_ORDER.map((status) => ({ status, count: map.get(status) ?? 0 }))
}

export interface PortfolioTotals {
  organisations: number
  contacts: number
  decisionMakers: number
  hot: number
  unassigned: number
  neverContacted: number
  staleWeek: number
}

export async function getPortfolioTotals(
  user: Pick<CurrentUser, 'id' | 'role'>,
  assigneeId?: string,
): Promise<PortfolioTotals> {
  const scope: Prisma.OrganisationWhereInput = {
    deletedAt: null,
    ...(assigneeId ? { assignedToId: assigneeId } : {}),
    AND: [organisationScope(user)],
  }
  const staleBefore = startOfDayUtc(addDaysToKey(todayKey(), -7))

  const [organisations, contacts, decisionMakers, hot, unassigned, neverContacted, staleWeek] =
    await Promise.all([
      prisma.organisation.count({ where: scope }),
      prisma.contact.count({ where: { deletedAt: null, organisation: scope } }),
      prisma.contact.count({
        where: { deletedAt: null, isDecisionMaker: true, organisation: scope },
      }),
      prisma.organisation.count({ where: { ...scope, status: { in: HOT_STATUSES } } }),
      prisma.organisation.count({ where: { ...scope, assignedToId: null } }),
      prisma.organisation.count({ where: { ...scope, lastContactedAt: null } }),
      prisma.organisation.count({
        where: {
          ...scope,
          lastContactedAt: { lt: staleBefore },
          status: { notIn: ['REJECTED', 'PARTNERSHIP'] },
        },
      }),
    ])

  return { organisations, contacts, decisionMakers, hot, unassigned, neverContacted, staleWeek }
}

/** Hot leads worth the Owner's attention right now. */
export async function getHotOrganisations(user: Pick<CurrentUser, 'id' | 'role'>, take = 6) {
  return prisma.organisation.findMany({
    where: { deletedAt: null, status: { in: HOT_STATUSES }, AND: [organisationScope(user)] },
    select: {
      id: true,
      name: true,
      status: true,
      priority: true,
      lastContactedAt: true,
      nextFollowupAt: true,
      assignedTo: { select: { id: true, name: true, avatarColor: true } },
    },
    orderBy: [{ status: 'desc' }, { lastContactedAt: { sort: 'desc', nulls: 'last' } }],
    take,
  })
}

/**
 * Organisations that have gone quiet — assigned but untouched for a week, or
 * never contacted at all. This is the list that actually needs chasing.
 */
export async function getStaleOrganisations(
  user: Pick<CurrentUser, 'id' | 'role'>,
  options: { assigneeId?: string; days?: number; take?: number } = {},
) {
  const cutoff = startOfDayUtc(addDaysToKey(todayKey(), -(options.days ?? 7)))
  return prisma.organisation.findMany({
    where: {
      deletedAt: null,
      status: { notIn: ['REJECTED', 'PARTNERSHIP'] },
      ...(options.assigneeId ? { assignedToId: options.assigneeId } : {}),
      OR: [{ lastContactedAt: null }, { lastContactedAt: { lt: cutoff } }],
      AND: [organisationScope(user)],
    },
    select: {
      id: true,
      name: true,
      status: true,
      priority: true,
      lastContactedAt: true,
      nextFollowupAt: true,
      activityCount: true,
      assignedTo: { select: { id: true, name: true, avatarColor: true } },
      _count: { select: { contacts: { where: { deletedAt: null } } } },
    },
    orderBy: [{ priority: 'asc' }, { lastContactedAt: { sort: 'asc', nulls: 'first' } }],
    take: options.take ?? 8,
  })
}
