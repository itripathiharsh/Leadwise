import { z } from 'zod'
import {
  ActivityOutcome,
  ActivityType,
  ContactStatus,
  FollowUpStatus,
  OrgStatus,
  Priority,
  Role,
} from '@prisma/client'
import { isOutcomeValidForType, OUTCOMES_BY_TYPE } from '@/lib/constants'

/**
 * Server-side validation contracts.
 *
 * These schemas are the *authority* on what a valid write looks like. Client
 * forms validate against the same shapes for instant feedback, but every server
 * action re-parses its input here — client validation is a convenience, never a
 * trust boundary.
 */

// ── Primitives ───────────────────────────────────────────────────────────────

const trimmed = z.string().transform((v) => v.trim())

/** Optional free text: '' and whitespace collapse to undefined. */
const optionalText = (max = 500) =>
  z
    .string()
    .max(max, `Must be under ${max} characters`)
    .transform((v) => {
      const t = v.trim()
      return t === '' ? undefined : t
    })
    .optional()

const optionalLongText = (max = 5000) =>
  z
    .string()
    .max(max, `Must be under ${max} characters`)
    .transform((v) => {
      const t = v.trim()
      return t === '' ? undefined : t
    })
    .optional()

/** Email that tolerates an empty field but rejects malformed input. */
const optionalEmail = z
  .string()
  .max(200)
  .transform((v) => v.trim())
  .refine((v) => v === '' || z.string().email().safeParse(v).success, {
    message: 'Enter a valid email address',
  })
  .transform((v) => (v === '' ? undefined : v.toLowerCase()))
  .optional()

/**
 * Phone validation is deliberately permissive: the team pastes numbers from
 * websites in every conceivable format. We require 7–15 digits and allow the
 * usual separators, rather than enforcing a locale-specific pattern.
 */
const optionalPhone = z
  .string()
  .max(40)
  .transform((v) => v.trim())
  .refine(
    (v) => {
      if (v === '') return true
      if (!/^[+\d][\d\s\-().]*$/.test(v)) return false
      const digits = v.replace(/\D/g, '')
      return digits.length >= 7 && digits.length <= 15
    },
    { message: 'Enter a valid phone number (7–15 digits)' },
  )
  .transform((v) => (v === '' ? undefined : v))
  .optional()

const optionalUrl = z
  .string()
  .max(500)
  .transform((v) => v.trim())
  .refine(
    (v) => {
      if (v === '') return true
      const candidate = /^https?:\/\//i.test(v) ? v : `https://${v}`
      try {
        const url = new URL(candidate)
        return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.includes('.')
      } catch {
        return false
      }
    },
    { message: 'Enter a valid URL' },
  )
  .transform((v) => (v === '' ? undefined : v))
  .optional()

/** "YYYY-MM-DD" from <input type="date">. */
export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date')
  .refine((v) => {
    const [y, m, d] = v.split('-').map(Number) as [number, number, number]
    if (m < 1 || m > 12 || d < 1 || d > 31) return false
    const probe = new Date(Date.UTC(y, m - 1, d))
    return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d
  }, 'Enter a valid date')

const optionalDateKey = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v === '' || dateKeySchema.safeParse(v).success, 'Enter a valid date')
  .transform((v) => (v === '' ? undefined : v))
  .optional()

/** "YYYY-MM-DDTHH:mm" from <input type="datetime-local">, or a date-only value. */
const optionalDateTimeLocal = z
  .string()
  .transform((v) => v.trim())
  .refine(
    (v) => v === '' || /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/.test(v),
    'Enter a valid date and time',
  )
  .transform((v) => (v === '' ? undefined : v))
  .optional()

const cuid = z.string().min(1, 'Required').max(64)
const optionalCuid = z
  .string()
  .max(64)
  .transform((v) => v.trim())
  .transform((v) => (v === '' || v === 'NONE' ? undefined : v))
  .optional()

// ── Auth ─────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: trimmed.pipe(z.string().email('Enter a valid email address')).transform((v) => v.toLowerCase()),
  password: z.string().min(1, 'Enter your password').max(200),
})
export type LoginInput = z.infer<typeof loginSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters').max(100),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

// ── Users / team ─────────────────────────────────────────────────────────────

export const userCreateSchema = z.object({
  name: trimmed.pipe(z.string().min(2, 'Name is required').max(120)),
  email: trimmed.pipe(z.string().email('Enter a valid email address')).transform((v) => v.toLowerCase()),
  role: z.nativeEnum(Role),
  phone: optionalPhone,
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
})
export type UserCreateInput = z.infer<typeof userCreateSchema>

export const userUpdateSchema = z.object({
  id: cuid,
  name: trimmed.pipe(z.string().min(2, 'Name is required').max(120)),
  email: trimmed.pipe(z.string().email('Enter a valid email address')).transform((v) => v.toLowerCase()),
  role: z.nativeEnum(Role),
  phone: optionalPhone,
  isActive: z.boolean(),
  /** Optional reset — leave blank to keep the existing password. */
  newPassword: z
    .string()
    .max(100)
    .transform((v) => v.trim())
    .refine((v) => v === '' || v.length >= 8, 'Password must be at least 8 characters')
    .transform((v) => (v === '' ? undefined : v))
    .optional(),
})
export type UserUpdateInput = z.infer<typeof userUpdateSchema>

