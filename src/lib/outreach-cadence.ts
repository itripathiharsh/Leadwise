import type { ActivityOutcome, ActivityType } from '@prisma/client'
import { todayKey, addDaysToKey } from '@/lib/dates'

/**
 * Standard outreach cadence offset mapping in days.
 * An offset of `null` indicates that no follow-up should be scheduled
 * (e.g. rejection, wrong number, or completed task).
 */
export const OUTCOME_FOLLOWUP_OFFSET_DAYS: Partial<Record<ActivityOutcome, number | null>> = {
  // CALL
  NO_ANSWER: 2,
  BUSY: 2,
  WRONG_NUMBER: null,
  CALL_BACK: 1,
  CONNECTED: 3,

  // EMAIL
  SENT: 3,
  BOUNCED: null,
  NO_RESPONSE: 4,
  REPLIED: 1,

  // LINKEDIN
  PROFILE_FOUND: 2,
  CONNECTION_SENT: 4,
  CONNECTION_ACCEPTED: 1,
  MESSAGE_SENT: 3,

  // MEETING
  MEETING_SCHEDULED: 1,
  MEETING_COMPLETED: 2,
  RESCHEDULED: 1,
  NO_SHOW: 2,

  // Shared sentiment outcomes
  INTERESTED: 1,
  NOT_INTERESTED: null,

  // FOLLOW_UP / NOTE
  LOGGED: null,
  COMPLETED: null,
  OTHER: 3,
} as const

/**
 * Returns a suggested follow-up date in YYYY-MM-DD format based on the interaction outcome.
 * Returns an empty string if no follow-up is recommended (offset is null or unspecified).
 */
export function suggestFollowupDate(outcome: string): string {
  const offset = OUTCOME_FOLLOWUP_OFFSET_DAYS[outcome as ActivityOutcome]
  if (offset === null || offset === undefined) {
    return ''
  }
  return addDaysToKey(todayKey(), offset)
}

/**
 * Rapid one-tap note chips by activity channel to eliminate manual typing for common scenarios.
 */
export const QUICK_NOTE_CHIPS: Record<ActivityType, string[]> = {
  CALL: [
    'Rang out — will retry later',
    'Busy — call back scheduled',
    'Gatekeeper connected — requested callback',
    'Decision maker pitched — positive response',
    'Requested proposal deck via email',
  ],
  EMAIL: [
    'Sent introductory partnership deck',
    'Sent follow-up check-in email',
    'Shared pricing & collaboration proposal',
    'Awaiting internal review & feedback',
  ],
  LINKEDIN: [
    'Identified decision maker profile',
    'Sent personalized connection request',
    'Sent InMail regarding partnership',
    'Followed up on accepted connection',
  ],
  MEETING: [
    'Conducted 15-min partnership discovery call',
    'Product walkthrough & demo presented',
    'Shared next steps & commercial terms',
    'Contact no-show — rescheduling',
  ],
  FOLLOW_UP: [
    'Follow-up touchpoint completed',
    'Checked in on review progress',
    'Sent reminder about upcoming deadline',
  ],
  NOTE: [
    'General update on organization profile',
    'Noted internal stakeholder hierarchy',
    'Updated direct contact coordinates',
  ],
}
