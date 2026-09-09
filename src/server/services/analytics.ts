import { prisma } from '@/lib/db'
import type { CurrentUser } from '@/lib/auth/current-user'
import { RESPONSE_OUTCOMES, INTERESTED_OUTCOMES } from '@/lib/constants'
import { todayKey, addDaysToKey, dayRangeUtc } from '@/lib/dates'

export interface PeriodSummary {
  periodLabel: string
  startDate: string
  endDate: string
  organisationsContacted: number
  calls: number
  emails: number
  linkedin: number
  responses: number
  interested: number
  meetings: number
  followUpsCompleted: number
  followUpsMissed: number
}

export interface TeamMemberWeeklyComparison {
  userId: string
  userName: string
  avatarColor: string
  role: string
  organisations: number
  calls: number
  emails: number
  linkedin: number
  responses: number
  interested: number
  meetings: number
}

export interface ExecutiveTodayVsYesterday {
  todayDate: string
  yesterdayDate: string
  todayTotals: {
    total: number
    calls: number
    emails: number
    linkedin: number
    meetings: number
    orgs: number
    responses: number
  }
  yesterdayTotals: {
    total: number
    calls: number
    emails: number
    linkedin: number
    meetings: number
    orgs: number
    responses: number
  }
  velocityChangePercent: number
  channelData: Array<{
    channel: string
    Today: number
    Yesterday: number
    diff: number
  }>
}

export interface ExecutiveDomainCoverage {
  domain: string
  totalOrganisations: number
  contactedOrganisations: number
  uncontactedOrganisations: number
  activitiesCount: number
  pipelineLeads: number
  coveragePercent: number
}

export interface ExecutiveAnalytics {
  todayVsYesterday: ExecutiveTodayVsYesterday
  domainsCovered: ExecutiveDomainCoverage[]
}

