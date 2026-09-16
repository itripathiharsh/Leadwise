import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST as emergencyRecoveryRoute } from '../../src/app/api/auth/emergency-recovery/route'
import { PATCH as usersPatchRoute } from '../../src/app/api/users/route'
import { getCurrentUser } from '../../src/lib/auth/current-user'
import { prisma } from '../../src/lib/db'
import { env } from '../../src/lib/env'

vi.mock('../../src/lib/auth/current-user', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('../../src/lib/db', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(async (cb: any) => {
      const tx = {
        user: {
          update: vi.fn().mockResolvedValue({ id: 'updated_id' }),
          count: vi.fn(),
        },
      }
      return cb(tx)
    }),
  },
}))

vi.mock('../../src/server/services/audit', () => ({
  writeAudit: vi.fn().mockResolvedValue(undefined),
  writeAuditSafe: vi.fn().mockResolvedValue(undefined),
}))

describe('Owner Recovery API Integration Tests', () => {
  const primaryOwner = {
    id: 'cmtuhrzt70000f34k652a1h8h',
    name: 'Admin',
    email: 'admin@sentio.in',
    role: 'OWNER',
  }

  const teamLead = {
    id: 'usr_tl_123',
    name: 'Team Lead',
    email: 'tl@sentio.in',
    role: 'TL',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. PATCH /api/users - RESET_PASSWORD', () => {
    it('returns 401 if unauthenticated', async () => {
      ;(getCurrentUser as any).mockResolvedValueOnce(null)

      const req = new Request('http://localhost/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'cmtuhrzt70000f34k652a1h8h',
          action: 'RESET_PASSWORD',
          newPassword: 'SecureNewPassword123!',
        }),
      })

      const res = await usersPatchRoute(req)
      expect(res.status).toBe(401)
    })

    it('returns 403 if called by a non-OWNER (TL)', async () => {
      ;(getCurrentUser as any).mockResolvedValueOnce(teamLead)

      const req = new Request('http://localhost/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'cmtuhrzt70000f34k652a1h8h',
          action: 'RESET_PASSWORD',
          newPassword: 'SecureNewPassword123!',
        }),
      })

      const res = await usersPatchRoute(req)
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toContain('Forbidden: Only an OWNER can reset user credentials.')
    })

    it('returns 200 when called by an OWNER', async () => {
      ;(getCurrentUser as any).mockResolvedValueOnce(primaryOwner)
      ;(prisma.user.findFirst as any).mockResolvedValueOnce({
        id: 'usr_target_123',
        name: 'Target User',
        email: 'target@sentio.in',
        role: 'INTERN',
      })

      const req = new Request('http://localhost/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'usr_target_123',
          action: 'RESET_PASSWORD',
          newPassword: 'SecureNewPassword123!',
        }),
      })

      const res = await usersPatchRoute(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })
  })

  describe('2. PATCH /api/users - CHANGE_ROLE', () => {
    it('returns 403 if called by non-OWNER', async () => {
      ;(getCurrentUser as any).mockResolvedValueOnce(teamLead)

      const req = new Request('http://localhost/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'usr_target',
          action: 'CHANGE_ROLE',
          role: 'OWNER',
        }),
      })

      const res = await usersPatchRoute(req)
      expect(res.status).toBe(403)
    })

    it('requires explicit confirmation when promoting to OWNER', async () => {
      ;(getCurrentUser as any).mockResolvedValueOnce(primaryOwner)
      ;(prisma.user.findFirst as any).mockResolvedValueOnce({
        id: 'usr_target',
        name: 'Target User',
        email: 'target@sentio.in',
        role: 'TL',
        isActive: true,
      })

      const req = new Request('http://localhost/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'usr_target',
          action: 'CHANGE_ROLE',
          role: 'OWNER',
          confirmOwnerChange: false,
        }),
      })

      const res = await usersPatchRoute(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('Explicit confirmation required')
    })
  })

  describe('3. POST /api/auth/emergency-recovery', () => {
    const testSecret = 'test-recovery-secret-at-least-32-chars-long'

    it('returns 401 with invalid recovery secret', async () => {
      vi.spyOn(env, 'ownerRecoverySecret', 'get').mockReturnValue(testSecret)

      const req = new Request('http://localhost/api/auth/emergency-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recoverySecret: 'wrong-secret-value-12345678901234567890',
          action: 'REACTIVATE',
          targetEmail: 'admin@sentio.in',
        }),
      })

      const res = await emergencyRecoveryRoute(req)
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toContain('Invalid recovery secret')
    })

    it('returns 404 when target user does not exist', async () => {
      vi.spyOn(env, 'ownerRecoverySecret', 'get').mockReturnValue(testSecret)
      ;(prisma.user.findFirst as any).mockResolvedValueOnce(null)

      const req = new Request('http://localhost/api/auth/emergency-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recoverySecret: testSecret,
          action: 'REACTIVATE',
          targetEmail: 'unknown@sentio.in',
        }),
      })

      const res = await emergencyRecoveryRoute(req)
      expect(res.status).toBe(404)
    })

    it('successfully resets password with valid recovery secret', async () => {
      vi.spyOn(env, 'ownerRecoverySecret', 'get').mockReturnValue(testSecret)
      ;(prisma.user.findFirst as any).mockResolvedValueOnce({
        id: 'cmtuhrzt70000f34k652a1h8h',
        name: 'Admin',
        email: 'admin@sentio.in',
        role: 'OWNER',
        isActive: false,
      })
      ;(prisma.user.update as any).mockResolvedValueOnce({ id: 'cmtuhrzt70000f34k652a1h8h' })

      const req = new Request('http://localhost/api/auth/emergency-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recoverySecret: testSecret,
          action: 'RESET_PASSWORD',
          targetEmail: 'admin@sentio.in',
          newPassword: 'RecoveredPassword123!',
        }),
      })

      const res = await emergencyRecoveryRoute(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.message).toContain('Emergency recovery: Password reset successfully')
    })

    it('successfully reactivates account with valid recovery secret', async () => {
      vi.spyOn(env, 'ownerRecoverySecret', 'get').mockReturnValue(testSecret)
      ;(prisma.user.findFirst as any).mockResolvedValueOnce({
        id: 'cmtuhrzt70000f34k652a1h8h',
        name: 'Admin',
        email: 'admin@sentio.in',
        role: 'OWNER',
        isActive: false,
      })
      ;(prisma.user.update as any).mockResolvedValueOnce({ id: 'cmtuhrzt70000f34k652a1h8h', isActive: true })

      const req = new Request('http://localhost/api/auth/emergency-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recoverySecret: testSecret,
          action: 'REACTIVATE',
          targetEmail: 'admin@sentio.in',
        }),
      })

      const res = await emergencyRecoveryRoute(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.message).toContain('Emergency recovery: Reactivated account')
    })

    it('successfully promotes user to OWNER with valid recovery secret', async () => {
      vi.spyOn(env, 'ownerRecoverySecret', 'get').mockReturnValue(testSecret)
      ;(prisma.user.findFirst as any).mockResolvedValueOnce({
        id: 'usr_intern_123',
        name: 'Intern User',
        email: 'intern@sentio.in',
        role: 'INTERN',
        isActive: true,
      })
      ;(prisma.user.update as any).mockResolvedValueOnce({ id: 'usr_intern_123', role: 'OWNER' })

      const req = new Request('http://localhost/api/auth/emergency-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recoverySecret: testSecret,
          action: 'PROMOTE',
          targetEmail: 'intern@sentio.in',
        }),
      })

      const res = await emergencyRecoveryRoute(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.message).toContain('Emergency recovery: Promoted intern@sentio.in to OWNER')
    })
  })
})
