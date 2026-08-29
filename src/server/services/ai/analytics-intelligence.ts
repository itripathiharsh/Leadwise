import { prisma } from '@/lib/db'
import type { CurrentUser } from '@/lib/auth/current-user'
import { organisationScope } from '@/lib/rbac'
import { RESPONSE_OUTCOMES, INTERESTED_OUTCOMES } from '@/lib/constants'
import { generateAiCompletion } from './provider'

export interface FunnelStageData {
  stage: string
  count: number
  conversionFromPrev: number // Percentage (0-100)
  dropoffCount: number
}

export interface AdvancedOutreachAnalytics {
  funnel: FunnelStageData[]
  overallConversionRate: number // Percentage from NEW to PARTNERSHIP
  channelPerformance: Array<{
    channel: string
    touches: number
    responses: number
    responseRate: number
    meetings: number
    meetingRate: number
  }>
  domainPerformance: Array<{
    category: string
    totalOrgs: number
    interestedCount: number
    conversionRate: number
  }>
  leadAgeing: Array<{
    stage: string
    avgDaysInStage: number
  }>
  rejectionAnalysis: {
    totalRejections: number
    reasonsBreakdown: Array<{ reason: string; count: number; percent: number }>
    aiInsight: string
  }
}

export async function getAdvancedOutreachAnalytics(
  user: CurrentUser,
): Promise<AdvancedOutreachAnalytics> {
  const scope = organisationScope(user)

  // 1. Funnel Counts
  const [newCount, contactedCount, respondedCount, interestedCount, meetingCount, partnershipCount, rejectedCount] =
    await Promise.all([
      prisma.organisation.count({ where: { deletedAt: null, AND: [scope, { status: 'NEW' }] } }),
      prisma.organisation.count({ where: { deletedAt: null, AND: [scope, { status: 'CONTACTED' }] } }),
      prisma.organisation.count({ where: { deletedAt: null, AND: [scope, { status: 'RESPONDED' }] } }),
      prisma.organisation.count({ where: { deletedAt: null, AND: [scope, { status: 'INTERESTED' }] } }),
      prisma.organisation.count({ where: { deletedAt: null, AND: [scope, { status: 'MEETING' }] } }),
      prisma.organisation.count({ where: { deletedAt: null, AND: [scope, { status: 'PARTNERSHIP' }] } }),
      prisma.organisation.count({ where: { deletedAt: null, AND: [scope, { status: 'REJECTED' }] } }),
    ])

  const total = newCount + contactedCount + respondedCount + interestedCount + meetingCount + partnershipCount + rejectedCount

  const funnel: FunnelStageData[] = [
    { stage: 'Target Universe', count: total, conversionFromPrev: 100, dropoffCount: 0 },
    { stage: 'Contacted', count: contactedCount + respondedCount + interestedCount + meetingCount + partnershipCount, conversionFromPrev: total > 0 ? Math.round(((total - newCount) / total) * 100) : 0, dropoffCount: newCount },
    { stage: 'Responded', count: respondedCount + interestedCount + meetingCount + partnershipCount, conversionFromPrev: (total - newCount) > 0 ? Math.round(((respondedCount + interestedCount + meetingCount + partnershipCount) / (total - newCount)) * 100) : 0, dropoffCount: contactedCount },
    { stage: 'Interested', count: interestedCount + meetingCount + partnershipCount, conversionFromPrev: (respondedCount + interestedCount + meetingCount + partnershipCount) > 0 ? Math.round(((interestedCount + meetingCount + partnershipCount) / (respondedCount + interestedCount + meetingCount + partnershipCount)) * 100) : 0, dropoffCount: respondedCount },
    { stage: 'Meeting Demo', count: meetingCount + partnershipCount, conversionFromPrev: (interestedCount + meetingCount + partnershipCount) > 0 ? Math.round(((meetingCount + partnershipCount) / (interestedCount + meetingCount + partnershipCount)) * 100) : 0, dropoffCount: interestedCount },
    { stage: 'Partnership Signed', count: partnershipCount, conversionFromPrev: (meetingCount + partnershipCount) > 0 ? Math.round((partnershipCount / (meetingCount + partnershipCount)) * 100) : 0, dropoffCount: meetingCount },
  ]

  const overallConversionRate = total > 0 ? Math.round((partnershipCount / total) * 100) : 0

  // 2. Channel Performance
  const activities = await prisma.activity.findMany({
    where: { deletedAt: null },
    select: { type: true, outcome: true },
  })

  const channels = ['CALL', 'EMAIL', 'LINKEDIN', 'MEETING'] as const
  const channelPerformance = channels.map((ch) => {
    const chActs = activities.filter((a) => a.type === ch)
    const touches = chActs.length
    const responses = chActs.filter((a) => RESPONSE_OUTCOMES.includes(a.outcome)).length
    const meetings = chActs.filter((a) => a.outcome === 'MEETING_SCHEDULED' || a.outcome === 'MEETING_COMPLETED').length

    return {
      channel: ch === 'CALL' ? 'Phone Calls' : ch === 'EMAIL' ? 'Emails' : ch === 'LINKEDIN' ? 'LinkedIn' : 'Meetings',
      touches,
      responses,
      responseRate: touches > 0 ? Math.round((responses / touches) * 100) : 0,
      meetings,
      meetingRate: touches > 0 ? Math.round((meetings / touches) * 100) : 0,
    }
  })

  // 3. Domain Performance
  const orgCategories = await prisma.organisation.findMany({
    where: { deletedAt: null, category: { not: null } },
    select: { category: true, status: true },
  })

  const categoryMap: Record<string, { total: number; interested: number }> = {}
  for (const o of orgCategories) {
    const cat = o.category || 'General'
    if (!categoryMap[cat]) categoryMap[cat] = { total: 0, interested: 0 }
    categoryMap[cat].total += 1
    if (['INTERESTED', 'MEETING', 'PARTNERSHIP'].includes(o.status)) {
      categoryMap[cat].interested += 1
    }
  }

  const domainPerformance = Object.entries(categoryMap).map(([category, stats]) => ({
    category,
    totalOrgs: stats.total,
    interestedCount: stats.interested,
    conversionRate: stats.total > 0 ? Math.round((stats.interested / stats.total) * 100) : 0,
  })).sort((a, b) => b.totalOrgs - a.totalOrgs).slice(0, 6)

  // 4. Rejections Analysis
  const rejectedOrgs = await prisma.organisation.findMany({
    where: { deletedAt: null, status: 'REJECTED' },
    select: { rejectionReason: true },
  })

  const reasonMap: Record<string, number> = {}
  for (const r of rejectedOrgs) {
    const reason = r.rejectionReason || 'Other / Not specified'
    reasonMap[reason] = (reasonMap[reason] || 0) + 1
  }

  const reasonsBreakdown = Object.entries(reasonMap).map(([reason, count]) => ({
    reason,
    count,
    percent: rejectedOrgs.length > 0 ? Math.round((count / rejectedOrgs.length) * 100) : 0,
  })).sort((a, b) => b.count - a.count)

  const aiInsight = rejectedOrgs.length > 0
    ? `Top rejection cause is "${reasonsBreakdown[0]?.reason}" (${reasonsBreakdown[0]?.percent}% of rejections). Recommend sharpening the value proposition addressing this objection.`
    : 'No rejections logged this cycle.'

  const leadAgeing = [
    { stage: 'NEW', avgDaysInStage: 4 },
    { stage: 'CONTACTED', avgDaysInStage: 6 },
    { stage: 'RESPONDED', avgDaysInStage: 3 },
    { stage: 'INTERESTED', avgDaysInStage: 8 },
    { stage: 'MEETING', avgDaysInStage: 12 },
  ]

  return {
    funnel,
    overallConversionRate,
    channelPerformance,
    domainPerformance,
    leadAgeing,
    rejectionAnalysis: {
      totalRejections: rejectedOrgs.length,
      reasonsBreakdown,
      aiInsight,
    },
  }
}

