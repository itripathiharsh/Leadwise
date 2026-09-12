import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  can,
  assertCan,
  canReadOrganisation,
  canWriteOrganisation,
  organisationScope,
  contactScope,
  activityScope,
  followUpScope,
  ForbiddenError,
} from '../../src/lib/rbac'
import type { CurrentUser } from '../../src/lib/auth/current-user'
import { isCronAuthorized } from '../../src/lib/auth/cron-auth'

describe('Authentication & Organisation / Tenant Isolation', () => {
  const ownerUser: CurrentUser = {
    id: 'user_owner_1',
    name: 'Harsh Owner',
    email: 'owner@sentiomind.com',
    phone: null,
    role: 'OWNER',
    status: 'APPROVED',
    avatarColor: 'violet',
    isActive: true,
  }

  const tlUser: CurrentUser = {
    id: 'user_tl_1',
    name: 'Priya TL',
    email: 'tl@sentiomind.com',
    phone: null,
    role: 'TL',
    status: 'APPROVED',
    avatarColor: 'teal',
    isActive: true,
  }

  const internA: CurrentUser = {
    id: 'user_intern_a',
    name: 'Rahul Intern',
    email: 'rahul@sentiomind.com',
    phone: null,
    role: 'INTERN',
    status: 'APPROVED',
    avatarColor: 'blue',
    isActive: true,
  }

  const internB: CurrentUser = {
    id: 'user_intern_b',
    name: 'Ananya Intern',
    email: 'ananya@sentiomind.com',
    phone: null,
    role: 'INTERN',
    status: 'APPROVED',
    avatarColor: 'amber',
    isActive: true,
  }

  const orgAssignedToA = {
    id: 'org_1',
    assignedToId: internA.id,
    createdById: tlUser.id,
  }

  const orgAssignedToB = {
    id: 'org_2',
    assignedToId: internB.id,
    createdById: tlUser.id,
  }

  describe('Same-organisation access', () => {
    it('allows an intern to write to their assigned organisation', () => {
      const allowed = canWriteOrganisation(internA, orgAssignedToA)
      expect(allowed).toBe(true)
    })

    it('allows an intern to write to an organisation they created', () => {
      const orgCreatedByA = {
        id: 'org_3',
        assignedToId: null,
        createdById: internA.id,
      }
      const allowed = canWriteOrganisation(internA, orgCreatedByA)
      expect(allowed).toBe(true)
    })

    it('allows an owner to write to any organisation', () => {
      expect(canWriteOrganisation(ownerUser, orgAssignedToA)).toBe(true)
      expect(canWriteOrganisation(ownerUser, orgAssignedToB)).toBe(true)
    })

    it('allows a team lead to write to any organisation', () => {
      expect(canWriteOrganisation(tlUser, orgAssignedToA)).toBe(true)
      expect(canWriteOrganisation(tlUser, orgAssignedToB)).toBe(true)
    })
  })

  describe('Cross-organisation access rejection', () => {
    it('rejects an intern attempting to write to another interns organisation', () => {
      const allowed = canWriteOrganisation(internA, orgAssignedToB)
      expect(allowed).toBe(false)
    })

    it('rejects an intern attempting to write to an unassigned organisation created by another user', () => {
      const unassignedOrg = {
        id: 'org_unassigned',
        assignedToId: null,
        createdById: internB.id,
      }
      const allowed = canWriteOrganisation(internA, unassignedOrg)
      expect(allowed).toBe(false)
    })

    it('enforces scoped queries for interns so cross-org records are excluded', () => {
      const scopeA = organisationScope(internA)
      expect(scopeA).toEqual({
        OR: [{ assignedToId: internA.id }, { createdById: internA.id }],
      })

      // Owner and TL see everything (unrestricted where clause)
      expect(organisationScope(ownerUser)).toEqual({})
      expect(organisationScope(tlUser)).toEqual({})
    })

    it('enforces contact queries scoping for interns', () => {
      const scopeA = contactScope(internA)
      expect(scopeA).toEqual({
        OR: [
          { assignedToId: internA.id },
          { createdById: internA.id },
          { organisation: { OR: [{ assignedToId: internA.id }, { createdById: internA.id }] } },
        ],
      })

      expect(contactScope(ownerUser)).toEqual({})
    })

    it('throws ForbiddenError when an unauthorized role tries privileged action', () => {
      expect(() => assertCan(internA, 'org:delete')).toThrow(ForbiddenError)
      expect(() => assertCan(internA, 'user:manage')).toThrow(ForbiddenError)
      expect(() => assertCan(internA, 'settings:manage')).toThrow(ForbiddenError)
      expect(() => assertCan(internA, 'team:view')).toThrow(ForbiddenError)
      expect(() => assertCan(internA, 'eod:view')).toThrow(ForbiddenError)
      expect(() => assertCan(internA, 'eod:generate')).toThrow(ForbiddenError)

      // Owner and TL can perform their allowed actions without error
      expect(() => assertCan(ownerUser, 'org:delete')).not.toThrow()
      expect(() => assertCan(tlUser, 'org:assign')).not.toThrow()
      expect(() => assertCan(ownerUser, 'team:view')).not.toThrow()
      expect(() => assertCan(tlUser, 'team:view')).not.toThrow()
      expect(() => assertCan(ownerUser, 'eod:view')).not.toThrow()
      expect(() => assertCan(tlUser, 'eod:view')).not.toThrow()
    })

    it('allows interns to add organisations and contacts/leads', () => {
      expect(() => assertCan(internA, 'org:create')).not.toThrow()
      expect(() => assertCan(internA, 'contact:create')).not.toThrow()
      // Interns have permission to move pipeline stages / change status
      expect(() => assertCan(internA, 'org:changeStatus')).not.toThrow()
      // But interns cannot reassign organisations to other members
      expect(() => assertCan(internA, 'org:assign')).toThrow(ForbiddenError)
    })

    it('enforces team activity and follow-up scoping for Owner and TL vs Intern', () => {
      // Intern only sees own activities and follow-ups
      expect(activityScope(internA)).toEqual({
        OR: [
          { performedById: internA.id },
          { organisation: { OR: [{ assignedToId: internA.id }, { createdById: internA.id }] } },
        ],
      })
      expect(followUpScope(internA)).toEqual({ assignedToId: internA.id })

      // Owner and TL see whole team works
      expect(activityScope(ownerUser)).toEqual({})
      expect(activityScope(tlUser)).toEqual({})
      expect(followUpScope(ownerUser)).toEqual({})
      expect(followUpScope(tlUser)).toEqual({})
    })
  })

  describe('canReadOrganisation Scoping', () => {
    it('allows interns to read assigned or created organisations only', () => {
      expect(canReadOrganisation(internA, orgAssignedToA)).toBe(true)
      expect(canReadOrganisation(internA, orgAssignedToB)).toBe(false)
    })

    it('allows Owner and TL to read any organisation', () => {
      expect(canReadOrganisation(ownerUser, orgAssignedToB)).toBe(true)
      expect(canReadOrganisation(tlUser, orgAssignedToA)).toBe(true)
    })
  })

  describe('Privileged Operations RBAC (SEC-02, DATA-05)', () => {
    it('prevents interns from managing backups or exporting filtered data', () => {
      expect(() => assertCan(internA, 'backup:manage')).toThrow(ForbiddenError)
      expect(() => assertCan(internA, 'data:export')).toThrow(ForbiddenError)
    })

    it('allows Owner and TL to manage backups and export data', () => {
      expect(() => assertCan(ownerUser, 'backup:manage')).not.toThrow()
      expect(() => assertCan(tlUser, 'backup:manage')).not.toThrow()
      expect(() => assertCan(ownerUser, 'data:export')).not.toThrow()
      expect(() => assertCan(tlUser, 'data:export')).not.toThrow()
    })
  })

  describe('Cron Authentication Fail-Closed Behavior (SEC-01)', () => {
    const originalSecret = process.env.CRON_SECRET

    afterEach(() => {
      process.env.CRON_SECRET = originalSecret
    })

    it('rejects when CRON_SECRET is not configured', () => {
      delete process.env.CRON_SECRET
      const req = new Request('http://localhost/api/cron/reminders')
      expect(isCronAuthorized(req)).toBe(false)
    })

    it('rejects when header is missing or mismatched', () => {
      process.env.CRON_SECRET = 'super-secret-cron-token'
      const unauthReq = new Request('http://localhost/api/cron/reminders')
      expect(isCronAuthorized(unauthReq)).toBe(false)

      const badReq = new Request('http://localhost/api/cron/reminders', {
        headers: { authorization: 'Bearer wrong-secret' },
      })
      expect(isCronAuthorized(badReq)).toBe(false)
    })

    it('accepts valid Bearer token or x-cron-secret header', () => {
      process.env.CRON_SECRET = 'super-secret-cron-token'
      const bearerReq = new Request('http://localhost/api/cron/reminders', {
        headers: { authorization: 'Bearer super-secret-cron-token' },
      })
      expect(isCronAuthorized(bearerReq)).toBe(true)

      const headerReq = new Request('http://localhost/api/cron/reminders', {
        headers: { 'x-cron-secret': 'super-secret-cron-token' },
      })
      expect(isCronAuthorized(headerReq)).toBe(true)
    })
  })
})
