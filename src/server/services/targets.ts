import { prisma } from '@/lib/db'
import type { CurrentUser } from '@/lib/auth/current-user'
import { assertCan, can } from '@/lib/rbac'
import { startOfDayUtc, endOfDayUtc, todayKey } from '@/lib/dates'

export interface TargetProgress {
  userId: string
  userName: string
  avatarColor: string
  role: string
  targets: {
    calls: number
    emails: number
    linkedin: number
    meetings: number
    organisations: number
  }
  actuals: {
    calls: number
    emails: number
    linkedin: number
    meetings: number
    organisations: number
  }
  progressPercent: {
    calls: number
    emails: number
    linkedin: number
    meetings: number
    overall: number
  }
}

export async function getUserTarget(userId: string) {
  const target = await prisma.userTarget.findUnique({
    where: { userId },
  })

  return {
    dailyOrganisations: target?.dailyOrganisations ?? 20,
    dailyCalls: target?.dailyCalls ?? 15,
    dailyEmails: target?.dailyEmails ?? 20,
    dailyLinkedin: target?.dailyLinkedin ?? 10,
    dailyMeetings: target?.dailyMeetings ?? 2,
  }
}

export async function setUserTarget(
  currentUser: CurrentUser,
  targetUserId: string,
  targets: {
    dailyOrganisations?: number
    dailyCalls?: number
    dailyEmails?: number
    dailyLinkedin?: number
    dailyMeetings?: number
  },
) {
  assertCan(currentUser, 'user:manage')

  return prisma.userTarget.upsert({
    where: { userId: targetUserId },
    create: {
      userId: targetUserId,
      dailyOrganisations: targets.dailyOrganisations ?? 20,
      dailyCalls: targets.dailyCalls ?? 15,
      dailyEmails: targets.dailyEmails ?? 20,
      dailyLinkedin: targets.dailyLinkedin ?? 10,
      dailyMeetings: targets.dailyMeetings ?? 2,
    },
    update: {
      ...(targets.dailyOrganisations !== undefined ? { dailyOrganisations: targets.dailyOrganisations } : {}),
      ...(targets.dailyCalls !== undefined ? { dailyCalls: targets.dailyCalls } : {}),
      ...(targets.dailyEmails !== undefined ? { dailyEmails: targets.dailyEmails } : {}),
      ...(targets.dailyLinkedin !== undefined ? { dailyLinkedin: targets.dailyLinkedin } : {}),
      ...(targets.dailyMeetings !== undefined ? { dailyMeetings: targets.dailyMeetings } : {}),
    },
  })
}

export async function getTeamTargetsAndProgress(
  currentUser: CurrentUser,
  dateKey?: string,
): Promise<TargetProgress[]> {
  const dayKey = dateKey || todayKey()
  const start = startOfDayUtc(dayKey)
  const end = endOfDayUtc(dayKey)

  // Interns only see their own target; Owner/TL see whole team
  const isManagement = can(currentUser, 'user:manage')
  const userFilter = isManagement
    ? { isActive: true, deletedAt: null }
    : { id: currentUser.id, isActive: true, deletedAt: null }

  const users = await prisma.user.findMany({
    where: userFilter,
    select: {
      id: true,
      name: true,
      avatarColor: true,
      role: true,
      target: true,
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })

  const results: TargetProgress[] = []

  for (const u of users) {
    const target = {
      calls: u.target?.dailyCalls ?? 15,
      emails: u.target?.dailyEmails ?? 20,
      linkedin: u.target?.dailyLinkedin ?? 10,
      meetings: u.target?.dailyMeetings ?? 2,
      organisations: u.target?.dailyOrganisations ?? 20,
    }

    const [calls, emails, linkedin, meetings, orgs] = await Promise.all([
      prisma.activity.count({
        where: { performedById: u.id, type: 'CALL', activityDate: { gte: start, lte: end }, deletedAt: null },
      }),
      prisma.activity.count({
        where: { performedById: u.id, type: 'EMAIL', activityDate: { gte: start, lte: end }, deletedAt: null },
      }),
      prisma.activity.count({
        where: { performedById: u.id, type: 'LINKEDIN', activityDate: { gte: start, lte: end }, deletedAt: null },
      }),
      prisma.activity.count({
        where: { performedById: u.id, type: 'MEETING', activityDate: { gte: start, lte: end }, deletedAt: null },
      }),
      prisma.activity.findMany({
        where: { performedById: u.id, activityDate: { gte: start, lte: end }, deletedAt: null },
        distinct: ['organisationId'],
        select: { organisationId: true },
      }),
    ])

    const actuals = {
      calls,
      emails,
      linkedin,
      meetings,
      organisations: orgs.length,
    }

    const calcProgress = (act: number, tgt: number) => (tgt > 0 ? Math.min(100, Math.round((act / tgt) * 100)) : 100)

    const callsProgress = calcProgress(actuals.calls, target.calls)
    const emailsProgress = calcProgress(actuals.emails, target.emails)
    const linkedinProgress = calcProgress(actuals.linkedin, target.linkedin)
    const meetingsProgress = calcProgress(actuals.meetings, target.meetings)

    const overall = Math.round((callsProgress + emailsProgress + linkedinProgress) / 3)

    results.push({
      userId: u.id,
      userName: u.name,
      avatarColor: u.avatarColor,
      role: u.role,
      targets: target,
      actuals,
      progressPercent: {
        calls: callsProgress,
        emails: emailsProgress,
        linkedin: linkedinProgress,
        meetings: meetingsProgress,
        overall,
      },
    })
  }

  return results
}
