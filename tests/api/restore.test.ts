import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST as restoreRoute } from '../../src/app/api/backups/restore/route'
import * as currentUserModule from '../../src/lib/auth/current-user'
import * as restoreServiceModule from '../../src/server/services/restore'

vi.mock('../../src/lib/auth/current-user')
vi.mock('../../src/server/services/restore')

describe('Restore API Route Security & Parameter Parsing', () => {
  const mockOwnerUser: currentUserModule.CurrentUser = {
    id: 'user_owner_1',
    name: 'Owner Admin',
    email: 'owner@leadwise.com',
    role: 'OWNER',
    phone: null,
    status: 'APPROVED',
    avatarColor: 'violet',
    isActive: true,
  }

  const mockTLUser: currentUserModule.CurrentUser = {
    id: 'user_tl_1',
    name: 'Team Lead',
    email: 'tl@leadwise.com',
    role: 'TL',
    phone: null,
    status: 'APPROVED',
    avatarColor: 'teal',
    isActive: true,
  }

  const mockInternUser: currentUserModule.CurrentUser = {
    id: 'user_intern_1',
    name: 'Intern User',
    email: 'intern@leadwise.com',
    role: 'INTERN',
    phone: null,
    status: 'APPROVED',
    avatarColor: 'amber',
    isActive: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. Authentication Enforcement (401)', () => {
    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      vi.spyOn(currentUserModule, 'getCurrentUser').mockResolvedValue(null)
      const req = new Request('http://localhost:3000/api/backups/restore', { method: 'POST' })
      const res = await restoreRoute(req)
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('2. Strict OWNER-Only Authorization Enforcement (403)', () => {
    it('rejects INTERN callers with 403 Forbidden', async () => {
      vi.spyOn(currentUserModule, 'getCurrentUser').mockResolvedValue(mockInternUser)
      const req = new Request('http://localhost:3000/api/backups/restore', { method: 'POST' })
      const res = await restoreRoute(req)
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toContain('Forbidden: Database restoration is strictly restricted to OWNER.')
    })

    it('rejects TL (Team Lead) callers with 403 Forbidden', async () => {
      vi.spyOn(currentUserModule, 'getCurrentUser').mockResolvedValue(mockTLUser)
      const req = new Request('http://localhost:3000/api/backups/restore', { method: 'POST' })
      const res = await restoreRoute(req)
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toContain('Forbidden: Database restoration is strictly restricted to OWNER.')
    })
  })

  describe('3. Request Body Validation', () => {
    it('returns 400 Bad Request when file is missing from form data', async () => {
      vi.spyOn(currentUserModule, 'getCurrentUser').mockResolvedValue(mockOwnerUser)
      const formData = new FormData()
      formData.append('action', 'preview')

      const req = new Request('http://localhost:3000/api/backups/restore', {
        method: 'POST',
        body: formData,
      })

      const res = await restoreRoute(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('No Excel backup file uploaded')
    })

    it('returns preview results when action is preview', async () => {
      vi.spyOn(currentUserModule, 'getCurrentUser').mockResolvedValue(mockOwnerUser)
      vi.spyOn(restoreServiceModule, 'validateAndPreviewRestore').mockResolvedValue({
        valid: true,
        totalSheets: 18,
        foundSheets: ['Organisations', 'Contacts'],
        missingSheets: [],
        counts: { organisations: 5 } as any,
        newRecordsCount: 5,
        existingRecordsCount: 0,
        foreignKeyOrphansCount: 0,
        sheetDetails: [],
        warnings: [],
        errors: [],
      })

      const formData = new FormData()
      const fakeFile = new Blob(['mock excel content'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      formData.append('file', fakeFile, 'backup.xlsx')
      formData.append('action', 'preview')

      const req = new Request('http://localhost:3000/api/backups/restore', {
        method: 'POST',
        body: formData,
      })

      const res = await restoreRoute(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.preview).toBeDefined()
      expect(data.preview.valid).toBe(true)
      expect(restoreServiceModule.validateAndPreviewRestore).toHaveBeenCalledTimes(1)
    })

    it('executes safe restore with correct mode and preBackup parameters', async () => {
      vi.spyOn(currentUserModule, 'getCurrentUser').mockResolvedValue(mockOwnerUser)
      vi.spyOn(restoreServiceModule, 'executeSafeRestore').mockResolvedValue({
        success: true,
        mode: 'MISSING_ONLY',
        preRestoreBackupFile: 'leadwise_prerestore_123.xlsx',
        restored: { organisations: 3 } as any,
        skippedExisting: 2,
        totalProcessed: 5,
        message: 'Database restoration completed successfully in MISSING_ONLY mode!',
      })

      const formData = new FormData()
      const fakeFile = new Blob(['mock excel content'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      formData.append('file', fakeFile, 'backup.xlsx')
      formData.append('action', 'restore')
      formData.append('mode', 'missing_only')
      formData.append('preBackup', 'true')

      const req = new Request('http://localhost:3000/api/backups/restore', {
        method: 'POST',
        body: formData,
      })

      const res = await restoreRoute(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.mode).toBe('MISSING_ONLY')
      expect(restoreServiceModule.executeSafeRestore).toHaveBeenCalledWith(
        mockOwnerUser,
        expect.any(Buffer),
        { mode: 'MISSING_ONLY', preBackup: true },
      )
    })
  })
})
