import { describe, it, expect } from 'vitest'
import { activityCreateSchema } from '../../src/lib/validation'
import { OUTCOMES_BY_TYPE } from '../../src/lib/constants'

const ORG = 'org_test_123'

describe('NOTE activity creation contracts', () => {
  it('creates a NOTE activity with LOGGED outcome and notes', () => {
    const parsed = activityCreateSchema.safeParse({
      organisationId: ORG,
      type: 'NOTE',
      outcome: 'LOGGED',
      notes: 'Called twice, no answer. Retry Thursday.',
    })
    expect(parsed.success).toBe(true)
  })

  it('creates a NOTE activity with OTHER outcome and notes', () => {
    const parsed = activityCreateSchema.safeParse({
      organisationId: ORG,
      type: 'NOTE',
      outcome: 'OTHER',
      notes: 'General update.',
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects NOTE without notes', () => {
    const parsed = activityCreateSchema.safeParse({
      organisationId: ORG,
      type: 'NOTE',
      outcome: 'LOGGED',
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects NOTE with COMPLETED (not a valid NOTE outcome)', () => {
    expect(OUTCOMES_BY_TYPE.NOTE).not.toContain('COMPLETED')
    const parsed = activityCreateSchema.safeParse({
      organisationId: ORG,
      type: 'NOTE',
      outcome: 'COMPLETED',
      notes: 'Task done.',
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts a CALL activity with CONNECTED outcome', () => {
    const parsed = activityCreateSchema.safeParse({
      organisationId: ORG,
      type: 'CALL',
      outcome: 'CONNECTED',
      notes: 'Spoke with director.',
    })
    expect(parsed.success).toBe(true)
  })

  it('accepts an EMAIL activity with SENT outcome', () => {
    const parsed = activityCreateSchema.safeParse({
      organisationId: ORG,
      type: 'EMAIL',
      outcome: 'SENT',
      emailSubject: 'Partnership intro',
      notes: 'Sent deck.',
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects an invalid channel/outcome combination (CALL + BOUNCED)', () => {
    const parsed = activityCreateSchema.safeParse({
      organisationId: ORG,
      type: 'CALL',
      outcome: 'BOUNCED',
    })
    expect(parsed.success).toBe(false)
  })

  it('keeps the log modal NOTE options within the server-supported set', () => {
    // The modal may only offer NOTE outcomes the API accepts.
    for (const outcome of OUTCOMES_BY_TYPE.NOTE) {
      const parsed = activityCreateSchema.safeParse({
        organisationId: ORG,
        type: 'NOTE',
        outcome,
        notes: 'Timeline check.',
      })
      expect(parsed.success).toBe(true)
    }
  })
})
