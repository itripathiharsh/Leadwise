import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  resetUserPasswordByOwner,
  changeUserRole,
} from '../../src/server/services/users'
import { prisma } from '../../src/lib/db'
import type { CurrentUser } from '../../src/lib/auth/current-user'
import { writeAudit } from '../../src/server/services/audit'

vi.mock('../../src/lib/db', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
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

describe('Dual-OWNER Resilience & Account Recovery Unit Tests', () => {
  const primaryOwner: CurrentUser = {
    id: 'cmtuhrzt70000f34k652a1h8h',
    name: 'Admin',
    email: 'admin@sentio.in',
    role: 'OWNER',
    status: 'APPROVED',
    phone: null,
    avatarColor: 'violet',
    isActive: true,
  }

  const backupOwner: CurrentUser = {
    id: 'cmtuhrzta0001f34kzslhjsa2',
    name: 'Harsh',
    email: 'harsh@sentio.in',
    role: 'OWNER',
    status: 'APPROVED',
    phone: null,
    avatarColor: 'teal',
    isActive: true,
  }

  const teamLead: CurrentUser = {
    id: 'usr_tl_123',
    name: 'Team Lead',
    email: 'tl@sentio.in',
    role: 'TL',
    status: 'APPROVED',
    phone: null,
    avatarColor: 'teal',
    isActive: true,
  }

  const employee: CurrentUser = {
    id: 'usr_emp_456',
    name: 'Aarav Verma',
    email: 'aarav@sentio.in',
    role: 'INTERN',
    status: 'APPROVED',
    phone: null,
    avatarColor: 'amber',
    isActive: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. Dual-OWNER Resilience & Password Reset', () => {
    it('allows backup OWNER to reset primary OWNER credentials', async () => {
      ;(prisma.user.findFirst as any).mockResolvedValueOnce({
        id: primaryOwner.id,
        name: primaryOwner.name,
        email: primaryOwner.email,
        role: 'OWNER',
      })

      const result = await resetUserPasswordByOwner(
        backupOwner,
        primaryOwner.id,
        'SecureNewPass123!',
      )

      expect(result.success).toBe(true)
      expect(result.message).toContain('Password reset successfully')
      expect(writeAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: backupOwner.id,
          action: 'user.password_reset',
          entityId: primaryOwner.id,
        }),
        expect.anything(),
      )
    })

    it('allows primary OWNER to reset backup OWNER credentials', async () => {
      ;(prisma.user.findFirst as any).mockResolvedValueOnce({
        id: backupOwner.id,
        name: backupOwner.name,
        email: backupOwner.email,
        role: 'OWNER',
      })

      const result = await resetUserPasswordByOwner(
        primaryOwner,
        backupOwner.id,
        'HarshSecurePass2026!',
      )

      expect(result.success).toBe(true)
      expect(result.message).toContain('Password reset successfully')
    })

    it('forbids TL or INTERN from resetting another user credentials', async () => {
      await expect(
        resetUserPasswordByOwner(teamLead, employee.id, 'NewPass1234!'),
      ).rejects.toThrow('Only an authenticated OWNER can reset user credentials.')

      await expect(
        resetUserPasswordByOwner(employee, primaryOwner.id, 'NewPass1234!'),
      ).rejects.toThrow('Only an authenticated OWNER can reset user credentials.')
    })

    it('validates password complexity during owner reset', async () => {
      ;(prisma.user.findFirst as any).mockResolvedValueOnce({
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: 'INTERN',
      })

      await expect(
        resetUserPasswordByOwner(primaryOwner, employee.id, 'short'),
      ).rejects.toThrow('Password must be at least 8 characters.')
    })
  })

  describe('2. Final OWNER Protection & Role Changes', () => {
    it('requires explicit confirmation when promoting a user to OWNER', async () => {
      ;(prisma.user.findFirst as any).mockResolvedValueOnce({
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: 'INTERN',
        isActive: true,
      })

      await expect(
        changeUserRole(primaryOwner, employee.id, 'OWNER', false),
      ).rejects.toThrow('Explicit confirmation required to promote an OWNER account.')
    })

    it('requires explicit confirmation when demoting an OWNER', async () => {
      ;(prisma.user.findFirst as any).mockResolvedValueOnce({
        id: backupOwner.id,
        name: backupOwner.name,
        email: backupOwner.email,
        role: 'OWNER',
        isActive: true,
      })

      await expect(
        changeUserRole(primaryOwner, backupOwner.id, 'TL', false),
      ).rejects.toThrow('Explicit confirmation required to demote an OWNER account.')
    })

    it('blocks demoting an OWNER if it would leave 0 active OWNERs', async () => {
      ;(prisma.user.findFirst as any).mockResolvedValueOnce({
        id: primaryOwner.id,
        name: primaryOwner.name,
        email: primaryOwner.email,
        role: 'OWNER',
        isActive: true,
      })
      // Only 0 other active owners in CRM
      ;(prisma.user.count as any).mockResolvedValueOnce(0)

      await expect(
        changeUserRole(backupOwner, primaryOwner.id, 'TL', true),
      ).rejects.toThrow('Cannot demote the final active Owner.')
    })

    it('allows demoting an OWNER when another active OWNER remains', async () => {
      ;(prisma.user.findFirst as any).mockResolvedValueOnce({
        id: backupOwner.id,
        name: backupOwner.name,
        email: backupOwner.email,
        role: 'OWNER',
        isActive: true,
      })
      // 1 other active owner exists (Admin)
      ;(prisma.user.count as any).mockResolvedValueOnce(1)

      const result = await changeUserRole(primaryOwner, backupOwner.id, 'TL', true)
      expect(result.success).toBe(true)
      expect(result.role).toBe('TL')
      expect(writeAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user.role_changed',
          userId: primaryOwner.id,
          entityId: backupOwner.id,
        }),
        expect.anything(),
      )
    })
  })
})
