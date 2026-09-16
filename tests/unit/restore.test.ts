import { describe, it, expect, vi, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'
import {
  buildFullBackupWorkbook,
  validateBackup,
} from '../../src/server/services/backup'
import {
  validateAndPreviewRestore,
  executeSafeRestore,
} from '../../src/server/services/restore'
import { verifyGoogleDriveUpload } from '../../src/server/services/google-drive'
import type { CurrentUser } from '../../src/lib/auth/current-user'

describe('CRM Backup & Restore / Import Unit Tests', () => {
  describe('1. Workbook Generation & Backup Coverage', () => {
    it('generates all 18 sheets (17 relational data sheets + 1 metadata sheet)', async () => {
      const { workbook, counts } = await buildFullBackupWorkbook()
      expect(workbook.worksheets.length).toBe(18)

      const sheetNames = workbook.worksheets.map((ws) => ws.name)
      const expectedSheets = [
        'Organisations',
        'Contacts',
        'Activities',
        'Followups',
        'Users',
        'Assignments',
        'EOD Reports',
        'Tags',
        'Templates',
        'Audit Logs',
        'Organisation Tags',
        'Contact Tags',
        'Comments',
        'Attachments Metadata',
        'Conversations',
        'Conversation Members',
        'Messages',
        'Backup Metadata',
      ]

      for (const expected of expectedSheets) {
        expect(sheetNames).toContain(expected)
      }

      // Check counts object contains all 17 models
      expect(counts.organisations).toBeDefined()
      expect(counts.contacts).toBeDefined()
      expect(counts.activities).toBeDefined()
      expect(counts.followups).toBeDefined()
      expect(counts.users).toBeDefined()
      expect(counts.reassignments).toBeDefined()
      expect(counts.eodReports).toBeDefined()
      expect(counts.tags).toBeDefined()
      expect(counts.templates).toBeDefined()
      expect(counts.auditLogs).toBeDefined()
      expect(counts.organisationTags).toBeDefined()
      expect(counts.contactTags).toBeDefined()
      expect(counts.comments).toBeDefined()
      expect(counts.attachments).toBeDefined()
      expect(counts.conversations).toBeDefined()
      expect(counts.conversationMembers).toBeDefined()
      expect(counts.messages).toBeDefined()
    })

    it('strictly excludes sensitive credentials (passwordHash, tokens, secrets) from all worksheets', async () => {
      const { workbook } = await buildFullBackupWorkbook()

      // Inspect Users sheet
      const userSheet = workbook.getWorksheet('Users')
      expect(userSheet).toBeDefined()
      const userHeaders = userSheet!.getRow(1).values as string[]
      expect(userHeaders).toContain('status')
      expect(userHeaders).not.toContain('passwordHash')
      expect(userHeaders).not.toContain('password')
      expect(userHeaders).not.toContain('token')

      // Inspect Attachments sheet (metadata only, no raw binary base64)
      const attachSheet = workbook.getWorksheet('Attachments Metadata')
      expect(attachSheet).toBeDefined()
      const attachHeaders = attachSheet!.getRow(1).values as string[]
      expect(attachHeaders).not.toContain('contentBase64')
    })
  })

  describe('2. Backup Structural Validation Engine', () => {
    it('detects empty buffer and returns valid=false', async () => {
      const result = await validateBackup(Buffer.alloc(0), { organisations: 0 })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Generated backup buffer is empty.')
    })

    it('validates a properly formatted multi-sheet backup buffer', async () => {
      const { workbook, counts } = await buildFullBackupWorkbook()
      const arrayBuffer = await workbook.xlsx.writeBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const validation = await validateBackup(buffer, counts)
      expect(validation.valid).toBe(true)
      expect(validation.totalSheets).toBe(18)
      expect(validation.errors.length).toBe(0)
    })
  })

  describe('3. Restore Dry-Run Validation & Referential Integrity', () => {
    it('detects missing required sheets during restore preview', async () => {
      const testWorkbook = new ExcelJS.Workbook()
      testWorkbook.addWorksheet('Organisations')
      // Missing Contacts, Activities, Followups, Users

      const arrayBuffer = await testWorkbook.xlsx.writeBuffer()
      const preview = await validateAndPreviewRestore(Buffer.from(arrayBuffer))

      expect(preview.valid).toBe(false)
      expect(preview.missingSheets).toContain('Contacts')
      expect(preview.missingSheets).toContain('Activities')
      expect(preview.missingSheets).toContain('Followups')
      expect(preview.missingSheets).toContain('Users')
      expect(preview.errors[0]).toContain('Missing mandatory relational sheets')
    })

    it('correctly reports new records vs existing records without mutating the database (dry-run)', async () => {
      const testWorkbook = new ExcelJS.Workbook()

      const userSheet = testWorkbook.addWorksheet('Users')
      userSheet.addRow(['id', 'name', 'email', 'role', 'phone', 'avatarColor', 'isActive', 'lastLoginAt', 'createdAt', 'updatedAt', 'deletedAt'])
      userSheet.addRow(['new_user_999', 'New Operator', 'new_unique_operator@leadwise.com', 'INTERN', '', 'teal', 'true', '', '', '', ''])

      const orgSheet = testWorkbook.addWorksheet('Organisations')
      orgSheet.addRow(['id', 'name', 'nameNormalized', 'category', 'website', 'domain', 'generalEmail', 'generalPhone', 'linkedinUrl', 'location', 'priority', 'status', 'notes', 'nextAction', 'leadSource', 'leadSourceDetail', 'rejectionReason', 'rejectionNote', 'partnershipStage', 'aiScore', 'customFields', 'assignedToId', 'createdById', 'lastContactedAt', 'nextFollowupAt', 'activityCount', 'createdAt', 'updatedAt', 'deletedAt'])
      orgSheet.addRow(['new_org_999', 'Apollo Clinic', 'apollo clinic', 'Health', '', '', '', '', '', '', 'MEDIUM', 'NEW', '', '', '', '', '', '', '', '', '', 'new_user_999', 'new_user_999', '', '', '0', '', '', ''])

      const contactSheet = testWorkbook.addWorksheet('Contacts')
      contactSheet.addRow(['id', 'organisationId', 'name', 'nameNormalized', 'designation', 'department', 'email', 'emailNormalized', 'phone', 'phoneNormalized', 'secondaryEmail', 'secondaryPhone', 'linkedinUrl', 'linkedinHandle', 'leadSource', 'isDecisionMaker', 'priority', 'status', 'notes', 'aiScore', 'customFields', 'assignedToId', 'createdById', 'lastContactedAt', 'createdAt', 'updatedAt', 'deletedAt'])
      contactSheet.addRow(['new_contact_999', 'new_org_999', 'Dr. Sharma', 'dr sharma', 'Director', '', 'sharma@apollo.com', 'sharma@apollo.com', '', '', '', '', '', '', '', 'true', 'HIGH', 'NEW', '', '', '', 'new_user_999', 'new_user_999', '', '', '', ''])

      const actSheet = testWorkbook.addWorksheet('Activities')
      actSheet.addRow(['id', 'organisationId', 'contactId', 'performedById', 'type', 'activityDate', 'outcome', 'notes', 'nextFollowupDate', 'emailSubject', 'emailTemplate', 'emailUsed', 'phoneNumberUsed', 'linkedinUrl', 'meetingDate', 'meetingLocation', 'statusAfter', 'createdAt', 'updatedAt', 'deletedAt'])
      actSheet.addRow(['new_act_999', 'new_org_999', 'new_contact_999', 'new_user_999', 'NOTE', new Date().toISOString(), 'LOGGED', 'Initial discovery note', '', '', '', '', '', '', '', '', '', '', '', ''])

      const followSheet = testWorkbook.addWorksheet('Followups')
      followSheet.addRow(['id', 'organisationId', 'contactId', 'activityId', 'dueDate', 'note', 'status', 'reminderEnabled', 'assignedToId', 'createdById', 'completedAt', 'completedById', 'createdAt', 'updatedAt', 'deletedAt'])
      followSheet.addRow(['new_follow_999', 'new_org_999', 'new_contact_999', 'new_act_999', new Date().toISOString(), 'Call back Dr Sharma', 'PENDING', 'true', 'new_user_999', 'new_user_999', '', '', '', '', ''])

      const arrayBuffer = await testWorkbook.xlsx.writeBuffer()
      const preview = await validateAndPreviewRestore(Buffer.from(arrayBuffer))

      expect(preview.valid).toBe(true)
      expect(preview.newRecordsCount).toBeGreaterThanOrEqual(4)
      expect(preview.foreignKeyOrphansCount).toBe(0)
    })

    it('detects foreign-key orphan references (e.g. contact referencing non-existent organisation)', async () => {
      const testWorkbook = new ExcelJS.Workbook()

      const userSheet = testWorkbook.addWorksheet('Users')
      userSheet.addRow(['id', 'name', 'email', 'role'])
      userSheet.addRow(['user_1', 'Test User', 'test@example.com', 'INTERN'])

      const orgSheet = testWorkbook.addWorksheet('Organisations')
      orgSheet.addRow(['id', 'name'])
      orgSheet.addRow(['org_1', 'Org 1'])

      const contactSheet = testWorkbook.addWorksheet('Contacts')
      contactSheet.addRow(['id', 'organisationId', 'name'])
      // non-existent organisation ID
      contactSheet.addRow(['contact_1', 'non_existent_org_id', 'Orphan Contact'])

      testWorkbook.addWorksheet('Activities')
      testWorkbook.addWorksheet('Followups')

      const arrayBuffer = await testWorkbook.xlsx.writeBuffer()
      const preview = await validateAndPreviewRestore(Buffer.from(arrayBuffer))

      expect(preview.foreignKeyOrphansCount).toBeGreaterThanOrEqual(1)
      const contactDetail = preview.sheetDetails.find((s) => s.name === 'Contacts')
      expect(contactDetail?.orphanRows).toBe(1)
    })
  })

  describe('4. OWNER-Only Authorization Guard', () => {
    it('rejects execution when caller role is INTERN', async () => {
      const internUser: CurrentUser = {
        id: 'user_intern',
        email: 'intern@leadwise.com',
        role: 'INTERN',
        name: 'Intern User',
        phone: null,
        status: 'APPROVED',
        avatarColor: 'amber',
        isActive: true,
      }
      await expect(
        executeSafeRestore(internUser, Buffer.alloc(10)),
      ).rejects.toThrow('Forbidden: Database restoration is strictly restricted to OWNER.')
    })

    it('rejects execution when caller role is TL (Team Lead)', async () => {
      const tlUser: CurrentUser = {
        id: 'user_tl',
        email: 'tl@leadwise.com',
        role: 'TL',
        name: 'Team Lead',
        phone: null,
        status: 'APPROVED',
        avatarColor: 'teal',
        isActive: true,
      }
      await expect(
        executeSafeRestore(tlUser, Buffer.alloc(10)),
      ).rejects.toThrow('Forbidden: Database restoration is strictly restricted to OWNER.')
    })
  })

  describe('5. Google Drive Upload Verification Engine', () => {
    it('returns verified: false when Google OAuth credentials are not configured', async () => {
      const result = await verifyGoogleDriveUpload('non_existent_file_id', 'backup.xlsx')
      expect(result.verified).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})
