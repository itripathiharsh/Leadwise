import { prisma } from '@/lib/db'
import type { CurrentUser } from '@/lib/auth/current-user'
import { assertCan } from '@/lib/rbac'
import ExcelJS from 'exceljs'
import bcrypt from 'bcryptjs'

export interface RestorePreview {
  valid: boolean
  totalSheets: number
  foundSheets: string[]
  missingSheets: string[]
  counts: {
    organisations: number
    contacts: number
    activities: number
    followups: number
    users: number
    tags: number
    templates: number
    assignments: number
    eodReports: number
  }
  errors: string[]
}

const REQUIRED_RESTORE_SHEETS = [
  'Organisations',
  'Contacts',
  'Activities',
  'Followups',
]

function parseDate(val: unknown): Date | null {
  if (!val) return null
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val
  const str = String(val).trim()
  if (!str) return null
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

function parseBool(val: unknown, defaultVal = false): boolean {
  if (val === undefined || val === null || val === '') return defaultVal
  const str = String(val).toLowerCase().trim()
  return str === 'true' || str === '1' || str === 'yes'
}

function parseIntVal(val: unknown, defaultVal = 0): number {
  if (val === undefined || val === null || val === '') return defaultVal
  const parsed = parseInt(String(val), 10)
  return isNaN(parsed) ? defaultVal : parsed
}

export async function validateAndPreviewRestore(buffer: Buffer): Promise<RestorePreview> {
  const workbook = new ExcelJS.Workbook()
  await (workbook.xlsx as any).load(buffer)

  const foundSheets: string[] = []
  workbook.eachSheet((ws) => {
    foundSheets.push(ws.name)
  })

  const missingSheets = REQUIRED_RESTORE_SHEETS.filter((s) => !foundSheets.includes(s))
  const errors: string[] = []

  if (missingSheets.length > 0) {
    errors.push(`Missing mandatory relational sheets: ${missingSheets.join(', ')}`)
  }

  const getSheetCount = (name: string): number => {
    const ws = workbook.getWorksheet(name)
    return ws ? Math.max(0, ws.rowCount - 1) : 0
  }

  const counts = {
    organisations: getSheetCount('Organisations'),
    contacts: getSheetCount('Contacts'),
    activities: getSheetCount('Activities'),
    followups: getSheetCount('Followups'),
    users: getSheetCount('Users'),
    tags: getSheetCount('Tags'),
    templates: getSheetCount('Templates'),
    assignments: getSheetCount('Assignments'),
    eodReports: getSheetCount('EOD Reports'),
  }

  return {
    valid: errors.length === 0,
    totalSheets: foundSheets.length,
    foundSheets,
    missingSheets,
    counts,
    errors,
  }
}

/**
 * Executes a full database restoration from an Excel (.xlsx) backup workbook buffer.
 * Recreates users, taxonomy, organisations, contacts, activities, and follow-ups.
 */
export async function executeSafeRestore(
  user: CurrentUser | null,
  buffer: Buffer,
) {
  if (user) {
    assertCan(user, 'backup:manage')
  }

  const preview = await validateAndPreviewRestore(buffer)
  if (!preview.valid) {
    throw new Error(`Cannot restore backup: ${preview.errors.join('; ')}`)
  }

  const workbook = new ExcelJS.Workbook()
  await (workbook.xlsx as any).load(buffer)

  const restored = {
    users: 0,
    tags: 0,
    templates: 0,
    organisations: 0,
    contacts: 0,
    activities: 0,
    followups: 0,
    assignments: 0,
    eodReports: 0,
  }

  const defaultPasswordHash = await bcrypt.hash('Sentio@123', 10)

  // 1. Restore Users
  const userSheet = workbook.getWorksheet('Users')
  if (userSheet && userSheet.rowCount > 1) {
    const rows = userSheet.getRows(2, userSheet.rowCount - 1) || []
    for (const row of rows) {
      const id = String(row.getCell(1).text || '').trim()
      const name = String(row.getCell(2).text || '').trim()
      const email = String(row.getCell(3).text || '').trim().toLowerCase()
      const role = String(row.getCell(4).text || 'INTERN').trim() as any
      const phone = String(row.getCell(5).text || '').trim() || null
      const avatarColor = String(row.getCell(6).text || 'violet').trim()
      const isActive = parseBool(row.getCell(7).value, true)

      if (!id || !email) continue

      await prisma.user.upsert({
        where: { id },
        create: {
          id,
          name: name || 'Restored User',
          email,
          role: ['OWNER', 'TL', 'INTERN'].includes(role) ? role : 'INTERN',
          phone,
          avatarColor,
          isActive,
          passwordHash: defaultPasswordHash,
        },
        update: {
          name: name || undefined,
          email,
          role: ['OWNER', 'TL', 'INTERN'].includes(role) ? role : undefined,
          phone,
          avatarColor,
          isActive,
        },
      })
      restored.users++
    }
  }

  // 2. Restore Tags
  const tagSheet = workbook.getWorksheet('Tags')
  if (tagSheet && tagSheet.rowCount > 1) {
    const rows = tagSheet.getRows(2, tagSheet.rowCount - 1) || []
    for (const row of rows) {
      const id = String(row.getCell(1).text || '').trim()
      const name = String(row.getCell(2).text || '').trim()
      const color = String(row.getCell(3).text || 'indigo').trim()
      const isArchived = parseBool(row.getCell(4).value, false)
      const createdById = String(row.getCell(5).text || '').trim() || null

      if (!id || !name) continue

      await prisma.tag.upsert({
        where: { id },
        create: { id, name, color, isArchived, createdById },
        update: { name, color, isArchived },
      })
      restored.tags++
    }
  }

  // 3. Restore Templates
  const tplSheet = workbook.getWorksheet('Templates')
  if (tplSheet && tplSheet.rowCount > 1) {
    const rows = tplSheet.getRows(2, tplSheet.rowCount - 1) || []
    for (const row of rows) {
      const id = String(row.getCell(1).text || '').trim()
      const title = String(row.getCell(2).text || '').trim()
      const category = String(row.getCell(3).text || 'outreach').trim()
      const subcategory = String(row.getCell(4).text || '').trim() || null
      const subject = String(row.getCell(5).text || '').trim()
      const body = String(row.getCell(6).text || '').trim()
      const isArchived = parseBool(row.getCell(7).value, false)
      const createdById = String(row.getCell(8).text || '').trim() || null

      if (!id || !title || !body) continue

      await prisma.template.upsert({
        where: { id },
        create: {
          id,
          title,
          category,
          subcategory: subcategory || null,
          subject,
          body,
          isArchived,
          createdById: createdById || null,
        } as any,
        update: {
          title,
          category,
          subcategory: subcategory || null,
          subject,
          body,
          isArchived,
        } as any,
      })
      restored.templates++
    }
  }

  // 4. Restore Organisations
  const orgSheet = workbook.getWorksheet('Organisations')
  if (orgSheet && orgSheet.rowCount > 1) {
    const rows = orgSheet.getRows(2, orgSheet.rowCount - 1) || []
    for (const row of rows) {
      const id = String(row.getCell(1).text || '').trim()
      const name = String(row.getCell(2).text || '').trim()
      const nameNormalized = String(row.getCell(3).text || name.toLowerCase()).trim()
      const category = String(row.getCell(4).text || 'CORPORATE').trim()
      const website = String(row.getCell(5).text || '').trim() || null
      const domain = String(row.getCell(6).text || '').trim() || null
      const generalEmail = String(row.getCell(7).text || '').trim() || null
      const generalPhone = String(row.getCell(8).text || '').trim() || null
      const linkedinUrl = String(row.getCell(9).text || '').trim() || null
      const location = String(row.getCell(10).text || '').trim() || null
      const priority = String(row.getCell(11).text || 'MEDIUM').trim() as any
      const status = String(row.getCell(12).text || 'NEW').trim() as any
      const notes = String(row.getCell(13).text || '').trim() || null
      const assignedToId = String(row.getCell(14).text || '').trim() || null
      const createdById = String(row.getCell(15).text || '').trim() || null
      const lastContactedAt = parseDate(row.getCell(16).value)
      const nextFollowupAt = parseDate(row.getCell(17).value)
      const activityCount = parseIntVal(row.getCell(18).value, 0)
      const createdAt = parseDate(row.getCell(19).value) || new Date()
      const updatedAt = parseDate(row.getCell(20).value) || new Date()
      const deletedAt = parseDate(row.getCell(21).value)

      if (!id || !name) continue

      await prisma.organisation.upsert({
        where: { id },
        create: {
          id,
          name,
          nameNormalized,
          category,
          website,
          domain,
          generalEmail,
          generalPhone,
          linkedinUrl,
          location,
          priority: ['HIGH', 'MEDIUM', 'LOW'].includes(priority) ? priority : 'MEDIUM',
          status: ['NEW', 'ASSIGNED', 'CONTACTED', 'RESPONDED', 'INTERESTED', 'MEETING', 'PARTNERSHIP', 'REJECTED'].includes(status) ? status : 'NEW',
          notes,
          assignedToId: assignedToId || undefined,
          createdById: createdById || undefined,
          lastContactedAt,
          nextFollowupAt,
          activityCount,
          createdAt,
          updatedAt,
          deletedAt,
        } as any,
        update: {
          name,
          nameNormalized,
          category,
          website,
          domain,
          generalEmail,
          generalPhone,
          linkedinUrl,
          location,
          priority: ['HIGH', 'MEDIUM', 'LOW'].includes(priority) ? priority : undefined,
          status: ['NEW', 'ASSIGNED', 'CONTACTED', 'RESPONDED', 'INTERESTED', 'MEETING', 'PARTNERSHIP', 'REJECTED'].includes(status) ? status : undefined,
          notes,
          assignedToId: assignedToId || undefined,
          lastContactedAt,
          nextFollowupAt,
          activityCount,
          deletedAt,
        } as any,
      })
      restored.organisations++
    }
  }

  // 5. Restore Contacts
  const contactSheet = workbook.getWorksheet('Contacts')
  if (contactSheet && contactSheet.rowCount > 1) {
    const rows = contactSheet.getRows(2, contactSheet.rowCount - 1) || []
    for (const row of rows) {
      const id = String(row.getCell(1).text || '').trim()
      const organisationId = String(row.getCell(2).text || '').trim()
      const name = String(row.getCell(3).text || '').trim()
      const nameNormalized = String(row.getCell(4).text || name.toLowerCase()).trim()
      const designation = String(row.getCell(5).text || '').trim() || null
      const department = String(row.getCell(6).text || '').trim() || null
      const email = String(row.getCell(7).text || '').trim() || null
      const emailNormalized = String(row.getCell(8).text || (email ? email.toLowerCase() : '')).trim() || null
      const phone = String(row.getCell(9).text || '').trim() || null
      const phoneNormalized = String(row.getCell(10).text || '').trim() || null
      const linkedinUrl = String(row.getCell(11).text || '').trim() || null
      const linkedinHandle = String(row.getCell(12).text || '').trim() || null
      const isDecisionMaker = parseBool(row.getCell(13).value, false)
      const priority = String(row.getCell(14).text || 'MEDIUM').trim() as any
      const status = String(row.getCell(15).text || 'NEW').trim() as any
      const notes = String(row.getCell(16).text || '').trim() || null
      const assignedToId = String(row.getCell(17).text || '').trim() || null
      const createdById = String(row.getCell(18).text || '').trim() || null
      const lastContactedAt = parseDate(row.getCell(19).value)
      const createdAt = parseDate(row.getCell(20).value) || new Date()
      const updatedAt = parseDate(row.getCell(21).value) || new Date()
      const deletedAt = parseDate(row.getCell(22).value)

      if (!id || !name || !organisationId) continue

      await prisma.contact.upsert({
        where: { id },
        create: {
          id,
          organisationId,
          name,
          nameNormalized,
          designation,
          department,
          email,
          emailNormalized,
          phone,
          phoneNormalized,
          linkedinUrl,
          linkedinHandle,
          isDecisionMaker,
          priority: ['HIGH', 'MEDIUM', 'LOW'].includes(priority) ? priority : 'MEDIUM',
          status: ['NEW', 'CONTACTED', 'RESPONDED', 'INTERESTED', 'NOT_INTERESTED', 'UNREACHABLE'].includes(status) ? status : 'NEW',
          notes,
          assignedToId: assignedToId || undefined,
          createdById: createdById || undefined,
          lastContactedAt,
          createdAt,
          updatedAt,
          deletedAt,
        } as any,
        update: {
          organisationId,
          name,
          nameNormalized,
          designation,
          department,
          email,
          emailNormalized,
          phone,
          phoneNormalized,
          linkedinUrl,
          linkedinHandle,
          isDecisionMaker,
          priority: ['HIGH', 'MEDIUM', 'LOW'].includes(priority) ? priority : undefined,
          status: ['NEW', 'CONTACTED', 'RESPONDED', 'INTERESTED', 'NOT_INTERESTED', 'UNREACHABLE'].includes(status) ? status : undefined,
          notes,
          assignedToId: assignedToId || undefined,
          lastContactedAt,
          deletedAt,
        } as any,
      })
      restored.contacts++
    }
  }

  // 6. Restore Activities
  const actSheet = workbook.getWorksheet('Activities')
  if (actSheet && actSheet.rowCount > 1) {
    const rows = actSheet.getRows(2, actSheet.rowCount - 1) || []
    for (const row of rows) {
      const id = String(row.getCell(1).text || '').trim()
      const organisationId = String(row.getCell(2).text || '').trim() || null
      const contactId = String(row.getCell(3).text || '').trim() || null
      const performedById = String(row.getCell(4).text || '').trim()
      const type = String(row.getCell(5).text || 'NOTE').trim() as any
      const activityDate = parseDate(row.getCell(6).value) || new Date()
      const outcome = String(row.getCell(7).text || 'LOGGED').trim() as any
      const notes = String(row.getCell(8).text || '').trim() || null
      const nextFollowupDate = parseDate(row.getCell(9).value)
      const emailSubject = String(row.getCell(10).text || '').trim() || null
      const emailTemplate = String(row.getCell(11).text || '').trim() || null
      const emailUsed = String(row.getCell(12).text || '').trim() || null
      const phoneNumberUsed = String(row.getCell(13).text || '').trim() || null
      const linkedinUrl = String(row.getCell(14).text || '').trim() || null
      const meetingDate = parseDate(row.getCell(15).value)
      const meetingLocation = String(row.getCell(16).text || '').trim() || null
      const statusAfter = String(row.getCell(17).text || '').trim() || null
      const createdAt = parseDate(row.getCell(18).value) || new Date()
      const updatedAt = parseDate(row.getCell(19).value) || new Date()
      const deletedAt = parseDate(row.getCell(20).value)

      if (!id || !performedById) continue

      await prisma.activity.upsert({
        where: { id },
        create: {
          id,
          organisationId: organisationId || undefined,
          contactId: contactId || undefined,
          performedById,
          type: ['CALL', 'EMAIL', 'LINKEDIN', 'MEETING', 'FOLLOW_UP', 'NOTE'].includes(type) ? type : 'NOTE',
          activityDate,
          outcome,
          notes,
          nextFollowupDate,
          emailSubject,
          emailTemplate,
          emailUsed,
          phoneNumberUsed,
          linkedinUrl,
          meetingDate,
          meetingLocation,
          statusAfter: statusAfter || undefined,
          createdAt,
          updatedAt,
          deletedAt,
        } as any,
        update: {
          notes,
          outcome,
          statusAfter: statusAfter || undefined,
          deletedAt,
        } as any,
      })
      restored.activities++
    }
  }

  // 7. Restore Follow-ups
  const followSheet = workbook.getWorksheet('Followups')
  if (followSheet && followSheet.rowCount > 1) {
    const rows = followSheet.getRows(2, followSheet.rowCount - 1) || []
    for (const row of rows) {
      const id = String(row.getCell(1).text || '').trim()
      const organisationId = String(row.getCell(2).text || '').trim() || null
      const contactId = String(row.getCell(3).text || '').trim() || null
      const activityId = String(row.getCell(4).text || '').trim() || null
      const dueDate = parseDate(row.getCell(5).value) || new Date()
      const note = String(row.getCell(6).text || '').trim() || null
      const status = String(row.getCell(7).text || 'PENDING').trim() as any
      const reminderEnabled = parseBool(row.getCell(8).value, false)
      const assignedToId = String(row.getCell(9).text || '').trim() || null
      const createdById = String(row.getCell(10).text || '').trim() || null
      const completedAt = parseDate(row.getCell(11).value)
      const completedById = String(row.getCell(12).text || '').trim() || null
      const createdAt = parseDate(row.getCell(13).value) || new Date()
      const updatedAt = parseDate(row.getCell(14).value) || new Date()
      const deletedAt = parseDate(row.getCell(15).value)

      if (!id) continue

      await prisma.followUp.upsert({
        where: { id },
        create: {
          id,
          organisationId: organisationId || undefined,
          contactId: contactId || undefined,
          activityId: activityId || undefined,
          dueDate,
          note,
          status: ['PENDING', 'DONE', 'CANCELLED'].includes(status) ? status : 'PENDING',
          reminderEnabled,
          assignedToId: assignedToId || undefined,
          createdById: createdById || undefined,
          completedAt,
          completedById: completedById || undefined,
          createdAt,
          updatedAt,
          deletedAt,
        } as any,
        update: {
          note,
          dueDate,
          status: ['PENDING', 'DONE', 'CANCELLED'].includes(status) ? status : undefined,
          completedAt,
          deletedAt,
        } as any,
      })
      restored.followups++
    }
  }

  // 8. Restore Assignments (Reassignment Requests)
  const assignSheet = workbook.getWorksheet('Assignments')
  if (assignSheet && assignSheet.rowCount > 1) {
    const rows = assignSheet.getRows(2, assignSheet.rowCount - 1) || []
    for (const row of rows) {
      const id = String(row.getCell(1).text || '').trim()
      const organisationId = String(row.getCell(2).text || '').trim()
      const requestedById = String(row.getCell(3).text || '').trim()
      const currentAssigneeId = String(row.getCell(4).text || '').trim()
      const reason = String(row.getCell(5).text || '').trim()
      const status = String(row.getCell(6).text || 'PENDING').trim() as any
      const decidedById = String(row.getCell(7).text || '').trim() || null
      const decidedAt = parseDate(row.getCell(8).value)
      const decisionNote = String(row.getCell(9).text || '').trim() || null
      const createdAt = parseDate(row.getCell(10).value) || new Date()
      const updatedAt = parseDate(row.getCell(11).value) || new Date()

      if (!id || !organisationId || !requestedById || !currentAssigneeId) continue

      await prisma.reassignmentRequest.upsert({
        where: { id },
        create: {
          id,
          organisationId,
          requestedById,
          currentAssigneeId,
          reason,
          status: ['PENDING', 'APPROVED', 'REJECTED'].includes(status) ? status : 'PENDING',
          decidedById,
          decidedAt,
          decisionNote,
          createdAt,
          updatedAt,
        },
        update: {
          status: ['PENDING', 'APPROVED', 'REJECTED'].includes(status) ? status : undefined,
          decidedById,
          decidedAt,
          decisionNote,
        },
      })
      restored.assignments++
    }
  }

  // Audit log the restore operation
  if (user) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'SYSTEM_RESTORE',
        entityType: 'backup',
        entityId: 'manual_restore',
        summary: `Restored ${restored.organisations} organisations, ${restored.contacts} contacts, ${restored.activities} activities from backup.`,
        after: {
          timestamp: new Date().toISOString(),
          restoredCounts: restored,
        },
      },
    })
  }

  return {
    success: true,
    message: `Database successfully restored from backup!`,
    restored,
  }
}
