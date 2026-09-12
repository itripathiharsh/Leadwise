import type {
  ActivityOutcome,
  ActivityType,
  BackupStatus,
  ContactStatus,
  NotificationPriority,
  NotificationType,
  OrgStatus,
  Priority,
} from '@prisma/client'

/**
 * Single source of truth for how every enum is labelled, coloured and ordered
 * in the UI — and, crucially, which outcomes are valid for which channel and
 * how an outcome moves an organisation along the pipeline.
 *
 * Icons are stored as lucide names (strings) rather than components so this
 * module stays importable from server code without pulling React into the
 * server bundle. `<EnumIcon />` resolves them.
 */

export type Tone =
  | 'slate'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'cyan'
  | 'sky'
  | 'teal'
  | 'emerald'
  | 'amber'
  | 'orange'
  | 'rose'

// ── Organisation status ──────────────────────────────────────────────────────

interface OrgStatusMeta {
  label: string
  tone: Tone
  /** Pipeline position. Auto-progression never moves an org backwards. */
  rank: number
  description: string
}

export const ORG_STATUS_META: Record<OrgStatus, OrgStatusMeta> = {
  NEW: { label: 'Assigned', tone: 'blue', rank: 1, description: 'Allocated to rep, outreach pending.' },
  ASSIGNED: { label: 'Assigned', tone: 'blue', rank: 1, description: 'Allocated to rep, outreach pending.' },
  CONTACTED: { label: 'Contacted', tone: 'indigo', rank: 2, description: 'Initial outreach call, email, or message initiated.' },
  RESPONDED: { label: 'Responded', tone: 'cyan', rank: 3, description: 'Target responded or engaged with outreach.' },
  INTERESTED: { label: 'Warm / Interested', tone: 'amber', rank: 4, description: 'Qualified interest expressed in partnership.' },
  MEETING: { label: 'Meeting Scheduled', tone: 'violet', rank: 5, description: 'Discovery call or clinical demo scheduled.' },
  PARTNERSHIP: { label: 'Partnership Signed', tone: 'emerald', rank: 6, description: 'Formal partnership agreement executed and active.' },
  REJECTED: { label: 'Disqualified / Cold', tone: 'rose', rank: -1, description: 'Disqualified, unresponsive, or gone cold.' },
}

/** Display order for filters and funnel charts. */
export const ORG_STATUS_ORDER: OrgStatus[] = [
  'ASSIGNED',
  'CONTACTED',
  'RESPONDED',
  'INTERESTED',
  'MEETING',
  'PARTNERSHIP',
  'REJECTED',
]

/** Statuses that count as a "hot" lead on dashboards. */
export const HOT_STATUSES: OrgStatus[] = ['MEETING', 'INTERESTED', 'PARTNERSHIP']

// ── Priority ────────────────────────────────────────────────────────────────

export const PRIORITY_META: Record<Priority, { label: string; tone: Tone; rank: number }> = {
  HIGH: { label: 'High', tone: 'rose', rank: 0 },
  MEDIUM: { label: 'Medium', tone: 'amber', rank: 1 },
  LOW: { label: 'Low', tone: 'slate', rank: 2 },
}

export const PRIORITY_ORDER: Priority[] = ['HIGH', 'MEDIUM', 'LOW']

// ── Contact status ──────────────────────────────────────────────────────────

export const CONTACT_STATUS_META: Record<ContactStatus, { label: string; tone: Tone }> = {
  NEW: { label: 'New', tone: 'slate' },
  CONTACTED: { label: 'Contacted', tone: 'indigo' },
  RESPONDED: { label: 'Responded', tone: 'cyan' },
  INTERESTED: { label: 'Interested', tone: 'amber' },
  NOT_INTERESTED: { label: 'Not interested', tone: 'rose' },
  UNREACHABLE: { label: 'Unreachable', tone: 'orange' },
}

export const CONTACT_STATUS_ORDER: ContactStatus[] = [
  'NEW',
  'CONTACTED',
  'RESPONDED',
  'INTERESTED',
  'NOT_INTERESTED',
  'UNREACHABLE',
]

// ── Activity types ──────────────────────────────────────────────────────────

