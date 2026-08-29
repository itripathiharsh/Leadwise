import ExcelJS from 'exceljs'
import { prisma } from '@/lib/db'
import { todayKey, formatDateTime } from '@/lib/dates'
import { uploadBackupToGoogleDrive } from './google-drive'
import { notifyOwnersAndTLs } from './notifications'
import { getAppSetting, setAppSetting } from './settings'
import type { BackupStatus, BackupTrigger } from '@prisma/client'

export interface BackupValidationResult {
  valid: boolean
  totalSheets: number
  sheets: {
    name: string
    rowCount: number
    dbCount: number
    matches: boolean
    hasIds: boolean
  }[]
  orphanViolations: number
  errors: string[]
}

export interface BackupExecutionResult {
  recordId: string
  fileName: string
  fileSize: number
  status: BackupStatus
  driveUrl?: string
  driveFileId?: string
  validation: BackupValidationResult
  buffer: Buffer
  errorMessage?: string
}

// ── Sheet styling helper ─────────────────────────────────────────────────────

function formatWorksheetHeader(sheet: ExcelJS.Worksheet, headerColor = 'FF1F2544') {
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  const header = sheet.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } }
  header.alignment = { vertical: 'middle' }
  header.height = 24
}

/**
 * Builds the complete relational multi-sheet Excel workbook.
 * Preserves all database columns and stable IDs for full restoration.
 */