export const profileUpdateSchema = z.object({
  name: trimmed.pipe(z.string().min(2, 'Name must be at least 2 characters').max(120)),
  phone: optionalPhone,
  avatarColor: z.enum(['indigo', 'violet', 'cyan', 'emerald', 'amber', 'rose', 'sky', 'teal']).optional(),
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .max(100)
    .transform((v) => v.trim())
    .refine((v) => v === '' || v.length >= 8, 'Password must be at least 8 characters')
    .transform((v) => (v === '' ? undefined : v))
    .optional(),
})
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>

// ── Organisations ────────────────────────────────────────────────────────────

export const organisationCreateSchema = z.object({
  name: trimmed.pipe(z.string().min(2, 'Organisation name is required').max(200)),
  category: optionalText(120),
  domain: trimmed.pipe(z.string().min(1, 'Domain is required').max(120)),
  leadSource: trimmed.pipe(z.string().min(1, 'Lead source is required').max(120)),
  website: optionalUrl,
  organisationType: optionalText(120),
  numberOfProfessionals: z
    .preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
      z.number().int('Must be a whole number').min(0, 'Cannot be negative').max(1000000).optional(),
    )
    .optional(),
  generalEmail: optionalEmail,
  generalPhone: optionalPhone,
  linkedinUrl: optionalUrl,
  location: optionalText(160),
  priority: z.nativeEnum(Priority).default('MEDIUM'),
  status: z.string().optional().default('NEW'),
  assignedToId: optionalCuid,
  notes: optionalLongText(),
  primaryContact: z
    .object({
      name: optionalText(120),
      designation: optionalText(120),
      email: optionalEmail,
      phone: optionalPhone,
      linkedinUrl: optionalUrl,
      isDecisionMaker: z.boolean().optional().default(false),
      priority: z.nativeEnum(Priority).optional().default('MEDIUM'),
    })
    .optional(),
  tags: z.array(z.string().min(1).max(60)).optional().default([]),
  /** Set true to create despite a duplicate warning the user has reviewed. */
  confirmDuplicate: z.boolean().optional().default(false),
})
export type OrganisationCreateInput = z.infer<typeof organisationCreateSchema>

export const organisationUpdateSchema = organisationCreateSchema.partial().extend({
  id: cuid,
  name: trimmed.pipe(z.string().min(2, 'Organisation name is required').max(200)),
})
export type OrganisationUpdateInput = z.infer<typeof organisationUpdateSchema>

export const organisationAssignSchema = z.object({
  id: cuid,
  /** undefined / 'NONE' unassigns. */
  assignedToId: optionalCuid,
  /** Acknowledge that the organisation is already assigned to someone else. */
  confirmReassign: z.boolean().optional().default(false),
})

export const organisationStatusSchema = z.object({
  id: cuid,
  status: z.nativeEnum(OrgStatus),
  reason: optionalText(300),
})

export const organisationBulkAssignSchema = z.object({
  ids: z.array(cuid).min(1, 'Select at least one organisation').max(500),
  assignedToId: optionalCuid,
})

export const reassignmentRequestSchema = z.object({
  organisationId: cuid,
  reason: optionalText(500),
})

export const reassignmentDecisionSchema = z.object({
  id: cuid,
  approve: z.boolean(),
  decisionNote: optionalText(300),
})

// ── Contacts ─────────────────────────────────────────────────────────────────

export const contactCreateSchema = z.object({
  organisationId: cuid,
  name: trimmed.pipe(z.string().min(2, 'Contact name is required').max(160)),
  designation: optionalText(120),
  department: optionalText(120),
  email: optionalEmail,
  phone: optionalPhone,
  linkedinUrl: optionalUrl,
  isDecisionMaker: z.boolean().optional().default(false),
  priority: z.nativeEnum(Priority).default('MEDIUM'),
  status: z.nativeEnum(ContactStatus).optional(),
  assignedToId: optionalCuid,
  notes: optionalLongText(),
  confirmDuplicate: z.boolean().optional().default(false),
})
export type ContactCreateInput = z.infer<typeof contactCreateSchema>

export const contactUpdateSchema = contactCreateSchema.extend({ id: cuid })
export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>

// ── Activities ───────────────────────────────────────────────────────────────

/**
 * Base activity shape. The refinement below enforces the per-channel rules the
 * spec lays out in §10–13, so an EMAIL can never carry a call outcome and a
 * MEETING always records when it happened.
 */