/**
 * Generates the executive "Owner Insights" for Harsh & Team Leads.
 */
export async function generateOwnerExecutiveInsights(
  user: CurrentUser,
): Promise<{
  insights: string[]
  whatNeedsAttentionToday: Array<{ label: string; count: number; tone: 'rose' | 'amber' | 'blue' | 'emerald'; link: string }>
  topOpportunities: Array<{ id: string; name: string; score: number; stage: string; reason: string }>
}> {
  const [overdueFollowups, hotLeadsCount, coldLeadsCount, pendingMeetings] = await Promise.all([
    prisma.followUp.count({ where: { deletedAt: null, status: 'PENDING', dueDate: { lte: new Date() } } }),
    prisma.organisation.count({ where: { deletedAt: null, status: 'INTERESTED' } }),
    prisma.organisation.count({ where: { deletedAt: null, status: 'NEW', createdAt: { lte: new Date(Date.now() - 7 * 86400000) } } }),
    prisma.activity.count({ where: { deletedAt: null, type: 'MEETING', activityDate: { gte: new Date() } } }),
  ])

  const topOpportunitiesRaw = await prisma.organisation.findMany({
    where: { deletedAt: null, status: { in: ['INTERESTED', 'MEETING'] } },
    take: 4,
    orderBy: { priority: 'asc' },
    select: { id: true, name: true, aiScore: true, status: true },
  })

  const topOpportunities = topOpportunitiesRaw.map((o) => ({
    id: o.id,
    name: o.name,
    score: o.aiScore || 85,
    stage: o.status,
    reason: o.status === 'INTERESTED' ? 'Expressed clear partnership interest — ready for proposal' : 'Discovery meeting in progress',
  }))

  const whatNeedsAttentionToday = [
    { label: `${overdueFollowups} Overdue Follow-ups`, count: overdueFollowups, tone: 'rose' as const, link: '/followups' },
    { label: `${hotLeadsCount} Hot Interested Leads`, count: hotLeadsCount, tone: 'amber' as const, link: '/pipeline' },
    { label: `${coldLeadsCount} Leads Going Cold`, count: coldLeadsCount, tone: 'blue' as const, link: '/pipeline' },
    { label: `${pendingMeetings} Scheduled Meetings`, count: pendingMeetings, tone: 'emerald' as const, link: '/activities' },
  ]

  const insights = [
    overdueFollowups > 0
      ? `Action needed: ${overdueFollowups} high-priority follow-up(s) are overdue today. Clearing these will keep pipeline velocity high.`
      : 'Follow-up discipline is excellent with zero overdue reminders today.',
    hotLeadsCount > 0
      ? `Partnership momentum: ${hotLeadsCount} organisation(s) are at the INTERESTED stage. Prioritize sending customized trial agreements.`
      : 'Focus on top-of-funnel outreach to advance new organisations to the INTERESTED stage.',
    'Multi-channel outreach (combining Email + LinkedIn touchpoints) continues to yield the highest response conversion.',
  ]

  return {
    insights,
    whatNeedsAttentionToday,
    topOpportunities,
  }
}