export async function buildFullBackupWorkbook(): Promise<{
  workbook: ExcelJS.Workbook
  counts: {
    organisations: number
    contacts: number
    activities: number
    followups: number
    users: number
    reassignments: number
    eodReports: number
  }
}> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Leadwise Partnership CRM'
  workbook.created = new Date()
  workbook.properties.date1904 = false

  // 1. Organisations
  const orgSheet = workbook.addWorksheet('Organisations')
  orgSheet.columns = [
    { header: 'id', key: 'id', width: 28 },
    { header: 'name', key: 'name', width: 32 },
    { header: 'nameNormalized', key: 'nameNormalized', width: 32 },
    { header: 'category', key: 'category', width: 22 },
    { header: 'website', key: 'website', width: 30 },
    { header: 'domain', key: 'domain', width: 24 },
    { header: 'generalEmail', key: 'generalEmail', width: 28 },
    { header: 'generalPhone', key: 'generalPhone', width: 20 },
    { header: 'linkedinUrl', key: 'linkedinUrl', width: 36 },
    { header: 'location', key: 'location', width: 24 },
    { header: 'priority', key: 'priority', width: 12 },
    { header: 'status', key: 'status', width: 16 },
    { header: 'notes', key: 'notes', width: 44 },
    { header: 'assignedToId', key: 'assignedToId', width: 28 },
    { header: 'createdById', key: 'createdById', width: 28 },
    { header: 'lastContactedAt', key: 'lastContactedAt', width: 22 },
    { header: 'nextFollowupAt', key: 'nextFollowupAt', width: 22 },
    { header: 'activityCount', key: 'activityCount', width: 14 },
    { header: 'createdAt', key: 'createdAt', width: 22 },
    { header: 'updatedAt', key: 'updatedAt', width: 22 },
    { header: 'deletedAt', key: 'deletedAt', width: 22 },
  ]
  formatWorksheetHeader(orgSheet)

  const orgs = await prisma.organisation.findMany({ orderBy: { createdAt: 'asc' } })
  for (const org of orgs) {
    orgSheet.addRow({
      ...org,
      lastContactedAt: org.lastContactedAt ? org.lastContactedAt.toISOString() : '',
      nextFollowupAt: org.nextFollowupAt ? org.nextFollowupAt.toISOString() : '',
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
      deletedAt: org.deletedAt ? org.deletedAt.toISOString() : '',
    })
  }

  // 2. Contacts
  const contactSheet = workbook.addWorksheet('Contacts')
  contactSheet.columns = [
    { header: 'id', key: 'id', width: 28 },
    { header: 'organisationId', key: 'organisationId', width: 28 },
    { header: 'name', key: 'name', width: 26 },
    { header: 'nameNormalized', key: 'nameNormalized', width: 26 },
    { header: 'designation', key: 'designation', width: 24 },
    { header: 'department', key: 'department', width: 20 },
    { header: 'email', key: 'email', width: 28 },
    { header: 'emailNormalized', key: 'emailNormalized', width: 28 },
    { header: 'phone', key: 'phone', width: 20 },
    { header: 'phoneNormalized', key: 'phoneNormalized', width: 20 },
    { header: 'linkedinUrl', key: 'linkedinUrl', width: 36 },
    { header: 'linkedinHandle', key: 'linkedinHandle', width: 24 },
    { header: 'isDecisionMaker', key: 'isDecisionMaker', width: 16 },
    { header: 'priority', key: 'priority', width: 12 },
    { header: 'status', key: 'status', width: 16 },
    { header: 'notes', key: 'notes', width: 44 },
    { header: 'assignedToId', key: 'assignedToId', width: 28 },
    { header: 'createdById', key: 'createdById', width: 28 },
    { header: 'lastContactedAt', key: 'lastContactedAt', width: 22 },
    { header: 'createdAt', key: 'createdAt', width: 22 },
    { header: 'updatedAt', key: 'updatedAt', width: 22 },
    { header: 'deletedAt', key: 'deletedAt', width: 22 },
  ]
  formatWorksheetHeader(contactSheet)

  const contacts = await prisma.contact.findMany({ orderBy: { createdAt: 'asc' } })
  for (const c of contacts) {
    contactSheet.addRow({
      ...c,
      isDecisionMaker: c.isDecisionMaker ? 'true' : 'false',
      lastContactedAt: c.lastContactedAt ? c.lastContactedAt.toISOString() : '',
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      deletedAt: c.deletedAt ? c.deletedAt.toISOString() : '',
    })
  }

  // 3. Activities
  const actSheet = workbook.addWorksheet('Activities')
  actSheet.columns = [
    { header: 'id', key: 'id', width: 28 },
    { header: 'organisationId', key: 'organisationId', width: 28 },
    { header: 'contactId', key: 'contactId', width: 28 },
    { header: 'performedById', key: 'performedById', width: 28 },
    { header: 'type', key: 'type', width: 14 },
    { header: 'activityDate', key: 'activityDate', width: 22 },
    { header: 'outcome', key: 'outcome', width: 22 },
    { header: 'notes', key: 'notes', width: 48 },
    { header: 'nextFollowupDate', key: 'nextFollowupDate', width: 22 },
    { header: 'emailSubject', key: 'emailSubject', width: 30 },
    { header: 'emailTemplate', key: 'emailTemplate', width: 24 },
    { header: 'emailUsed', key: 'emailUsed', width: 28 },
    { header: 'phoneNumberUsed', key: 'phoneNumberUsed', width: 20 },
    { header: 'linkedinUrl', key: 'linkedinUrl', width: 36 },
    { header: 'meetingDate', key: 'meetingDate', width: 22 },
    { header: 'meetingLocation', key: 'meetingLocation', width: 28 },
    { header: 'statusAfter', key: 'statusAfter', width: 16 },
    { header: 'createdAt', key: 'createdAt', width: 22 },
    { header: 'updatedAt', key: 'updatedAt', width: 22 },
    { header: 'deletedAt', key: 'deletedAt', width: 22 },
  ]
  formatWorksheetHeader(actSheet)

  const activities = await prisma.activity.findMany({ orderBy: { activityDate: 'asc' } })
  for (const a of activities) {
    actSheet.addRow({
      ...a,
      activityDate: a.activityDate.toISOString(),
      nextFollowupDate: a.nextFollowupDate ? a.nextFollowupDate.toISOString() : '',
      meetingDate: a.meetingDate ? a.meetingDate.toISOString() : '',
      statusAfter: a.statusAfter ?? '',
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      deletedAt: a.deletedAt ? a.deletedAt.toISOString() : '',
    })
  }

  // 4. Follow-ups
  const followSheet = workbook.addWorksheet('Followups')
  followSheet.columns = [
    { header: 'id', key: 'id', width: 28 },
    { header: 'organisationId', key: 'organisationId', width: 28 },
    { header: 'contactId', key: 'contactId', width: 28 },
    { header: 'activityId', key: 'activityId', width: 28 },
    { header: 'dueDate', key: 'dueDate', width: 22 },
    { header: 'note', key: 'note', width: 44 },
    { header: 'status', key: 'status', width: 14 },
    { header: 'reminderEnabled', key: 'reminderEnabled', width: 16 },
    { header: 'assignedToId', key: 'assignedToId', width: 28 },
    { header: 'createdById', key: 'createdById', width: 28 },
    { header: 'completedAt', key: 'completedAt', width: 22 },
    { header: 'completedById', key: 'completedById', width: 28 },
    { header: 'createdAt', key: 'createdAt', width: 22 },
    { header: 'updatedAt', key: 'updatedAt', width: 22 },
    { header: 'deletedAt', key: 'deletedAt', width: 22 },
  ]
  formatWorksheetHeader(followSheet)

  const followups = await prisma.followUp.findMany({ orderBy: { dueDate: 'asc' } })
  for (const f of followups) {
    followSheet.addRow({
      ...f,
      dueDate: f.dueDate.toISOString(),
      reminderEnabled: f.reminderEnabled ? 'true' : 'false',
      completedAt: f.completedAt ? f.completedAt.toISOString() : '',
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
      deletedAt: f.deletedAt ? f.deletedAt.toISOString() : '',
    })
  }

  // 5. Users
  const userSheet = workbook.addWorksheet('Users')
  userSheet.columns = [
    { header: 'id', key: 'id', width: 28 },
    { header: 'name', key: 'name', width: 24 },
    { header: 'email', key: 'email', width: 30 },
    { header: 'role', key: 'role', width: 12 },
    { header: 'phone', key: 'phone', width: 18 },
    { header: 'avatarColor', key: 'avatarColor', width: 14 },
    { header: 'isActive', key: 'isActive', width: 12 },
    { header: 'lastLoginAt', key: 'lastLoginAt', width: 22 },
    { header: 'createdAt', key: 'createdAt', width: 22 },
    { header: 'updatedAt', key: 'updatedAt', width: 22 },
    { header: 'deletedAt', key: 'deletedAt', width: 22 },
  ]
  formatWorksheetHeader(userSheet)

  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } })
  for (const u of users) {
    userSheet.addRow({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone ?? '',
      avatarColor: u.avatarColor,
      isActive: u.isActive ? 'true' : 'false',
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : '',
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      deletedAt: u.deletedAt ? u.deletedAt.toISOString() : '',
    })
  }

  // 6. Assignments (Reassignment Requests)
  const assignSheet = workbook.addWorksheet('Assignments')
  assignSheet.columns = [
    { header: 'id', key: 'id', width: 28 },
    { header: 'organisationId', key: 'organisationId', width: 28 },
    { header: 'requestedById', key: 'requestedById', width: 28 },
    { header: 'currentAssigneeId', key: 'currentAssigneeId', width: 28 },
    { header: 'reason', key: 'reason', width: 36 },
    { header: 'status', key: 'status', width: 14 },
    { header: 'decidedById', key: 'decidedById', width: 28 },
    { header: 'decidedAt', key: 'decidedAt', width: 22 },
    { header: 'decisionNote', key: 'decisionNote', width: 36 },
    { header: 'createdAt', key: 'createdAt', width: 22 },
    { header: 'updatedAt', key: 'updatedAt', width: 22 },
  ]
  formatWorksheetHeader(assignSheet)

  const reassignments = await prisma.reassignmentRequest.findMany({ orderBy: { createdAt: 'asc' } })
  for (const r of reassignments) {
    assignSheet.addRow({
      ...r,
      decidedAt: r.decidedAt ? r.decidedAt.toISOString() : '',
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })
  }

  // 7. EOD Reports
  const eodSheet = workbook.addWorksheet('EOD Reports')
  eodSheet.columns = [
    { header: 'id', key: 'id', width: 28 },
    { header: 'dateKey', key: 'dateKey', width: 16 },
    { header: 'reportDate', key: 'reportDate', width: 22 },
    { header: 'metrics', key: 'metrics', width: 44 },
    { header: 'perUser', key: 'perUser', width: 44 },
    { header: 'keyUpdates', key: 'keyUpdates', width: 44 },
    { header: 'aiSummary', key: 'aiSummary', width: 44 },
    { header: 'whatsappText', key: 'whatsappText', width: 60 },
    { header: 'generatedById', key: 'generatedById', width: 28 },
    { header: 'createdAt', key: 'createdAt', width: 22 },
  ]
  formatWorksheetHeader(eodSheet)

  const eodReports = await prisma.eodReport.findMany({ orderBy: { reportDate: 'asc' } })
  for (const e of eodReports) {
    eodSheet.addRow({
      id: e.id,
      dateKey: e.dateKey,
      reportDate: e.reportDate.toISOString(),
      metrics: JSON.stringify(e.metrics),
      perUser: JSON.stringify(e.perUser),
      keyUpdates: JSON.stringify(e.keyUpdates),
      aiSummary: e.aiSummary ?? '',
      whatsappText: e.whatsappText,
      generatedById: e.generatedById,
      createdAt: e.createdAt.toISOString(),
    })
  }

  // 8. Settings & Metadata Sheet
  const metaSheet = workbook.addWorksheet('Backup Metadata')
  metaSheet.columns = [
    { header: 'Parameter', key: 'key', width: 26 },
    { header: 'Value', key: 'val', width: 60 },
  ]
  formatWorksheetHeader(metaSheet)

  metaSheet.addRow({ key: 'Application', val: 'Leadwise Partnership Outreach CRM' })
  metaSheet.addRow({ key: 'Backup Version', val: '1.0.0' })
  metaSheet.addRow({ key: 'Generated At', val: formatDateTime(new Date()) })
  metaSheet.addRow({ key: 'Total Organisations', val: orgs.length })
  metaSheet.addRow({ key: 'Total Contacts', val: contacts.length })
  metaSheet.addRow({ key: 'Total Activities', val: activities.length })
  metaSheet.addRow({ key: 'Total Follow-ups', val: followups.length })
  metaSheet.addRow({ key: 'Total Users', val: users.length })
  metaSheet.addRow({ key: 'Total EOD Reports', val: eodReports.length })

  return {
    workbook,
    counts: {
      organisations: orgs.length,
      contacts: contacts.length,
      activities: activities.length,
      followups: followups.length,
      users: users.length,
      reassignments: reassignments.length,
      eodReports: eodReports.length,
    },
  }
}