export async function getWeeklyAnalytics(
  user: CurrentUser,
): Promise<{
  currentWeek: PeriodSummary
  previousWeek: PeriodSummary
  growthPercent: {
    organisations: number
    calls: number
    emails: number
    linkedin: number
    responses: number
    meetings: number
  }
  teamBreakdown: TeamMemberWeeklyComparison[]
  isLeader: boolean
  executiveAnalytics: ExecutiveAnalytics | null
}> {
  const now = new Date()
  const isLeader = user.role === 'OWNER' || user.role === 'TL'
  const actScope = isLeader ? {} : { performedById: user.id }
  const followupScope = isLeader ? {} : { assignedToId: user.id }

  // Current week (past 7 days)
  const currentWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const currentWeekEnd = now

  // Previous week (7 to 14 days ago)
  const prevWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const prevWeekEnd = currentWeekStart

  const [currActivities, prevActivities, currFollowupsDone, prevFollowupsDone, teamUsers] =
    await Promise.all([
      prisma.activity.findMany({
        where: { activityDate: { gte: currentWeekStart, lte: currentWeekEnd }, deletedAt: null, ...actScope },
        select: { organisationId: true, type: true, outcome: true, performedById: true },
      }),
      prisma.activity.findMany({
        where: { activityDate: { gte: prevWeekStart, lte: prevWeekEnd }, deletedAt: null, ...actScope },
        select: { organisationId: true, type: true, outcome: true, performedById: true },
      }),
      prisma.followUp.count({
        where: { status: 'DONE', completedAt: { gte: currentWeekStart, lte: currentWeekEnd }, deletedAt: null, ...followupScope },
      }),
      prisma.followUp.count({
        where: { status: 'DONE', completedAt: { gte: prevWeekStart, lte: prevWeekEnd }, deletedAt: null, ...followupScope },
      }),
      prisma.user.findMany({
        where: { isActive: true, deletedAt: null, ...(isLeader ? {} : { id: user.id }) },
        select: { id: true, name: true, avatarColor: true, role: true },
      }),
    ])

  const summarize = (
    acts: typeof currActivities,
    doneCount: number,
    label: string,
    start: Date,
    end: Date,
  ): PeriodSummary => {
    const orgIds = new Set(acts.map((a) => a.organisationId))
    const calls = acts.filter((a) => a.type === 'CALL').length
    const emails = acts.filter((a) => a.type === 'EMAIL').length
    const linkedin = acts.filter((a) => a.type === 'LINKEDIN').length
    const meetings = acts.filter((a) => a.type === 'MEETING').length
    const responses = acts.filter((a) => RESPONSE_OUTCOMES.includes(a.outcome)).length
    const interested = acts.filter((a) => INTERESTED_OUTCOMES.includes(a.outcome)).length

    return {
      periodLabel: label,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      organisationsContacted: orgIds.size,
      calls,
      emails,
      linkedin,
      responses,
      interested,
      meetings,
      followUpsCompleted: doneCount,
      followUpsMissed: 0,
    }
  }

  const currentWeek = summarize(currActivities, currFollowupsDone, 'Current Week', currentWeekStart, currentWeekEnd)
  const previousWeek = summarize(prevActivities, prevFollowupsDone, 'Previous Week', prevWeekStart, prevWeekEnd)

  const calcGrowth = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0
    return Math.round(((curr - prev) / prev) * 100)
  }

  const growthPercent = {
    organisations: calcGrowth(currentWeek.organisationsContacted, previousWeek.organisationsContacted),
    calls: calcGrowth(currentWeek.calls, previousWeek.calls),
    emails: calcGrowth(currentWeek.emails, previousWeek.emails),
    linkedin: calcGrowth(currentWeek.linkedin, previousWeek.linkedin),
    responses: calcGrowth(currentWeek.responses, previousWeek.responses),
    meetings: calcGrowth(currentWeek.meetings, previousWeek.meetings),
  }

  // Team breakdown for current week (only visible to Owner and TL)
  const teamBreakdown: TeamMemberWeeklyComparison[] = isLeader
    ? teamUsers.map((u) => {
        const userActs = currActivities.filter((a) => a.performedById === u.id)
        const userOrgIds = new Set(userActs.map((a) => a.organisationId))

        return {
          userId: u.id,
          userName: u.name,
          avatarColor: u.avatarColor,
          role: u.role,
          organisations: userOrgIds.size,
          calls: userActs.filter((a) => a.type === 'CALL').length,
          emails: userActs.filter((a) => a.type === 'EMAIL').length,
          linkedin: userActs.filter((a) => a.type === 'LINKEDIN').length,
          responses: userActs.filter((a) => RESPONSE_OUTCOMES.includes(a.outcome)).length,
          interested: userActs.filter((a) => INTERESTED_OUTCOMES.includes(a.outcome)).length,
          meetings: userActs.filter((a) => a.type === 'MEETING').length,
        }
      })
    : []

  // Executive analytics: Today vs Yesterday & Domains Covered (specifically for Team Lead & Owner)
  let executiveAnalytics: ExecutiveAnalytics | null = null

  if (isLeader) {
    const tKey = todayKey()
    const yKey = addDaysToKey(tKey, -1)
    const todayRange = dayRangeUtc(tKey)
    const yesterdayRange = dayRangeUtc(yKey)

    const [todayActs, yesterdayActs, allOrgs] = await Promise.all([
      prisma.activity.findMany({
        where: { activityDate: { gte: todayRange.start, lt: todayRange.end }, deletedAt: null },
        select: { organisationId: true, type: true, outcome: true },
      }),
      prisma.activity.findMany({
        where: { activityDate: { gte: yesterdayRange.start, lt: yesterdayRange.end }, deletedAt: null },
        select: { organisationId: true, type: true, outcome: true },
      }),
      prisma.organisation.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          domain: true,
          category: true,
          status: true,
          _count: {
            select: { activities: { where: { deletedAt: null } } },
          },
        },
      }),
    ])

    const summarizeDay = (acts: typeof todayActs) => {
      const orgs = new Set(acts.map((a) => a.organisationId)).size
      const calls = acts.filter((a) => a.type === 'CALL').length
      const emails = acts.filter((a) => a.type === 'EMAIL').length
      const linkedin = acts.filter((a) => a.type === 'LINKEDIN').length
      const meetings = acts.filter((a) => a.type === 'MEETING').length
      const responses = acts.filter((a) => RESPONSE_OUTCOMES.includes(a.outcome)).length
      const interested = acts.filter((a) => INTERESTED_OUTCOMES.includes(a.outcome)).length
      const total = acts.length
      return { total, calls, emails, linkedin, meetings, orgs, responses, interested }
    }

    const todayTotals = summarizeDay(todayActs)
    const yesterdayTotals = summarizeDay(yesterdayActs)

    const channelData = [
      {
        channel: 'Calls',
        Today: todayTotals.calls,
        Yesterday: yesterdayTotals.calls,
        diff: todayTotals.calls - yesterdayTotals.calls,
      },
      {
        channel: 'Emails',
        Today: todayTotals.emails,
        Yesterday: yesterdayTotals.emails,
        diff: todayTotals.emails - yesterdayTotals.emails,
      },
      {
        channel: 'LinkedIn',
        Today: todayTotals.linkedin,
        Yesterday: yesterdayTotals.linkedin,
        diff: todayTotals.linkedin - yesterdayTotals.linkedin,
      },
      {
        channel: 'Meetings',
        Today: todayTotals.meetings,
        Yesterday: yesterdayTotals.meetings,
        diff: todayTotals.meetings - yesterdayTotals.meetings,
      },
      {
        channel: 'Orgs Reached',
        Today: todayTotals.orgs,
        Yesterday: yesterdayTotals.orgs,
        diff: todayTotals.orgs - yesterdayTotals.orgs,
      },
    ]

    // Resolve human-friendly domain names
    const resolveDomain = (org: { domain: string | null; category: string | null }): string => {
      if (org.domain && !org.domain.includes('.') && org.domain.trim().length > 0) {
        return org.domain.trim()
      }
      if (org.category && org.category.trim().length > 0) {
        return org.category.trim()
      }
      return 'General Healthcare & Wellness'
    }

    const domainMap = new Map<string, { total: number; contacted: number; activities: number; interested: number }>()

    for (const org of allOrgs) {
      const dom = resolveDomain(org)
      const cur = domainMap.get(dom) || { total: 0, contacted: 0, activities: 0, interested: 0 }
      cur.total += 1
      if (org._count.activities > 0) cur.contacted += 1
      cur.activities += org._count.activities
      if (['INTERESTED', 'MEETING', 'PARTNERSHIP'].includes(org.status)) {
        cur.interested += 1
      }
      domainMap.set(dom, cur)
    }

    const domainsCovered: ExecutiveDomainCoverage[] = Array.from(domainMap.entries())
      .map(([domain, stat]) => ({
        domain,
        totalOrganisations: stat.total,
        contactedOrganisations: stat.contacted,
        uncontactedOrganisations: Math.max(0, stat.total - stat.contacted),
        activitiesCount: stat.activities,
        pipelineLeads: stat.interested,
        coveragePercent: stat.total > 0 ? Math.round((stat.contacted / stat.total) * 100) : 0,
      }))
      .sort((a, b) => b.totalOrganisations - a.totalOrganisations)

    executiveAnalytics = {
      todayVsYesterday: {
        todayDate: 'Today',
        yesterdayDate: 'Yesterday',
        todayTotals,
        yesterdayTotals,
        velocityChangePercent: calcGrowth(todayTotals.total, yesterdayTotals.total),
        channelData,
      },
      domainsCovered,
    }
  }

  return {
    currentWeek,
    previousWeek,
    growthPercent,
    teamBreakdown,
    isLeader,
    executiveAnalytics,
  }
}