interface ActivityTypeMeta {
  label: string
  /** lucide-react icon name */
  icon: string
  tone: Tone
  /** Used in timeline sentences: "Harsh called Athena Behavioural" */
  verb: string
}

export const ACTIVITY_TYPE_META: Record<ActivityType, ActivityTypeMeta> = {
  CALL: { label: 'Call', icon: 'Phone', tone: 'blue', verb: 'called' },
  EMAIL: { label: 'Email', icon: 'Mail', tone: 'violet', verb: 'emailed' },
  LINKEDIN: { label: 'LinkedIn', icon: 'Linkedin', tone: 'sky', verb: 'reached out on LinkedIn to' },
  MEETING: { label: 'Meeting', icon: 'Users', tone: 'emerald', verb: 'met' },
  FOLLOW_UP: { label: 'Follow-up', icon: 'CalendarClock', tone: 'amber', verb: 'followed up with' },
  NOTE: { label: 'Note', icon: 'StickyNote', tone: 'slate', verb: 'added a note on' },
}

export const ACTIVITY_TYPE_ORDER: ActivityType[] = [
  'CALL',
  'EMAIL',
  'LINKEDIN',
  'MEETING',
  'FOLLOW_UP',
  'NOTE',
]

// ── Outcomes ────────────────────────────────────────────────────────────────

export const OUTCOME_META: Record<ActivityOutcome, { label: string; tone: Tone }> = {
  // Call
  NO_ANSWER: { label: 'No answer', tone: 'slate' },
  BUSY: { label: 'Busy', tone: 'slate' },
  CONNECTED: { label: 'Connected', tone: 'indigo' },
  CALL_BACK: { label: 'Call back later', tone: 'amber' },
  WRONG_NUMBER: { label: 'Wrong number', tone: 'orange' },
  // Email
  SENT: { label: 'Sent', tone: 'indigo' },
  REPLIED: { label: 'Replied', tone: 'cyan' },
  BOUNCED: { label: 'Bounced', tone: 'orange' },
  NO_RESPONSE: { label: 'No response', tone: 'slate' },
  // LinkedIn
  PROFILE_FOUND: { label: 'Profile found', tone: 'slate' },
  CONNECTION_SENT: { label: 'Connection sent', tone: 'indigo' },
  CONNECTION_ACCEPTED: { label: 'Connection accepted', tone: 'cyan' },
  MESSAGE_SENT: { label: 'Message sent', tone: 'indigo' },
  // Meeting
  MEETING_SCHEDULED: { label: 'Meeting scheduled', tone: 'violet' },
  MEETING_COMPLETED: { label: 'Meeting completed', tone: 'emerald' },
  NO_SHOW: { label: 'No show', tone: 'orange' },
  RESCHEDULED: { label: 'Rescheduled', tone: 'amber' },
  // Shared sentiment
  INTERESTED: { label: 'Interested', tone: 'amber' },
  NOT_INTERESTED: { label: 'Not interested', tone: 'rose' },
  // Follow-up / note
  COMPLETED: { label: 'Completed', tone: 'emerald' },
  LOGGED: { label: 'Logged', tone: 'slate' },
  OTHER: { label: 'Other', tone: 'slate' },
}

/**
 * Which outcomes each channel offers. Enforced server-side in the Zod layer so
 * a hand-crafted request can't attach "BOUNCED" to a phone call.
 */
export const OUTCOMES_BY_TYPE: Record<ActivityType, ActivityOutcome[]> = {
  CALL: [
    'CONNECTED',
    'INTERESTED',
    'NOT_INTERESTED',
    'CALL_BACK',
    'NO_ANSWER',
    'BUSY',
    'WRONG_NUMBER',
    'OTHER',
  ],
  EMAIL: ['SENT', 'REPLIED', 'INTERESTED', 'NOT_INTERESTED', 'NO_RESPONSE', 'BOUNCED', 'OTHER'],
  LINKEDIN: [
    'PROFILE_FOUND',
    'CONNECTION_SENT',
    'CONNECTION_ACCEPTED',
    'MESSAGE_SENT',
    'REPLIED',
    'INTERESTED',
    'NOT_INTERESTED',
    'OTHER',
  ],
  MEETING: [
    'MEETING_SCHEDULED',
    'MEETING_COMPLETED',
    'INTERESTED',
    'NOT_INTERESTED',
    'RESCHEDULED',
    'NO_SHOW',
    'OTHER',
  ],
  FOLLOW_UP: ['COMPLETED', 'CONNECTED', 'REPLIED', 'INTERESTED', 'NOT_INTERESTED', 'NO_RESPONSE', 'OTHER'],
  NOTE: ['LOGGED', 'OTHER'],
}