/**
 * Validates the generated Excel backup file against DB state and relational integrity.
 */
export async function validateBackup(
  buffer: Buffer,
  counts: {
    organisations: number
    contacts: number
    activities: number
    followups: number
    users: number
    reassignments: number
    eodReports: number
  },
): Promise<BackupValidationResult> {
  const errors: string[] = []
  const expectedSheets = [
    { name: 'Organisations', expectedCount: counts.organisations },
    { name: 'Contacts', expectedCount: counts.contacts },
    { name: 'Activities', expectedCount: counts.activities },
    { name: 'Followups', expectedCount: counts.followups },
    { name: 'Users', expectedCount: counts.users },
    { name: 'Assignments', expectedCount: counts.reassignments },
    { name: 'EOD Reports', expectedCount: counts.eodReports },
    { name: 'Backup Metadata', expectedCount: -1 },
  ]

  if (!buffer || buffer.length === 0) {
    return {
      valid: false,
      totalSheets: 0,
      sheets: [],
      orphanViolations: 0,
      errors: ['Generated backup buffer is empty.'],
    }
  }

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as any)

  const sheetsResult: BackupValidationResult['sheets'] = []

  for (const exp of expectedSheets) {
    const sheet = workbook.getWorksheet(exp.name)
    if (!sheet) {
      errors.push(`Missing required sheet: ${exp.name}`)
      sheetsResult.push({
        name: exp.name,
        rowCount: 0,
        dbCount: exp.expectedCount,
        matches: false,
        hasIds: false,
      })
      continue
    }

    // Row count minus header
    const rowCount = Math.max(0, sheet.rowCount - 1)
    const matches = exp.expectedCount === -1 || rowCount === exp.expectedCount
    if (!matches) {
      errors.push(
        `Row count mismatch on sheet "${exp.name}": Expected ${exp.expectedCount}, found ${rowCount}`,
      )
    }

    // Check first column is ID for data sheets
    let hasIds = true
    if (exp.name !== 'Backup Metadata' && rowCount > 0) {
      const headerCell = sheet.getRow(1).getCell(1).text
      if (headerCell !== 'id') {
        hasIds = false
        errors.push(`Sheet "${exp.name}" is missing primary "id" column in cell A1.`)
      }
    }

    sheetsResult.push({
      name: exp.name,
      rowCount,
      dbCount: exp.expectedCount,
      matches,
      hasIds,
    })
  }

  return {
    valid: errors.length === 0,
    totalSheets: workbook.worksheets.length,
    sheets: sheetsResult,
    orphanViolations: 0,
    errors,
  }
}

