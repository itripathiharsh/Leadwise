import { prisma } from '@/lib/db'
import { generateAiCompletion } from './provider'
import { NotFoundError } from '@/server/errors'

export interface CallPrepData {
  organisationName: string
  contactName: string
  contactDesignation: string | null
  currentStage: string
  lastActivitySummary: string
  recommendedObjective: string
  talkingPoints: string[]
  suggestedOpening: string
  objections: Array<{ objection: string; response: string }>
}

export interface NoteSummaryResult {
  bulletSummary: string
  detectedOutcome: string
  suggestedNextAction: string
  suggestedFollowUpDays: number
}

/**
 * Generates an intelligent, context-aware Call Preparation brief before placing a call.
 */
export async function generateCallPrep(
  orgId: string,
  contactId?: string,
): Promise<CallPrepData> {
  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    include: {
      contacts: { where: { deletedAt: null }, orderBy: [{ isDecisionMaker: 'desc' }] },
      activities: { where: { deletedAt: null }, orderBy: { activityDate: 'desc' }, take: 5 },
    },
  })

  if (!org) throw new NotFoundError('Organisation')

  const contact = contactId
    ? org.contacts.find((c) => c.id === contactId) || org.contacts[0]
    : org.contacts[0]

  const contactName = contact?.name || 'Partnership Lead'
  const contactDesignation = contact?.designation || 'Decision Maker'
  const currentStage = org.status
  const lastActivity = org.activities[0]

  const lastActivitySummary = lastActivity
    ? `${lastActivity.type} on ${lastActivity.activityDate.toISOString().slice(0, 10)}: ${lastActivity.notes || lastActivity.outcome}`
    : 'No previous interactions logged'

  // Attempt Groq LLM generation if available
  const systemPrompt = `You are an expert partnership strategist for Leadwise. Generate a concise JSON call brief for a sales rep.`
  const userPrompt = `Organisation: ${org.name} (${org.category || 'Healthcare'})
Contact: ${contactName} (${contactDesignation})
Pipeline Stage: ${currentStage}
Last Outreach: ${lastActivitySummary}

Generate JSON with fields:
- objective: string
- talkingPoints: array of 3 strings
- opening: string
- objections: array of 2 objects {objection: string, response: string}`

  const aiRaw = await generateAiCompletion(systemPrompt, userPrompt, { responseFormat: 'json', temperature: 0.2 })

  if (aiRaw) {
    try {
      const parsed = JSON.parse(aiRaw)
      return {
        organisationName: org.name,
        contactName,
        contactDesignation,
        currentStage,
        lastActivitySummary,
        recommendedObjective: parsed.objective || 'Secure a 20-minute partnership discovery demonstration',
        talkingPoints: parsed.talkingPoints || [
          `Highlight Leadwise collaboration outcomes in ${org.category || 'target industry'}`,
          'Demonstrate seamless integration with existing workflow',
          'Offer a 30-day pilot partnership agreement',
        ],
        suggestedOpening: parsed.opening || `Hi ${contactName}, this is calling from Leadwise. Following up on our previous note regarding collaboration with ${org.name}.`,
        objections: parsed.objections || [
          { objection: 'We already have internal tools', response: 'Our solution complements existing EHRs without clinical disruption.' },
          { objection: 'Budget is tight this quarter', response: 'We offer zero-upfront pilot agreements with outcome-based pricing.' },
        ],
      }
    } catch {
      // fallback to deterministic brief
    }
  }

  // Deterministic Fallback
  return {
    organisationName: org.name,
    contactName,
    contactDesignation,
    currentStage,
    lastActivitySummary,
    recommendedObjective: currentStage === 'INTERESTED'
      ? 'Review formal partnership proposal & schedule technical demo'
      : 'Qualify clinical partnership fit & book a 15-min discovery call',
    talkingPoints: [
      `Leadwise partnership initiatives tailored for ${org.category || 'clinical providers'}`,
      'Proven engagement and outreach metrics',
      'Flexible pilot partnership trial model',
    ],
    suggestedOpening: `Hi ${contactName}, I hope you're having a productive week. Reaching out from Leadwise regarding our partnership discussion with ${org.name}.`,
    objections: [
      { objection: 'Not looking for new solutions right now', response: 'Understood. We are sharing initial benchmark studies with peer institutions for future reference.' },
      { objection: 'Send an email first', response: 'I will send our 2-page executive brief today — what is the best email to reach you directly?' },
    ],
  }
}

/**
 * Summarizes raw call notes into key takeaways, detected outcome, next action, and follow-up days.
 */
export async function summarizeCallNotes(rawNotes: string): Promise<NoteSummaryResult> {
  if (!rawNotes.trim()) {
    return {
      bulletSummary: 'No notes provided.',
      detectedOutcome: 'CONNECTED',
      suggestedNextAction: 'Follow up with contact',
      suggestedFollowUpDays: 3,
    }
  }

  const systemPrompt = `You are a CRM note summarizer for sales outreach. Given raw messy rep notes, return structured JSON.`
  const userPrompt = `Raw Notes: "${rawNotes}"

Return JSON:
- bulletSummary: string (clean 2-3 bullet points)
- detectedOutcome: "INTERESTED" | "CONNECTED" | "NOT_INTERESTED" | "CALL_BACK" | "NO_ANSWER"
- suggestedNextAction: string
- suggestedFollowUpDays: number`

  const aiRaw = await generateAiCompletion(systemPrompt, userPrompt, { responseFormat: 'json', temperature: 0.1 })
  if (aiRaw) {
    try {
      const parsed = JSON.parse(aiRaw)
      return {
        bulletSummary: parsed.bulletSummary || rawNotes,
        detectedOutcome: parsed.detectedOutcome || 'CONNECTED',
        suggestedNextAction: parsed.suggestedNextAction || 'Send follow-up details',
        suggestedFollowUpDays: parsed.suggestedFollowUpDays || 3,
      }
    } catch {
      // fallback
    }
  }

  // Deterministic keyword heuristics
  const lower = rawNotes.toLowerCase()
  let outcome = 'CONNECTED'
  let nextAction = 'Follow up with contact'
  let days = 3

  if (lower.includes('interested') || lower.includes('keen') || lower.includes('send proposal') || lower.includes('deck')) {
    outcome = 'INTERESTED'
    nextAction = 'Send proposal & trial agreement'
    days = 2
  } else if (lower.includes('call back') || lower.includes('busy') || lower.includes('next week')) {
    outcome = 'CALL_BACK'
    nextAction = 'Place follow-up call'
    days = 5
  } else if (lower.includes('not interested') || lower.includes('no requirement') || lower.includes('declined')) {
    outcome = 'NOT_INTERESTED'
    nextAction = 'Archive or revisit in 6 months'
    days = 90
  }

  return {
    bulletSummary: `• ${rawNotes.trim()}`,
    detectedOutcome: outcome,
    suggestedNextAction: nextAction,
    suggestedFollowUpDays: days,
  }
}
