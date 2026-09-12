import { describe, it, expect } from 'vitest'
import {
  activityCreateSchema,
  contactCreateSchema,
  followUpCreateSchema,
  organisationStatusSchema,
} from '../../src/lib/validation'
import { resolveOrgStatus, suggestedStatusFor } from '../../src/lib/constants'

describe('End-to-End CRM Validation & Business Logic Contracts', () => {
  describe('Follow-up CRUD validation contracts', () => {
    it('validates required fields for scheduling a follow-up', () => {
      const valid = followUpCreateSchema.safeParse({
        organisationId: 'org_test_123',
        dueDate: '2026-09-20',
        note: 'Follow-up regarding partnership MoU draft',
      })
      expect(valid.success).toBe(true)
      if (valid.success) {
        expect(valid.data.organisationId).toBe('org_test_123')
        expect(valid.data.dueDate).toBe('2026-09-20')
      }
    })

    it('rejects invalid follow-up due dates', () => {
      const invalid = followUpCreateSchema.safeParse({
        organisationId: 'org_test_123',
        dueDate: 'not-a-date',
      })
      expect(invalid.success).toBe(false)
    })
  })

  describe('Activity Logging & Channel Outcome Validation', () => {
    it('accepts valid outcome for CALL activity', () => {
      const call = activityCreateSchema.safeParse({
        organisationId: 'org_test_123',
        type: 'CALL',
        outcome: 'CONNECTED',
        notes: 'Discussion with clinical director went well',
      })
      expect(call.success).toBe(true)
    })

    it('rejects outcome incompatible with ActivityType', () => {
      // BOUNCED is valid for EMAIL, not for CALL
      const invalidCall = activityCreateSchema.safeParse({
        organisationId: 'org_test_123',
        type: 'CALL',
        outcome: 'BOUNCED',
      })
      expect(invalidCall.success).toBe(false)
    })

    it('accepts valid outcome for MEETING activity', () => {
      const meeting = activityCreateSchema.safeParse({
        organisationId: 'cl9x000000000000000000001',
        type: 'MEETING',
        outcome: 'MEETING_COMPLETED',
        meetingDate: '2026-09-20T14:30',
        notes: 'Signed preliminary agreement',
      })
      expect(meeting.success).toBe(true)
    })
  })

  describe('Deterministic Pipeline Progression & Status Advancement', () => {
    it('correctly advances status from INTERESTED to MEETING when a meeting is scheduled', () => {
      const suggested = suggestedStatusFor('MEETING', 'MEETING_SCHEDULED')
      expect(suggested).toBe('MEETING')
      const nextStatus = resolveOrgStatus('INTERESTED', suggested)
      expect(nextStatus).toBe('MEETING')
    })

    it('enforces non-regression rule (never rolls back an advanced status)', () => {
      // If org is at MEETING stage and a new CALL with NO_ANSWER is logged, status does not regress to CONTACTED
      const suggested = suggestedStatusFor('CALL', 'NO_ANSWER')
      const nextStatus = resolveOrgStatus('MEETING', suggested)
      // null means no status advancement/regression needed
      expect(nextStatus).toBe(null)
    })

    it('validates pipeline stage status change schema', () => {
      const rejected = organisationStatusSchema.safeParse({
        id: 'cl9x000000000000000000001',
        status: 'REJECTED',
        reason: 'Budget constraints',
      })
      expect(rejected.success).toBe(true)
    })
  })

  describe('Contact Details Normalization & Validation', () => {
    it('normalizes email to lowercase and trims name', () => {
      const contact = contactCreateSchema.safeParse({
        organisationId: 'org_123',
        name: '  Dr. Vikram Sarabhai  ',
        email: '  VIKRAM@ISRO.GOV.IN  ',
        designation: 'Director of Healthcare Partnerships',
      })
      expect(contact.success).toBe(true)
      if (contact.success) {
        expect(contact.data.name).toBe('Dr. Vikram Sarabhai')
        expect(contact.data.email).toBe('vikram@isro.gov.in')
      }
    })

    it('rejects contacts without an organisationId', () => {
      const invalid = contactCreateSchema.safeParse({
        name: 'Jane Doe',
      })
      expect(invalid.success).toBe(false)
    })
  })
})