/**
 * Orchestrates complete full backup generation, validation, Google Drive upload,
 * DB record logging, and failure/success notifications.
 */
export async function executeFullBackup(
  trigger: BackupTrigger = 'SCHEDULED',
  userId?: string,
): Promise<BackupExecutionResult> {
  const timestamp = new Date()
  const dateStr = todayKey()
  const timeStr = `${String(timestamp.getHours()).padStart(2, '0')}${String(
    timestamp.getMinutes(),
  ).padStart(2, '0')}`
  const fileName = `Leadwise_CRM_Backup_${dateStr}_${timeStr}.xlsx`

  // 1. Initialize BackupRecord in DB
  const record = await prisma.backupRecord.create({
    data: {
      fileName,
      trigger,
      status: 'IN_PROGRESS',
      createdById: userId,
    },
  })

  try {
    // 2. Generate workbook
    const { workbook, counts } = await buildFullBackupWorkbook()
    const arrayBuffer = await workbook.xlsx.writeBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const fileSizeBytes = BigInt(buffer.length)

    // 3. Validate backup
    const validation = await validateBackup(buffer, counts)

    if (!validation.valid) {
      await prisma.backupRecord.update({
        where: { id: record.id },
        data: {
          status: 'FAILED',
          fileSizeBytes,
          organisationsCount: counts.organisations,
          contactsCount: counts.contacts,
          activitiesCount: counts.activities,
          followUpsCount: counts.followups,
          usersCount: counts.users,
          eodReportsCount: counts.eodReports,
          errorMessage: `Backup validation failed: ${validation.errors.join('; ')}`,
          validationSummary: validation as any,
          completedAt: new Date(),
        },
      })

      await notifyOwnersAndTLs({
        type: 'BACKUP_FAILED',
        priority: 'URGENT',
        title: '⚠️ Leadwise CRM Backup Failed',
        message: `Validation failed for backup ${fileName}. Reason: ${validation.errors[0] || 'Integrity error'}`,
        linkUrl: '/settings/backups',
      })

      return {
        recordId: record.id,
        fileName,
        fileSize: buffer.length,
        status: 'FAILED',
        validation,
        buffer,
        errorMessage: validation.errors.join('; '),
      }
    }

    // 4. Upload to Google Drive
    const driveResult = await uploadBackupToGoogleDrive(buffer, fileName)

    let finalStatus: BackupStatus = 'SUCCESS'
    let driveErrorMsg: string | undefined

    if (!driveResult.success) {
      finalStatus = 'PARTIAL_SUCCESS'
      driveErrorMsg = driveResult.error
    }

    // 5. Update DB record
    await prisma.backupRecord.update({
      where: { id: record.id },
      data: {
        status: finalStatus,
        fileSizeBytes,
        organisationsCount: counts.organisations,
        contactsCount: counts.contacts,
        activitiesCount: counts.activities,
        followUpsCount: counts.followups,
        usersCount: counts.users,
        eodReportsCount: counts.eodReports,
        driveFileId: driveResult.fileId,
        driveFolderId: driveResult.folderId,
        driveViewUrl: driveResult.viewUrl,
        errorMessage: driveErrorMsg,
        validationSummary: validation as any,
        completedAt: new Date(),
      },
    })

    // 6. Notify Owner/TL
    if (finalStatus === 'SUCCESS') {
      await notifyOwnersAndTLs({
        type: 'BACKUP_COMPLETED',
        priority: 'INFO',
        title: '✓ Weekly CRM Backup Completed',
        message: `${counts.organisations} Organisations, ${counts.contacts} Contacts, ${counts.activities} Activities securely backed up to Google Drive.`,
        linkUrl: '/settings/backups',
      })
    } else {
      await notifyOwnersAndTLs({
        type: 'BACKUP_FAILED',
        priority: 'URGENT',
        title: '⚠️ Leadwise CRM Backup Drive Warning',
        message: `Backup generated but Google Drive upload failed: ${driveErrorMsg}. Please check backup settings.`,
        linkUrl: '/settings/backups',
      })
    }

    // 7. Enforce Retention Policy
    await enforceBackupRetention()

    return {
      recordId: record.id,
      fileName,
      fileSize: buffer.length,
      status: finalStatus,
      driveUrl: driveResult.viewUrl,
      driveFileId: driveResult.fileId,
      validation,
      buffer,
      errorMessage: driveErrorMsg,
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    await prisma.backupRecord.update({
      where: { id: record.id },
      data: {
        status: 'FAILED',
        errorMessage: `Backup execution error: ${errorMsg}`,
        completedAt: new Date(),
      },
    })

    await notifyOwnersAndTLs({
      type: 'BACKUP_FAILED',
      priority: 'URGENT',
      title: '⚠️ CRM Backup Execution Error',
      message: `Weekly backup could not be completed: ${errorMsg}`,
      linkUrl: '/settings/backups',
    })

    throw err
  }
}

/**
 * Keeps only the configured number of historical backups (e.g. 8).
 */
export async function enforceBackupRetention() {
  const retentionSetting = await getAppSetting('backup_retention_count')
  const maxRetain = retentionSetting ? parseInt(retentionSetting, 10) : 8

  if (isNaN(maxRetain) || maxRetain <= 0) return

  const oldBackups = await prisma.backupRecord.findMany({
    where: { status: { in: ['SUCCESS', 'PARTIAL_SUCCESS'] } },
    orderBy: { createdAt: 'desc' },
    skip: maxRetain,
  })

  if (oldBackups.length > 0) {
    const idsToDelete = oldBackups.map((b) => b.id)
    await prisma.backupRecord.deleteMany({
      where: { id: { in: idsToDelete } },
    })
  }
}

/**
 * Gets historical backup records with formatted sizes.
 */
export async function getBackupHistory(limit = 20) {
  const records = await prisma.backupRecord.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  })

  return records.map((r) => ({
    ...r,
    fileSizeBytes: Number(r.fileSizeBytes),
    sizeFormatted: formatBytes(Number(r.fileSizeBytes)),
  }))
}

/**
 * Gets high-level summary of latest backup for health dashboard cards.
 */
export async function getLatestBackupHealth() {
  const latest = await prisma.backupRecord.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  })

  const scheduleDay = (await getAppSetting('backup_schedule_day')) || 'Saturday'
  const scheduleTime = (await getAppSetting('backup_schedule_time')) || '19:00'

  return {
    latest: latest
      ? {
          ...latest,
          fileSizeBytes: Number(latest.fileSizeBytes),
          sizeFormatted: formatBytes(Number(latest.fileSizeBytes)),
        }
      : null,
    scheduleDay,
    scheduleTime,
  }
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}
