import { describe, it, expect } from 'vitest'
import { normalizeEmail, normalizePhone } from '../../src/lib/normalize'
import {
  selectBlockingDuplicates,
  type ContactDuplicate,
} from '../../src/server/services/duplicates'

function makeDuplicate(
  overrides: Partial<ContactDuplicate> & { id: string; organisationId: string },
): ContactDuplicate {
  return {
    name: 'Jane Doe',
    designation: null,
    email: 'jane@example.com',
    phone: '+91 98765 43210',
    reasons: ['EMAIL'],
    organisation: { id: overrides.organisationId, name: 'Org' },
    isCrossOrganisation: false,
    ...overrides,
  }
}

describe('Contact duplicate detection contracts', () => {
  describe('normalization', () => {
    it('treats email casing and surrounding whitespace as identical', () => {
      expect(normalizeEmail('Jane@Example.COM')).toBe(normalizeEmail('  jane@example.com  '))
    })

    it('treats differently formatted phone numbers with the same digits as identical', () => {
      expect(normalizePhone('+91 98765 43210')).toBe(normalizePhone('9876543210'))
      expect(normalizePhone('(098765) 43210')).toBe(normalizePhone('9876543210'))
    })

    it('returns null for empty email/phone so blank fields never collide', () => {
      expect(normalizeEmail('')).toBeNull()
      expect(normalizeEmail(null)).toBeNull()
      expect(normalizePhone('')).toBeNull()
      expect(normalizePhone('123')).toBeNull()
    })
  })

  describe('selectBlockingDuplicates', () => {
    it('blocks a duplicate email in the same organization', () => {
      const dups = [makeDuplicate({ id: 'c1', organisationId: 'org_1', reasons: ['EMAIL'] })]
      expect(selectBlockingDuplicates(dups, 'org_1')).toHaveLength(1)
    })

    it('blocks a duplicate phone in the same organization', () => {
      const dups = [makeDuplicate({ id: 'c2', organisationId: 'org_1', reasons: ['PHONE'] })]
      expect(selectBlockingDuplicates(dups, 'org_1')).toHaveLength(1)
    })

    it('does not block the same email belonging to a different organization', () => {
      const dups = [
        makeDuplicate({
          id: 'c3',
          organisationId: 'org_2',
          isCrossOrganisation: true,
          reasons: ['EMAIL'],
        }),
      ]
      expect(selectBlockingDuplicates(dups, 'org_1')).toHaveLength(0)
    })

    it('blocks only the same-organisation matches from a mixed list', () => {
      const dups = [
        makeDuplicate({ id: 'c4', organisationId: 'org_1', reasons: ['PHONE'] }),
        makeDuplicate({
          id: 'c5',
          organisationId: 'org_9',
          isCrossOrganisation: true,
          reasons: ['EMAIL'],
        }),
      ]
      const blocking = selectBlockingDuplicates(dups, 'org_1')
      expect(blocking.map((d) => d.id)).toEqual(['c4'])
    })

    it('returns an empty list when there are no matches (editing unchanged contact)', () => {
      expect(selectBlockingDuplicates([], 'org_1')).toHaveLength(0)
    })
  })
})
