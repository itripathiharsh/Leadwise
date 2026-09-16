import { describe, it, expect } from 'vitest'
import {
  suggestFollowupDate,
  OUTCOME_FOLLOWUP_OFFSET_DAYS,
  QUICK_NOTE_CHIPS,
} from '../../src/lib/outreach-cadence'
import { todayKey, addDaysToKey } from '../../src/lib/dates'

describe('Outreach Cadence & Auto Follow-up Suggestions', () => {
  const today = todayKey()

  it('suggests +2 days for CALL + NO_ANSWER', () => {
    const expected = addDaysToKey(today, 2)
    expect(suggestFollowupDate('NO_ANSWER')).toBe(expected)
  })

  it('suggests +2 days for CALL + BUSY', () => {
    const expected = addDaysToKey(today, 2)
    expect(suggestFollowupDate('BUSY')).toBe(expected)
  })

  it('clears follow-up date (returns empty string) for NOT_INTERESTED', () => {
    expect(suggestFollowupDate('NOT_INTERESTED')).toBe('')
  })

  it('clears follow-up date for WRONG_NUMBER and BOUNCED', () => {
    expect(suggestFollowupDate('WRONG_NUMBER')).toBe('')
    expect(suggestFollowupDate('BOUNCED')).toBe('')
  })

  it('suggests +3 days for EMAIL + SENT', () => {
    const expected = addDaysToKey(today, 3)
    expect(suggestFollowupDate('SENT')).toBe(expected)
  })

  it('suggests +1 day for CALL_BACK and INTERESTED', () => {
    const expected = addDaysToKey(today, 1)
    expect(suggestFollowupDate('CALL_BACK')).toBe(expected)
    expect(suggestFollowupDate('INTERESTED')).toBe(expected)
  })

  it('suggests +1 day for MEETING_SCHEDULED and RESCHEDULED', () => {
    const expected = addDaysToKey(today, 1)
    expect(suggestFollowupDate('MEETING_SCHEDULED')).toBe(expected)
    expect(suggestFollowupDate('RESCHEDULED')).toBe(expected)
  })

  it('handles unknown or unexpected outcome gracefully', () => {
    expect(suggestFollowupDate('NON_EXISTENT_OUTCOME')).toBe('')
  })

  it('provides quick note chips for all activity types', () => {
    const types = ['CALL', 'EMAIL', 'LINKEDIN', 'MEETING', 'FOLLOW_UP', 'NOTE'] as const
    for (const type of types) {
      expect(QUICK_NOTE_CHIPS[type]).toBeDefined()
      expect(QUICK_NOTE_CHIPS[type].length).toBeGreaterThan(0)
    }
  })
})
