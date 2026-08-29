import { prisma } from '@/lib/db'
import type { CurrentUser } from '@/lib/auth/current-user'
import { organisationScope } from '@/lib/rbac'
import { generateAiCompletion } from './provider'
import { RESPONSE_OUTCOMES, INTERESTED_OUTCOMES } from '@/lib/constants'
import type { Priority } from '@prisma/client'
import { NotFoundError } from '@/server/errors'

export interface ScoreFactor {
  label: string
  points: number
  description: string
}

export interface OrganisationIntelligence {
  orgId: string
  name: string
  score: number // 0-100
  factors: ScoreFactor[]
  aiPriority: Priority
  partnershipLikelihood: number // 0-100 estimate
  summary: string
  recommendedNextAction: string
  recommendedContact: {
    id: string
    name: string
    designation: string | null
    isDecisionMaker: boolean
    score: number
    reason: string
  } | null
}

export interface ContactIntelligence {
  contactId: string
  name: string
  score: number // 0-100
  factors: ScoreFactor[]
  decisionMakerConfidence: number // 0-100%
  summary: string
}

export interface TodayPriorityItem {
  rank: number
  orgId: string
  orgName: string
  priority: Priority
  score: number
  health: string
  primaryContactName: string | null
  recommendedAction: string
  reason: string
}

/**
 * Classifies Decision-Maker confidence deterministically from designation.
 */
export function detectDecisionMakerConfidence(designation: string | null): number {
  if (!designation) return 30
  const d = designation.toLowerCase()

  if (/\b(ceo|chief executive|founder|co-founder|managing director|president|owner|proprietor)\b/.test(d)) {
    return 95
  }
  if (/\b(director|vice president|vp|partner|general manager|coo|cmo|cfo)\b/.test(d)) {
    return 85
  }
  if (/\b(head of partnerships|head of clinical|head of hr|programme head|clinical director|medical director)\b/.test(d)) {
    return 80
  }
  if (/\b(head|lead|manager|administrator|coordinator)\b/.test(d)) {
    return 65
  }
  if (/\b(associate|officer|assistant|intern|consultant|specialist)\b/.test(d)) {
    return 40
  }
  return 50
}

/**
 * Calculates explainable 0–100 Partnership Score for an organisation.
 */
