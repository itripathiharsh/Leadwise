import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  exportEncryptedCredentials,
  importEncryptedCredentials,
  applyRestoredCredentials,
} from '../../src/server/services/credentials-backup'
import { prisma } from '../../src/lib/db'

vi.mock('../../src/lib/db', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

describe('Encrypted Credential Backup & Restore Unit Tests', () => {
  const mockSecret = 'super-secret-backup-encryption-key-32-chars!'
  const mockUsers = [
    {
      id: 'usr_admin_123',
      name: 'Admin',
      email: 'admin@sentio.in',
      role: 'OWNER',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdef',
    },
    {
      id: 'usr_harsh_456',
      name: 'Harsh',
      email: 'harsh@sentio.in',
      role: 'OWNER',
      passwordHash: '$2b$12$zyxwvutsrqponmlkjihgfedcba0987654321zyxwvuts',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    ;(prisma.user.findMany as any).mockResolvedValue(mockUsers)
  })

  describe('1. Export Encrypted Credentials', () => {
    it('requires a secret of at least 16 characters', async () => {
      await expect(exportEncryptedCredentials('short')).rejects.toThrow(
        'Credential backup encryption key must be at least 16 characters long.',
      )
    })

    it('successfully encrypts user credentials using AES-256-GCM', async () => {
      const buffer = await exportEncryptedCredentials(mockSecret)
      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(65) // magic + salt + iv + authTag + ciphertext

      // Verify magic header
      const magic = buffer.subarray(0, 21).toString('utf8')
      expect(magic).toBe('LEADWISE_ENC_CREDS_V1')
    })
  })

  describe('2. Import & Decrypt Encrypted Credentials', () => {
    it('successfully decrypts with correct secret and recovers original hashes', async () => {
      const buffer = await exportEncryptedCredentials(mockSecret)
      const decrypted = importEncryptedCredentials(buffer, mockSecret)

      expect(decrypted.length).toBe(2)
      expect(decrypted[0]!.id).toBe('usr_admin_123')
      expect(decrypted[0]!.email).toBe('admin@sentio.in')
      expect(decrypted[0]!.passwordHash).toBe('$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdef')

      expect(decrypted[1]!.id).toBe('usr_harsh_456')
      expect(decrypted[1]!.email).toBe('harsh@sentio.in')
      expect(decrypted[1]!.passwordHash).toBe('$2b$12$zyxwvutsrqponmlkjihgfedcba0987654321zyxwvuts')
    })

    it('rejects decryption with an incorrect secret', async () => {
      const buffer = await exportEncryptedCredentials(mockSecret)
      expect(() => {
        importEncryptedCredentials(buffer, 'wrong-secret-that-fails-authentication!')
      }).toThrow('Decryption failed: Incorrect recovery secret or corrupted file.')
    })

    it('rejects tampered or corrupted ciphertext', async () => {
      const buffer = await exportEncryptedCredentials(mockSecret)
      // Tamper with ciphertext byte
      buffer[buffer.length - 1] = (buffer[buffer.length - 1]! ^ 0xff)

      expect(() => {
        importEncryptedCredentials(buffer, mockSecret)
      }).toThrow('Decryption failed: Incorrect recovery secret or corrupted file.')
    })

    it('rejects buffer missing valid magic header', async () => {
      const invalidBuffer = Buffer.from('NOT_A_VALID_HEADER_DATA_12345678901234567890')
      expect(() => {
        importEncryptedCredentials(invalidBuffer, mockSecret)
      }).toThrow()
    })
  })

  describe('3. Apply Restored Credentials', () => {
    it('matches users by ID first and updates passwordHash', async () => {
      const mockTx = {
        user: {
          findUnique: vi.fn(),
          update: vi.fn(),
        },
      } as any

      mockTx.user.findUnique.mockResolvedValueOnce({
        id: 'usr_admin_123',
        email: 'admin@sentio.in',
      })

      const creds = [
        {
          id: 'usr_admin_123',
          name: 'Admin',
          email: 'admin@sentio.in',
          role: 'OWNER',
          passwordHash: '$2b$10$restored_hash_value_123456789',
        },
      ]

      const result = await applyRestoredCredentials(mockTx, creds)
      expect(result.applied).toBe(1)
      expect(result.skipped).toBe(0)
      expect(mockTx.user.update).toHaveBeenCalledWith({
        where: { id: 'usr_admin_123' },
        data: { passwordHash: '$2b$10$restored_hash_value_123456789' },
      })
    })

    it('falls back to email matching if user ID changed', async () => {
      const mockTx = {
        user: {
          findUnique: vi
            .fn()
            .mockResolvedValueOnce(null) // ID match fails
            .mockResolvedValueOnce({ id: 'usr_db_current_id', email: 'harsh@sentio.in' }), // email match succeeds
          update: vi.fn(),
        },
      } as any

      const creds = [
        {
          id: 'usr_different_backup_id',
          name: 'Harsh',
          email: 'harsh@sentio.in',
          role: 'OWNER',
          passwordHash: '$2b$12$fallback_hash_value_987654321',
        },
      ]

      const result = await applyRestoredCredentials(mockTx, creds)
      expect(result.applied).toBe(1)
      expect(mockTx.user.update).toHaveBeenCalledWith({
        where: { id: 'usr_db_current_id' },
        data: { passwordHash: '$2b$12$fallback_hash_value_987654321' },
      })
    })

    it('skips entries with invalid or missing password hashes', async () => {
      const mockTx = {
        user: {
          findUnique: vi.fn(),
          update: vi.fn(),
        },
      } as any

      const creds = [
        {
          id: 'usr_test',
          name: 'Test',
          email: 'test@sentio.in',
          role: 'INTERN',
          passwordHash: 'plain_or_invalid',
        },
      ]

      const result = await applyRestoredCredentials(mockTx, creds)
      expect(result.applied).toBe(0)
      expect(result.skipped).toBe(1)
      expect(mockTx.user.update).not.toHaveBeenCalled()
    })
  })
})