export function isOutcomeValidForType(type: ActivityType, outcome: ActivityOutcome): boolean {
  return OUTCOMES_BY_TYPE[type].includes(outcome)
}

/** Outcomes that mean "the organisation engaged back". Drives the Responses metric. */
export const RESPONSE_OUTCOMES: ActivityOutcome[] = [
  'CONNECTED',
  'REPLIED',
  'CONNECTION_ACCEPTED',
  'INTERESTED',
  'NOT_INTERESTED',
  'MEETING_SCHEDULED',
  'MEETING_COMPLETED',
]

/** Outcomes that mean "actively interested". Drives the Interested metric. */
export const INTERESTED_OUTCOMES: ActivityOutcome[] = ['INTERESTED']

// ── Outcome → organisation status progression ───────────────────────────────

/**
 * The status an outcome implies, or null when it implies nothing.
 * `resolveOrgStatus` decides whether to actually apply it.
 */
export function suggestedStatusFor(
  type: ActivityType,
  outcome: ActivityOutcome,
): OrgStatus | null {
  // An explicit rejection always wins, from any channel.
  if (outcome === 'NOT_INTERESTED') return 'REJECTED'
  if (outcome === 'INTERESTED') return 'INTERESTED'

  // Any meeting activity puts the organisation at the meeting stage (spec §13).
  if (type === 'MEETING') {
    if (outcome === 'NO_SHOW') return 'CONTACTED'
    return 'MEETING'
  }

  switch (outcome) {
    case 'REPLIED':
    case 'CONNECTION_ACCEPTED':
      return 'RESPONDED'
    case 'CONNECTED':
    case 'SENT':
    case 'MESSAGE_SENT':
    case 'CONNECTION_SENT':
    case 'CALL_BACK':
    case 'NO_ANSWER':
    case 'BUSY':
    case 'NO_RESPONSE':
    case 'COMPLETED':
      return 'CONTACTED'
    // Neutral: finding a profile, a bad number, or a bare note says nothing
    // about how far along the relationship is.
    case 'PROFILE_FOUND':
    case 'WRONG_NUMBER':
    case 'BOUNCED':
    case 'LOGGED':
    case 'OTHER':
    case 'RESCHEDULED':
      return null
    default:
      return null
  }
}

/**
 * Apply the suggestion without ever regressing the pipeline.
 *
 * Returns the status to persist, or null to leave it untouched. A rejected
 * organisation is only revived by an explicit human status change, and a
 * later positive signal (they replied after all) does re-open it.
 */
export function resolveOrgStatus(
  current: OrgStatus,
  suggested: OrgStatus | null,
): OrgStatus | null {
  if (!suggested || suggested === current) return null

  if (suggested === 'REJECTED') return 'REJECTED'

  // Re-engagement: a genuine positive signal pulls an org out of REJECTED.
  if (current === 'REJECTED') {
    return ORG_STATUS_META[suggested].rank >= ORG_STATUS_META.MEETING.rank ? suggested : null
  }

  // Never move backwards (a routine follow-up call must not undo "Interested").
  return ORG_STATUS_META[suggested].rank > ORG_STATUS_META[current].rank ? suggested : null
}

/** The contact-level equivalent, kept deliberately simple. */
export function suggestedContactStatusFor(outcome: ActivityOutcome): ContactStatus | null {
  switch (outcome) {
    case 'INTERESTED':
      return 'INTERESTED'
    case 'NOT_INTERESTED':
      return 'NOT_INTERESTED'
    case 'REPLIED':
    case 'CONNECTION_ACCEPTED':
      return 'RESPONDED'
    case 'WRONG_NUMBER':
    case 'BOUNCED':
      return 'UNREACHABLE'
    case 'CONNECTED':
    case 'SENT':
    case 'MESSAGE_SENT':
    case 'CONNECTION_SENT':
      return 'CONTACTED'
    default:
      return null
  }
}