export async function scoreOrganisation(orgId: string): Promise<OrganisationIntelligence> {
  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    include: {
      contacts: { where: { deletedAt: null }, orderBy: [{ isDecisionMaker: 'desc' }, { createdAt: 'asc' }] },
      activities: { where: { deletedAt: null }, orderBy: { activityDate: 'desc' }, take: 10 },
      followUps: { where: { deletedAt: null, status: 'PENDING' } },
    },
  })

  if (!org) throw new NotFoundError('Organisation')

  const factors: ScoreFactor[] = []
  let score = 20 // Base initial qualification

  factors.push({ label: 'Base Qualification', points: 20, description: 'Verified organization record in outreach database' })

  // 1. Decision Maker identified (+20)
  const hasDm = org.contacts.some((c) => c.isDecisionMaker || detectDecisionMakerConfidence(c.designation) >= 80)
  if (hasDm) {
    score += 20
    factors.push({ label: 'Decision Maker Identified', points: 20, description: 'Key decision-maker (CEO/Director/Head) attached to lead' })
  }

  // 2. Positive Engagement / Response (+25)
  const hasPositiveResponse = org.activities.some((a) => INTERESTED_OUTCOMES.includes(a.outcome))
  const hasGeneralResponse = org.activities.some((a) => RESPONSE_OUTCOMES.includes(a.outcome))

  if (hasPositiveResponse) {
    score += 25
    factors.push({ label: 'Expressed Partnership Interest', points: 25, description: 'Explicit positive interest registered during interaction' })
  } else if (hasGeneralResponse) {
    score += 15
    factors.push({ label: 'Active Engagement', points: 15, description: 'Organization has replied to emails or answered outreach calls' })
  }

  // 3. Stage Progression (+15)
  if (org.status === 'MEETING' || org.status === 'PARTNERSHIP') {
    score += 15
    factors.push({ label: 'High Stage Pipeline Maturity', points: 15, description: `Advanced to ${org.status} stage` })
  } else if (org.status === 'INTERESTED' || org.status === 'RESPONDED') {
    score += 10
    factors.push({ label: 'Warm Stage Progression', points: 10, description: `Progressed to ${org.status} stage` })
  }

  // 4. Multiple Relevant Contacts (+10)
  if (org.contacts.length >= 2) {
    score += 10
    factors.push({ label: 'Multi-Contact Coverage', points: 10, description: `${org.contacts.length} stakeholder profiles mapped` })
  }

  // 5. Active Upcoming Follow-up (+10)
  if (org.followUps.length > 0) {
    score += 10
    factors.push({ label: 'Structured Follow-up Active', points: 10, description: 'Scheduled task/reminder prevents lead slippage' })
  }

  const finalScore = Math.min(100, Math.max(15, score))

  // AI Priority derivation
  const aiPriority: Priority = finalScore >= 75 ? 'HIGH' : finalScore >= 45 ? 'MEDIUM' : 'LOW'
  const partnershipLikelihood = Math.min(95, Math.max(10, Math.round(finalScore * 0.85)))

  // Generate or fallback summary
  let summary = `${org.name} has ${org.contacts.length} contact(s) mapped and ${org.activities.length} logged interaction(s).`
  if (hasPositiveResponse) {
    summary += ' They have registered clear interest in partnership collaboration.'
  } else if (hasGeneralResponse) {
    summary += ' They have engaged with outreach efforts.'
  } else {
    summary += ' Outreach is in early stages.'
  }

  // Pick recommended contact
  let recommendedContact: OrganisationIntelligence['recommendedContact'] = null
  if (org.contacts.length > 0) {
    const topContact = org.contacts[0]
    const dmConf = detectDecisionMakerConfidence(topContact.designation)
    recommendedContact = {
      id: topContact.id,
      name: topContact.name,
      designation: topContact.designation,
      isDecisionMaker: topContact.isDecisionMaker || dmConf >= 80,
      score: dmConf,
      reason: topContact.isDecisionMaker ? 'Designated primary decision maker' : `Designation match (${topContact.designation || 'Stakeholder'})`,
    }
  }

  const recommendedNextAction = hasPositiveResponse
    ? 'Send formal partnership agreement / schedule proposal review'
    : org.activities.length === 0
      ? 'Initiate introductory discovery call with primary stakeholder'
      : 'Conduct scheduled follow-up on previous outreach touchpoint'

  // Persist computed intelligence to DB
  await prisma.organisation.update({
    where: { id: org.id },
    data: {
      aiScore: finalScore,
      aiScoreFactors: factors as any,
      aiPriority,
      aiSummary: summary,
      aiPartnershipLikelihood: partnershipLikelihood,
      aiLastAnalyzedAt: new Date(),
    },
  }).catch(() => {})

  return {
    orgId: org.id,
    name: org.name,
    score: finalScore,
    factors,
    aiPriority,
    partnershipLikelihood,
    summary,
    recommendedNextAction,
    recommendedContact,
  }
}

/**
 * Generates the "Who Should I Contact Today?" top priority ranking.
 */
export async function recommendTodayPriorities(
  user: Pick<CurrentUser, 'id' | 'role'>,
): Promise<TodayPriorityItem[]> {
  const orgs = await prisma.organisation.findMany({
    where: {
      deletedAt: null,
      AND: [
        organisationScope(user),
        { status: { notIn: ['REJECTED', 'PARTNERSHIP'] } },
      ],
    },
    include: {
      contacts: { where: { deletedAt: null }, take: 1, orderBy: [{ isDecisionMaker: 'desc' }] },
      followUps: { where: { deletedAt: null, status: 'PENDING' }, take: 1 },
    },
    orderBy: [
      { priority: 'asc' },
      { lastContactedAt: { sort: 'desc', nulls: 'last' } },
    ],
    take: 10,
  })

  const items: TodayPriorityItem[] = []

  let rank = 1
  for (const org of orgs) {
    const isOverdue = org.followUps.some((f) => f.dueDate.getTime() <= Date.now())
    const score = org.aiScore ?? (org.priority === 'HIGH' ? 85 : org.priority === 'MEDIUM' ? 65 : 40)
    const primaryContact = org.contacts[0]?.name || null

    let reason = 'High priority target with active partnership potential'
    if (isOverdue) {
      reason = 'Scheduled follow-up is due today — prevent lead cooling'
    } else if (org.status === 'INTERESTED') {
      reason = 'Expressed interest; ready for proposal or discovery meeting'
    } else if (org.status === 'MEETING') {
      reason = 'Meeting completed; follow up on commercial proposal'
    }

    items.push({
      rank: rank++,
      orgId: org.id,
      orgName: org.name,
      priority: org.priority,
      score,
      health: isOverdue ? 'ATTENTION' : 'ACTIVE',
      primaryContactName: primaryContact,
      recommendedAction: org.nextAction || 'Place outreach check-in call',
      reason,
    })

    if (items.length >= 5) break
  }

  return items
}