const activityBase = z.object({
  organisationId: cuid,
  contactId: optionalCuid,
  type: z.nativeEnum(ActivityType),
  outcome: z.nativeEnum(ActivityOutcome),
  activityDate: optionalDateTimeLocal,
  notes: optionalLongText(4000),
  nextFollowupDate: optionalDateKey,
  // Channel metadata
  emailSubject: optionalText(240),
  emailTemplate: optionalText(120),
  emailUsed: optionalEmail,
  phoneNumberUsed: optionalPhone,
  linkedinUrl: optionalUrl,
  meetingDate: optionalDateTimeLocal,
  meetingLocation: optionalText(240),
  /** Explicit status override; when omitted the outcome drives progression. */
  statusOverride: z.nativeEnum(OrgStatus).optional(),
})

export const activityCreateSchema = activityBase.superRefine((data, ctx) => {
  if (!isOutcomeValidForType(data.type, data.outcome)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['outcome'],
      message: `"${data.outcome}" is not a valid outcome for a ${data.type.toLowerCase()} activity. Expected one of: ${OUTCOMES_BY_TYPE[
        data.type
      ].join(', ')}.`,
    })
  }

  if (data.type === 'NOTE' && !data.notes) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['notes'],
      message: 'A note needs some content.',
    })
  }

  if (data.type === 'MEETING' && !data.meetingDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['meetingDate'],
      message: 'Record when the meeting is/was held.',
    })
  }
})
export type ActivityCreateInput = z.infer<typeof activityCreateSchema>

export const activityUpdateSchema = activityBase.extend({ id: cuid }).superRefine((data, ctx) => {
  if (!isOutcomeValidForType(data.type, data.outcome)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['outcome'],
      message: 'Outcome does not match the activity type.',
    })
  }
})

// ── Follow-ups ───────────────────────────────────────────────────────────────

export const followUpCreateSchema = z.object({
  organisationId: cuid,
  contactId: optionalCuid,
  activityId: optionalCuid,
  dueDate: dateKeySchema,
  note: optionalText(500),
  assignedToId: optionalCuid,
})
export type FollowUpCreateInput = z.infer<typeof followUpCreateSchema>

export const followUpRescheduleSchema = z.object({
  id: cuid,
  dueDate: dateKeySchema,
  note: optionalText(500),
})

export const followUpStatusSchema = z.object({
  id: cuid,
  status: z.nativeEnum(FollowUpStatus),
})

// ── EOD ──────────────────────────────────────────────────────────────────────

export const eodGenerateSchema = z.object({
  dateKey: dateKeySchema,
  /** Force a fresh AI pass + metric recomputation for an existing report. */
  regenerate: z.boolean().optional().default(false),
  /** Skip the AI call entirely and use the deterministic template. */
  skipAi: z.boolean().optional().default(false),
})
export type EodGenerateInput = z.infer<typeof eodGenerateSchema>

// ── Settings ─────────────────────────────────────────────────────────────────

export const settingsSchema = z.object({
  whatsappNumber: z
    .string()
    .max(24)
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v === '' || (v.length >= 10 && v.length <= 15), {
      message: 'Enter a full international number, digits only (e.g. 919876543210)',
    })
    .transform((v) => (v === '' ? undefined : v))
    .optional(),
  whatsappRecipientLabel: optionalText(80),
  teamName: optionalText(80),
})

// ── Excel import ─────────────────────────────────────────────────────────────

/** Canonical organisation fields an uploaded column can be mapped onto. */
export const IMPORT_FIELDS = [
  'name',
  'category',
  'website',
  'generalEmail',
  'generalPhone',
  'linkedinUrl',
  'location',
  'priority',
  'status',
  'notes',
  'assignedToEmail',
  'contactName',
  'contactDesignation',
  'contactEmail',
  'contactPhone',
  'contactLinkedinUrl',
  'contactIsDecisionMaker',
] as const

export type ImportField = (typeof IMPORT_FIELDS)[number]

export const importCommitSchema = z.object({
  token: z.string().min(1),
  /** header index (as string) -> canonical field name, or 'IGNORE' */
  mapping: z.record(z.string(), z.string()),
  duplicateStrategy: z.enum(['SKIP', 'UPDATE', 'CREATE']).default('SKIP'),
  assignedToId: optionalCuid,
  defaultPriority: z.nativeEnum(Priority).default('MEDIUM'),
})
export type ImportCommitInput = z.infer<typeof importCommitSchema>

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Uniform shape returned by every server action. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; code?: string }

/** Flatten a ZodError into `{ field: firstMessage }` for form display. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form'
    if (!result[key]) result[key] = issue.message
  }
  return result
}

// Bulk operations
export const bulkSchema = z.object({
  action: z.enum(['STATUS', 'ASSIGN', 'PRIORITY', 'DELETE']),
  orgIds: z.array(z.string().min(1)).min(1).max(50),
  status: z.nativeEnum(OrgStatus).optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  rejectionReason: z.string().max(500).optional(),
  assignedToId: z.string().min(1).max(64).optional(),
})

// Numeric / pagination
export const positiveIntSchema = z.coerce.number().int().positive().min(1).max(1000)
export const pageSchema = z.coerce.number().int().min(1).max(10000).optional().default(1)
export const pageSizeSchema = z.coerce.number().int().min(1).max(100).optional().default(25)
