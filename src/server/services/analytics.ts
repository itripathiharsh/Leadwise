import { prisma } from '@/lib/db'
import type { CurrentUser } from '@/lib/auth/current-user'
import { RESPONSE_OUTCOMES, INTERESTED_OUTCOMES } from '@/lib/constants'

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

export async function getWeeklyAnalytics(
  _user: CurrentUser,
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
}> {
  const now = new Date()

  // Current week (past 7 days)
  const currentWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const currentWeekEnd = now

  // Previous week (7 to 14 days ago)
  const prevWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const prevWeekEnd = currentWeekStart

  const [currActivities, prevActivities, currFollowupsDone, prevFollowupsDone, teamUsers] =
    await Promise.all([
      prisma.activity.findMany({
        where: { activityDate: { gte: currentWeekStart, lte: currentWeekEnd }, deletedAt: null },
        select: { organisationId: true, type: true, outcome: true, performedById: true },
      }),
      prisma.activity.findMany({
        where: { activityDate: { gte: prevWeekStart, lte: prevWeekEnd }, deletedAt: null },
        select: { organisationId: true, type: true, outcome: true, performedById: true },
      }),
      prisma.followUp.count({
        where: { status: 'DONE', completedAt: { gte: currentWeekStart, lte: currentWeekEnd }, deletedAt: null },
      }),
      prisma.followUp.count({
        where: { status: 'DONE', completedAt: { gte: prevWeekStart, lte: prevWeekEnd }, deletedAt: null },
      }),
      prisma.user.findMany({
        where: { isActive: true, deletedAt: null },
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

  // Team breakdown for current week
  const teamBreakdown: TeamMemberWeeklyComparison[] = teamUsers.map((u) => {
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

  return {
    currentWeek,
    previousWeek,
    growthPercent,
    teamBreakdown,
  }
}