const CONTACT_STATUS_RANK: Record<ContactStatus, number> = {
  NEW: 0,
  UNREACHABLE: 1,
  CONTACTED: 2,
  RESPONDED: 3,
  INTERESTED: 4,
  NOT_INTERESTED: -1,
}

export function resolveContactStatus(
  current: ContactStatus,
  suggested: ContactStatus | null,
): ContactStatus | null {
  if (!suggested || suggested === current) return null
  if (suggested === 'NOT_INTERESTED') return 'NOT_INTERESTED'
  if (current === 'NOT_INTERESTED') return suggested === 'INTERESTED' ? suggested : null
  return CONTACT_STATUS_RANK[suggested] > CONTACT_STATUS_RANK[current] ? suggested : null
}

// ── Email templates (referenced when logging an email) ──────────────────────

export const EMAIL_TEMPLATES = [
  'Partnership Introduction',
  'Partnership Proposal',
  'Follow-up Reminder',
  'Meeting Request',
  'Re-engagement',
  'Thank You / Recap',
  'Custom',
] as const

export type EmailTemplate = (typeof EMAIL_TEMPLATES)[number]

// ── Common organisation categories (free text, these are just suggestions) ──

export const ORG_CATEGORY_SUGGESTIONS = [
  'Behavioural Health',
  'Mental Health Clinic',
  'Hospital',
  'School',
  'University',
  'Corporate / HR',
  'NGO',
  'Wellness Studio',
  'Therapy Practice',
  'Insurance',
  'Other',
] as const

// ── Follow-up buckets ───────────────────────────────────────────────────────

export const FOLLOWUP_BUCKET_META = {
  OVERDUE: { label: 'Overdue', tone: 'rose' as Tone, icon: 'AlertTriangle' },
  TODAY: { label: 'Due today', tone: 'amber' as Tone, icon: 'CalendarClock' },
  TOMORROW: { label: 'Tomorrow', tone: 'blue' as Tone, icon: 'CalendarPlus' },
  UPCOMING: { label: 'Upcoming', tone: 'slate' as Tone, icon: 'Calendar' },
} as const

// ── Backups ──────────────────────────────────────────────────────────────────

export const BACKUP_STATUS_META: Record<BackupStatus, { label: string; tone: Tone; icon: string }> = {
  IN_PROGRESS: { label: 'In progress', tone: 'blue', icon: 'Loader2' },
  SUCCESS: { label: 'Successful', tone: 'emerald', icon: 'CheckCircle2' },
  PARTIAL_SUCCESS: { label: 'Drive upload pending', tone: 'amber', icon: 'AlertTriangle' },
  FAILED: { label: 'Failed', tone: 'rose', icon: 'XCircle' },
}

// ── Notifications ────────────────────────────────────────────────────────────

export const NOTIFICATION_PRIORITY_META: Record<NotificationPriority, { label: string; tone: Tone }> = {
  INFO: { label: 'Info', tone: 'blue' },
  WARNING: { label: 'Warning', tone: 'amber' },
  URGENT: { label: 'Urgent', tone: 'rose' },
}

export const NOTIFICATION_TYPE_META: Record<
  NotificationType,
  { label: string; icon: string; defaultPriority: NotificationPriority }
> = {
  FOLLOW_UP_DUE: { label: 'Follow-up Due', icon: 'Clock', defaultPriority: 'WARNING' },
  FOLLOW_UP_OVERDUE: { label: 'Follow-up Overdue', icon: 'AlertCircle', defaultPriority: 'URGENT' },
  MEETING_REMINDER: { label: 'Meeting Tomorrow', icon: 'Calendar', defaultPriority: 'INFO' },
  ASSIGNMENT: { label: 'New Assignment', icon: 'UserCheck', defaultPriority: 'INFO' },
  BACKUP_COMPLETED: { label: 'Backup Completed', icon: 'Database', defaultPriority: 'INFO' },
  BACKUP_FAILED: { label: 'Backup Failed', icon: 'AlertTriangle', defaultPriority: 'URGENT' },
  SYSTEM: { label: 'System Notice', icon: 'Info', defaultPriority: 'INFO' },
}

