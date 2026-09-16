import { prisma } from '@/lib/db'
import type { CurrentUser } from '@/lib/auth/current-user'
import ExcelJS from 'exceljs'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { executeFullBackup } from './backup'
import type {
  Role,
  OrgStatus,
  ContactStatus,
  Priority,
  ActivityType,
  ActivityOutcome,
  FollowUpStatus,
  ReassignmentStatus,
  ConversationType,
  UserStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client'
import {
  importEncryptedCredentials,
  applyRestoredCredentials,
} from './credentials-backup'

export type RestoreMode = 'MISSING_ONLY' | 'EXACT_OVERWRITE'

export interface SheetValidationDetail {
  name: string
  rowsInFile: number
  newRows: number
  existingRows: number
  orphanRows: number
  warnings: string[]
}

export interface RestorePreview {
  valid: boolean
  totalSheets: number
  foundSheets: string[]
  missingSheets: string[]
  counts: {
    users: number
    organisations: number
    contacts: number
    activities: number
    followups: number
    assignments: number
    eodReports: number
    tags: number
    templates: number
    auditLogs: number
    organisationTags: number
    contactTags: number
    comments: number
    attachments: number
    conversations: number
    conversationMembers: number
    messages: number
  }
  newRecordsCount: number
  existingRecordsCount: number
  foreignKeyOrphansCount: number
  sheetDetails: SheetValidationDetail[]
  roleConflicts?: Array<{ email: string; dbRole: string; fileRole: string; note: string }>
  warnings: string[]
  errors: string[]
}

export interface RestoreExecutionResult {
  success: boolean
  mode: RestoreMode
  preRestoreBackupFile?: string
  restored: {
    users: number
    tags: number
    templates: number
    organisations: number
    contacts: number
    organisationTags: number
    contactTags: number
    activities: number
    followups: number
    assignments: number
    comments: number
    attachments: number
    conversations: number
    conversationMembers: number
    messages: number
    eodReports: number
    auditLogs: number
  }
  restoredCredentials?: number
  skippedExisting: number
  totalProcessed: number
  message: string
}

const REQUIRED_RESTORE_SHEETS = [
  'Organisations',
  'Contacts',
  'Activities',
  'Followups',
  'Users',
]

// ── Parsing Helpers ──────────────────────────────────────────────────────────

function parseDate(val: unknown): Date | null {
  if (!val) return null
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val
  if (typeof val === 'number') {
    // Excel numeric date timestamp
    const date = new Date(Math.round((val - 25569) * 86400 * 1000))
    return isNaN(date.getTime()) ? null : date
  }
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

function parseJsonVal<T = any>(val: unknown, defaultVal: T): T {
  if (!val) return defaultVal
  if (typeof val === 'object') return val as T
  try {
    return JSON.parse(String(val))
  } catch {
    return defaultVal
  }
}

// ── Validation & Dry-Run Preview ─────────────────────────────────────────────

export async function validateAndPreviewRestore(
  buffer: Buffer,
  prismaClient: PrismaClient = prisma,
): Promise<RestorePreview> {
  const errors: string[] = []
  const warnings: string[] = []

  if (!buffer || buffer.length === 0) {
    return {
      valid: false,
      totalSheets: 0,
      foundSheets: [],
      missingSheets: REQUIRED_RESTORE_SHEETS,
      counts: {
        users: 0,
        organisations: 0,
        contacts: 0,
        activities: 0,
        followups: 0,
        assignments: 0,
        eodReports: 0,
        tags: 0,
        templates: 0,
        auditLogs: 0,
        organisationTags: 0,
        contactTags: 0,
        comments: 0,
        attachments: 0,
        conversations: 0,
        conversationMembers: 0,
        messages: 0,
      },
      newRecordsCount: 0,
      existingRecordsCount: 0,
      foreignKeyOrphansCount: 0,
      sheetDetails: [],
      warnings: [],
      errors: ['The uploaded backup file is empty.'],
    }
  }

  const workbook = new ExcelJS.Workbook()
  try {
    await workbook.xlsx.load(buffer as any)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      valid: false,
      totalSheets: 0,
      foundSheets: [],
      missingSheets: REQUIRED_RESTORE_SHEETS,
      counts: {
        users: 0,
        organisations: 0,
        contacts: 0,
        activities: 0,
        followups: 0,
        assignments: 0,
        eodReports: 0,
        tags: 0,
        templates: 0,
        auditLogs: 0,
        organisationTags: 0,
        contactTags: 0,
        comments: 0,
        attachments: 0,
        conversations: 0,
        conversationMembers: 0,
        messages: 0,
      },
      newRecordsCount: 0,
      existingRecordsCount: 0,
      foreignKeyOrphansCount: 0,
      sheetDetails: [],
      warnings: [],
      errors: [`Corrupted or invalid Excel (.xlsx) file: ${msg}`],
    }
  }

  const foundSheets: string[] = []
  workbook.eachSheet((ws) => {
    foundSheets.push(ws.name)
  })

  const missingSheets = REQUIRED_RESTORE_SHEETS.filter((s) => !foundSheets.includes(s))
  if (missingSheets.length > 0) {
    errors.push(`Missing mandatory relational sheets: ${missingSheets.join(', ')}`)
  }

  const getRows = (sheetName: string) => {
    const ws = workbook.getWorksheet(sheetName)
    if (!ws || ws.rowCount <= 1) return []
    return ws.getRows(2, ws.rowCount - 1) || []
  }

  // Pre-fetch existing database IDs to detect conflicts and duplicates (batched for exact TS tuple typing)
  const [dbUsers, dbOrgs, dbContacts, dbTags, dbActivities, dbFollowups] = await Promise.all([
    prismaClient.user.findMany({ select: { id: true, name: true, email: true, role: true, isActive: true } }),
    prismaClient.organisation.findMany({ select: { id: true } }),
    prismaClient.contact.findMany({ select: { id: true, organisationId: true } }),
    prismaClient.tag.findMany({ select: { id: true, name: true } }),
    prismaClient.activity.findMany({ select: { id: true } }),
    prismaClient.followUp.findMany({ select: { id: true } }),
  ])

  const [dbAssignments, dbComments, dbAttachments, dbConversations, dbEodReports, dbAuditLogs] = await Promise.all([
    prismaClient.reassignmentRequest.findMany({ select: { id: true } }),
    prismaClient.comment.findMany({ select: { id: true } }),
    prismaClient.attachment.findMany({ select: { id: true } }),
    prismaClient.conversation.findMany({ select: { id: true } }),
    prismaClient.eodReport.findMany({ select: { id: true, dateKey: true } }),
    prismaClient.auditLog.findMany({ select: { id: true } }),
  ])

  const dbUserIdSet = new Set(dbUsers.map((u) => u.id))
  const dbUserIdMap = new Map(dbUsers.map((u) => [u.id, u]))
  const dbUserEmailMap = new Map(dbUsers.map((u) => [u.email.toLowerCase(), u]))
  const dbOrgIdSet = new Set(dbOrgs.map((o) => o.id))
  const dbContactIdSet = new Set(dbContacts.map((c) => c.id))
  const dbTagIdSet = new Set(dbTags.map((t) => t.id))
  const dbActivityIdSet = new Set(dbActivities.map((a) => a.id))
  const dbFollowupIdSet = new Set(dbFollowups.map((f) => f.id))
  const dbAssignmentIdSet = new Set(dbAssignments.map((r) => r.id))
  const dbCommentIdSet = new Set(dbComments.map((c) => c.id))
  const dbAttachmentIdSet = new Set(dbAttachments.map((a) => a.id))
  const dbConversationIdSet = new Set(dbConversations.map((c) => c.id))
  const dbEodIdSet = new Set(dbEodReports.map((e) => e.id))
  const dbAuditIdSet = new Set(dbAuditLogs.map((a) => a.id))

  const roleConflicts: Array<{ email: string; dbRole: string; fileRole: string; note: string }> = []

  // Collect IDs present inside the backup workbook to validate cross-sheet integrity
  const fileUserIdSet = new Set<string>()
  for (const row of getRows('Users')) {
    const id = String(row.getCell(1).text || '').trim()
    if (id) fileUserIdSet.add(id)
  }

  const fileOrgIdSet = new Set<string>()
  for (const row of getRows('Organisations')) {
    const id = String(row.getCell(1).text || '').trim()
    if (id) fileOrgIdSet.add(id)
  }

  const fileTagIdSet = new Set<string>()
  for (const row of getRows('Tags')) {
    const id = String(row.getCell(1).text || '').trim()
    if (id) fileTagIdSet.add(id)
  }

  const fileContactIdSet = new Set<string>()
  for (const row of getRows('Contacts')) {
    const id = String(row.getCell(1).text || '').trim()
    if (id) fileContactIdSet.add(id)
  }

  const fileConversationIdSet = new Set<string>()
  for (const row of getRows('Conversations')) {
    const id = String(row.getCell(1).text || '').trim()
    if (id) fileConversationIdSet.add(id)
  }

  // Union sets for foreign-key checking: ID is valid if it exists either in DB or in the file
  const validUserIds = new Set([...dbUserIdSet, ...fileUserIdSet])
  const validOrgIds = new Set([...dbOrgIdSet, ...fileOrgIdSet])
  const validContactIds = new Set([...dbContactIdSet, ...fileContactIdSet])
  const validTagIds = new Set([...dbTagIdSet, ...fileTagIdSet])
  const validConvIds = new Set([...dbConversationIdSet, ...fileConversationIdSet])

  let totalNew = 0
  let totalExisting = 0
  let totalOrphans = 0
  const sheetDetails: SheetValidationDetail[] = []

  // 1. Inspect Users
  {
    const rows = getRows('Users')
    let newRows = 0
    let existingRows = 0
    let fileActiveOwners = 0
    const sheetWarns: string[] = []

    for (const row of rows) {
      const id = String(row.getCell(1).text || '').trim()
      const email = String(row.getCell(3).text || '').trim().toLowerCase()
      const fileRole = String(row.getCell(4).text || 'INTERN').trim()
      const col5 = String(row.getCell(5).text || '').trim()
      const isStatusInCol5 = ['APPROVED', 'PENDING', 'REJECTED', 'DISCONTINUED'].includes(col5)
      const isActive = isStatusInCol5
        ? parseBool(row.getCell(8).value, true)
        : parseBool(row.getCell(7).value, true)

      if (fileRole === 'OWNER' && isActive) {
        fileActiveOwners++
      }

      if (!id || !email) continue

      // Match by original ID first, then fallback to email
      const matchedDbUser = dbUserIdMap.get(id) || dbUserEmailMap.get(email)
      if (matchedDbUser) {
        existingRows++
        if (matchedDbUser.role !== fileRole) {
          const note = `User "${matchedDbUser.name}" (${email}) has role '${matchedDbUser.role}' in database but '${fileRole}' in backup file.`
          roleConflicts.push({
            email,
            dbRole: matchedDbUser.role,
            fileRole,
            note,
          })
          if (sheetWarns.length < 5) {
            sheetWarns.push(`Role conflict: ${note}`)
          }
        }
      } else {
        newRows++
      }
    }

    const dbActiveOwners = Array.from(dbUserIdMap.values()).filter(
      (u) => u.role === 'OWNER' && u.isActive,
    ).length
    if (fileActiveOwners === 0 && dbActiveOwners === 0) {
      errors.push('Backup workbook does not contain any active OWNER accounts and database has no active OWNERs. Restoration cannot reduce active OWNER count to zero.')
    } else if (fileActiveOwners === 0) {
      warnings.push('Backup workbook does not contain any active OWNER accounts. Exact restore could demote existing administrative access.')
    }

    sheetDetails.push({
      name: 'Users',
      rowsInFile: rows.length,
      newRows,
      existingRows,
      orphanRows: 0,
      warnings: sheetWarns,
    })
    totalNew += newRows
    totalExisting += existingRows
  }

  // 2. Inspect Organisations
  {
    const rows = getRows('Organisations')
    let newRows = 0
    let existingRows = 0
    let orphanRows = 0
    const sheetWarns: string[] = []

    for (const row of rows) {
      const id = String(row.getCell(1).text || '').trim()
      const assignedToId = String(row.getCell(22).text || row.getCell(14).text || '').trim()
      if (!id) continue
      if (dbOrgIdSet.has(id)) existingRows++
      else newRows++

      if (assignedToId && !validUserIds.has(assignedToId)) {
        orphanRows++
        if (sheetWarns.length < 5) {
          sheetWarns.push(`Org ${id}: assignedToId "${assignedToId}" not found in users.`)
        }
      }
    }
    sheetDetails.push({
      name: 'Organisations',
      rowsInFile: rows.length,
      newRows,
      existingRows,
      orphanRows,
      warnings: sheetWarns,
    })
    totalNew += newRows
    totalExisting += existingRows
    totalOrphans += orphanRows
  }

  // 3. Inspect Contacts
  {
    const rows = getRows('Contacts')
    let newRows = 0
    let existingRows = 0
    let orphanRows = 0
    const sheetWarns: string[] = []

    for (const row of rows) {
      const id = String(row.getCell(1).text || '').trim()
      const orgId = String(row.getCell(2).text || '').trim()
      if (!id) continue
      if (dbContactIdSet.has(id)) existingRows++
      else newRows++

      if (orgId && !validOrgIds.has(orgId)) {
        orphanRows++
        if (sheetWarns.length < 5) {
          sheetWarns.push(`Contact ${id}: organisationId "${orgId}" does not exist.`)
        }
      }
    }
    sheetDetails.push({
      name: 'Contacts',
      rowsInFile: rows.length,
      newRows,
      existingRows,
      orphanRows,
      warnings: sheetWarns,
    })
    totalNew += newRows
    totalExisting += existingRows
    totalOrphans += orphanRows
  }

  // 4. Inspect Activities
  {
    const rows = getRows('Activities')
    let newRows = 0
    let existingRows = 0
    let orphanRows = 0
    const sheetWarns: string[] = []

    for (const row of rows) {
      const id = String(row.getCell(1).text || '').trim()
      const orgId = String(row.getCell(2).text || '').trim()
      const performedById = String(row.getCell(4).text || '').trim()
      if (!id) continue
      if (dbActivityIdSet.has(id)) existingRows++
      else newRows++

      if (orgId && !validOrgIds.has(orgId)) {
        orphanRows++
      }
      if (performedById && !validUserIds.has(performedById)) {
        orphanRows++
      }
    }
    sheetDetails.push({
      name: 'Activities',
      rowsInFile: rows.length,
      newRows,
      existingRows,
      orphanRows,
      warnings: sheetWarns,
    })
    totalNew += newRows
    totalExisting += existingRows
    totalOrphans += orphanRows
  }

  // 5. Inspect Followups
  {
    const rows = getRows('Followups')
    let newRows = 0
    let existingRows = 0
    let orphanRows = 0
    const sheetWarns: string[] = []

    for (const row of rows) {
      const id = String(row.getCell(1).text || '').trim()
      const orgId = String(row.getCell(2).text || '').trim()
      if (!id) continue
      if (dbFollowupIdSet.has(id)) existingRows++
      else newRows++

      if (orgId && !validOrgIds.has(orgId)) {
        orphanRows++
      }
    }
    sheetDetails.push({
      name: 'Followups',
      rowsInFile: rows.length,
      newRows,
      existingRows,
      orphanRows,
      warnings: sheetWarns,
    })
    totalNew += newRows
    totalExisting += existingRows
    totalOrphans += orphanRows
  }

  // 6. Inspect Assignments (Reassignment Requests)
  {
    const rows = getRows('Assignments')
    let newRows = 0
    let existingRows = 0
    let orphanRows = 0
    const sheetWarns: string[] = []

    for (const row of rows) {
      const id = String(row.getCell(1).text || '').trim()
      const orgId = String(row.getCell(2).text || '').trim()
      const reqId = String(row.getCell(3).text || '').trim()
      const currId = String(row.getCell(4).text || '').trim()
      if (!id) continue
      if (dbAssignmentIdSet.has(id)) existingRows++
      else newRows++

      if (orgId && !validOrgIds.has(orgId)) orphanRows++
      if ((reqId && !validUserIds.has(reqId)) || (currId && !validUserIds.has(currId))) orphanRows++
    }
    sheetDetails.push({
      name: 'Assignments',
      rowsInFile: rows.length,
      newRows,
      existingRows,
      orphanRows,
      warnings: sheetWarns,
    })
    totalNew += newRows
    totalExisting += existingRows
    totalOrphans += orphanRows
  }

  // 7. Inspect Tags
  {
    const rows = getRows('Tags')
    let newRows = 0
    let existingRows = 0
    for (const row of rows) {
      const id = String(row.getCell(1).text || '').trim()
      if (!id) continue
      if (dbTagIdSet.has(id)) existingRows++
      else newRows++
    }
    sheetDetails.push({
      name: 'Tags',
      rowsInFile: rows.length,
      newRows,
      existingRows,
      orphanRows: 0,
      warnings: [],
    })
    totalNew += newRows
    totalExisting += existingRows
  }

  // 7. Inspect Organisation Tags
  {
    const rows = getRows('Organisation Tags')
    let orphanRows = 0
    const sheetWarns: string[] = []
    for (const row of rows) {
      const orgId = String(row.getCell(1).text || '').trim()
      const tagId = String(row.getCell(2).text || '').trim()
      if (!orgId || !tagId) continue
      if (!validOrgIds.has(orgId) || !validTagIds.has(tagId)) {
        orphanRows++
      }
    }
    sheetDetails.push({
      name: 'Organisation Tags',
      rowsInFile: rows.length,
      newRows: rows.length,
      existingRows: 0,
      orphanRows,
      warnings: sheetWarns,
    })
    totalOrphans += orphanRows
  }

  // 8. Inspect Contact Tags
  {
    const rows = getRows('Contact Tags')
    let orphanRows = 0
    const sheetWarns: string[] = []
    for (const row of rows) {
      const contactId = String(row.getCell(1).text || '').trim()
      const tagId = String(row.getCell(2).text || '').trim()
      if (!contactId || !tagId) continue
      if (!validContactIds.has(contactId) || !validTagIds.has(tagId)) {
        orphanRows++
      }
    }
    sheetDetails.push({
      name: 'Contact Tags',
      rowsInFile: rows.length,
      newRows: rows.length,
      existingRows: 0,
      orphanRows,
      warnings: sheetWarns,
    })
    totalOrphans += orphanRows
  }

  // 9. Inspect Comments
  {
    const rows = getRows('Comments')
    let newRows = 0
    let existingRows = 0
    let orphanRows = 0
    for (const row of rows) {
      const id = String(row.getCell(1).text || '').trim()
      const orgId = String(row.getCell(2).text || '').trim()
      if (!id) continue
      if (dbCommentIdSet.has(id)) existingRows++
      else newRows++
      if (orgId && !validOrgIds.has(orgId)) orphanRows++
    }
    sheetDetails.push({
      name: 'Comments',
      rowsInFile: rows.length,
      newRows,
      existingRows,
      orphanRows,
      warnings: [],
    })
    totalNew += newRows
    totalExisting += existingRows
    totalOrphans += orphanRows
  }

  // 10. Inspect Attachments
  {
    const rows = getRows('Attachments Metadata')
    let newRows = 0
    let existingRows = 0
    let orphanRows = 0
    for (const row of rows) {
      const id = String(row.getCell(1).text || '').trim()
      const orgId = String(row.getCell(2).text || '').trim()
      if (!id) continue
      if (dbAttachmentIdSet.has(id)) existingRows++
      else newRows++
      if (orgId && !validOrgIds.has(orgId)) orphanRows++
    }
    sheetDetails.push({
      name: 'Attachments Metadata',
      rowsInFile: rows.length,
      newRows,
      existingRows,
      orphanRows,
      warnings: [],
    })
    totalNew += newRows
    totalExisting += existingRows
    totalOrphans += orphanRows
  }

  // 11. Inspect Conversations & Messages
  {
    const convRows = getRows('Conversations')
    let convNew = 0
    let convExisting = 0
    for (const row of convRows) {
      const id = String(row.getCell(1).text || '').trim()
      if (!id) continue
      if (dbConversationIdSet.has(id)) convExisting++
      else convNew++
    }
    sheetDetails.push({
      name: 'Conversations',
      rowsInFile: convRows.length,
      newRows: convNew,
      existingRows: convExisting,
      orphanRows: 0,
      warnings: [],
    })
    totalNew += convNew
    totalExisting += convExisting

    const msgRows = getRows('Messages')
    let msgOrphans = 0
    let msgNew = 0
    let msgExisting = 0
    for (const row of msgRows) {
      const id = String(row.getCell(1).text || '').trim()
      const convId = String(row.getCell(2).text || '').trim()
      const senderId = String(row.getCell(3).text || '').trim()
      if (!id) continue
      if (dbActivities.some((a) => a.id === id)) msgExisting++
      else msgNew++
      if ((convId && !validConvIds.has(convId)) || (senderId && !validUserIds.has(senderId))) {
        msgOrphans++
      }
    }
    sheetDetails.push({
      name: 'Messages',
      rowsInFile: msgRows.length,
      newRows: msgNew,
      existingRows: msgExisting,
      orphanRows: msgOrphans,
      warnings: [],
    })
    totalNew += msgNew
    totalExisting += msgExisting
    totalOrphans += msgOrphans
  }

  // 12. Inspect EOD Reports
  {
    const rows = getRows('EOD Reports')
    let newRows = 0
    let existingRows = 0
    for (const row of rows) {
      const id = String(row.getCell(1).text || '').trim()
      if (!id) continue
      if (dbEodIdSet.has(id)) existingRows++
      else newRows++
    }
    sheetDetails.push({
      name: 'EOD Reports',
      rowsInFile: rows.length,
      newRows,
      existingRows,
      orphanRows: 0,
      warnings: [],
    })
    totalNew += newRows
    totalExisting += existingRows
  }

  // 13. Inspect Audit Logs
  {
    const rows = getRows('Audit Logs')
    let newRows = 0
    let existingRows = 0
    for (const row of rows) {
      const id = String(row.getCell(1).text || '').trim()
      if (!id) continue
      if (dbAuditIdSet.has(id)) existingRows++
      else newRows++
    }
    sheetDetails.push({
      name: 'Audit Logs',
      rowsInFile: rows.length,
      newRows,
      existingRows,
      orphanRows: 0,
      warnings: [],
    })
    totalNew += newRows
    totalExisting += existingRows
  }

  if (totalOrphans > 0) {
    warnings.push(`Detected ${totalOrphans} foreign-key orphan reference(s) across sheets. These will be handled safely.`)
  }

  const counts = {
    organisations: getRows('Organisations').length,
    contacts: getRows('Contacts').length,
    activities: getRows('Activities').length,
    followups: getRows('Followups').length,
    users: getRows('Users').length,
    assignments: getRows('Assignments').length,
    eodReports: getRows('EOD Reports').length,
    tags: getRows('Tags').length,
    templates: getRows('Templates').length,
    auditLogs: getRows('Audit Logs').length,
    organisationTags: getRows('Organisation Tags').length,
    contactTags: getRows('Contact Tags').length,
    comments: getRows('Comments').length,
    attachments: getRows('Attachments Metadata').length,
    conversations: getRows('Conversations').length,
    conversationMembers: getRows('Conversation Members').length,
    messages: getRows('Messages').length,
  }

  return {
    valid: errors.length === 0,
    totalSheets: foundSheets.length,
    foundSheets,
    missingSheets,
    counts,
    newRecordsCount: totalNew,
    existingRecordsCount: totalExisting,
    foreignKeyOrphansCount: totalOrphans,
    sheetDetails,
    roleConflicts,
    warnings,
    errors,
  }
}

// ── Execution Engine ─────────────────────────────────────────────────────────

/**
 * Executes a verified, transactional database restoration from an Excel (.xlsx) backup workbook buffer.
 * Restores records in strict topological dependency order.
 */
export async function executeSafeRestore(
  user: CurrentUser | null,
  buffer: Buffer,
  options: {
    mode?: RestoreMode
    preBackup?: boolean
    credentialsBuffer?: Buffer
    credentialsSecret?: string
    prismaClient?: PrismaClient
  } = {},
): Promise<RestoreExecutionResult> {
  const db = options.prismaClient || prisma
  const mode: RestoreMode = options.mode || 'MISSING_ONLY'

  // Strict OWNER authorization check
  if (user && user.role !== 'OWNER') {
    throw new Error('Forbidden: Database restoration is strictly restricted to OWNER.')
  }

  const preview = await validateAndPreviewRestore(buffer, db)
  if (!preview.valid) {
    throw new Error(`Cannot restore backup: ${preview.errors.join('; ')}`)
  }

  // Pre-restore backup snapshot
  let preRestoreBackupFile: string | undefined
  if (options.preBackup !== false) {
    try {
      const preBackupResult = await executeFullBackup('MANUAL', user?.id)
      preRestoreBackupFile = preBackupResult.fileName
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.warn(`[RESTORE WARNING] Pre-restore backup snapshot could not be created: ${errorMsg}`)
    }
  }

  const workbook = new ExcelJS.Workbook()
  await (workbook.xlsx as any).load(buffer)

  const restored = {
    users: 0,
    tags: 0,
    templates: 0,
    organisations: 0,
    contacts: 0,
    organisationTags: 0,
    contactTags: 0,
    activities: 0,
    followups: 0,
    assignments: 0,
    comments: 0,
    attachments: 0,
    conversations: 0,
    conversationMembers: 0,
    messages: 0,
    eodReports: 0,
    auditLogs: 0,
  }

  let skippedExisting = 0
  let restoredCredentialsCount = 0
  const randomFallbackPassword = crypto.randomBytes(24).toString('base64url')
  const defaultPasswordHash = await bcrypt.hash(randomFallbackPassword, 10)

  // Transactional restoration with 120s timeout
  await db.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // 1. Users
      const userSheet = workbook.getWorksheet('Users')
      if (userSheet && userSheet.rowCount > 1) {
        const rows = userSheet.getRows(2, userSheet.rowCount - 1) || []
        for (const row of rows) {
          const id = String(row.getCell(1).text || '').trim()
          const name = String(row.getCell(2).text || '').trim()
          const email = String(row.getCell(3).text || '').trim().toLowerCase()
          const role = String(row.getCell(4).text || 'INTERN').trim() as Role

          const col5 = String(row.getCell(5).text || '').trim()
          const isStatusInCol5 = ['APPROVED', 'PENDING', 'REJECTED', 'DISCONTINUED'].includes(col5)
          const status = (isStatusInCol5 ? col5 : 'APPROVED') as UserStatus
          const phone = isStatusInCol5
            ? (String(row.getCell(6).text || '').trim() || null)
            : (String(row.getCell(5).text || '').trim() || null)
          const avatarColor = isStatusInCol5
            ? String(row.getCell(7).text || 'violet').trim()
            : String(row.getCell(6).text || 'violet').trim()
          const isActive = isStatusInCol5
            ? parseBool(row.getCell(8).value, true)
            : parseBool(row.getCell(7).value, true)
          const lastLoginAt = isStatusInCol5
            ? parseDate(row.getCell(9).value)
            : parseDate(row.getCell(8).value)
          const createdAt =
            (isStatusInCol5 ? parseDate(row.getCell(10).value) : parseDate(row.getCell(9).value)) ||
            new Date()
          const updatedAt =
            (isStatusInCol5 ? parseDate(row.getCell(11).value) : parseDate(row.getCell(10).value)) ||
            new Date()
          const deletedAt = isStatusInCol5
            ? parseDate(row.getCell(12).value)
            : parseDate(row.getCell(11).value)

          if (!id || !email) continue

          // 1. Match by original ID first
          let existing = await tx.user.findUnique({ where: { id } })
          // 2. Controlled fallback: match by email only if ID not matched
          if (!existing) {
            existing = await tx.user.findUnique({ where: { email } })
          }

          if (existing) {
            if (mode === 'EXACT_OVERWRITE') {
              // Safety: Prevent demoting the final remaining active Owner
              const demotingOwner =
                existing.role === 'OWNER' && (role !== 'OWNER' || isActive === false)
              if (demotingOwner) {
                const otherOwners = await tx.user.count({
                  where: {
                    role: 'OWNER',
                    isActive: true,
                    deletedAt: null,
                    id: { not: existing.id },
                  },
                })
                if (otherOwners === 0) {
                  throw new Error(
                    `Cannot demote or deactivate the final active Owner (${existing.name}). At least one active Owner is required.`,
                  )
                }
              }

              // Update fields but PRESERVE existing passwordHash
              await tx.user.update({
                where: { id: existing.id },
                data: {
                  name: name || undefined,
                  role: ['OWNER', 'TL', 'INTERN'].includes(role) ? role : undefined,
                  status: ['APPROVED', 'PENDING', 'REJECTED', 'DISCONTINUED'].includes(status)
                    ? status
                    : undefined,
                  phone: phone || undefined,
                  avatarColor,
                  isActive,
                  lastLoginAt: lastLoginAt || undefined,
                  updatedAt,
                  deletedAt,
                },
              })
              restored.users++
            } else {
              skippedExisting++
            }
          } else {
            await tx.user.create({
              data: {
                id,
                name: name || 'Restored User',
                email,
                role: ['OWNER', 'TL', 'INTERN'].includes(role) ? role : 'INTERN',
                status: ['APPROVED', 'PENDING', 'REJECTED', 'DISCONTINUED'].includes(status)
                  ? status
                  : 'APPROVED',
                phone: phone || undefined,
                avatarColor,
                isActive,
                lastLoginAt,
                passwordHash: defaultPasswordHash,
                createdAt,
                updatedAt,
                deletedAt,
              },
            })
            restored.users++
          }
        }
      }

      // Safety guarantee: Restore cannot reduce active OWNER count to zero
      const activeOwnerCount = await tx.user.count({
        where: { role: 'OWNER', isActive: true, deletedAt: null },
      })
      if (activeOwnerCount === 0) {
        throw new Error(
          'Restore validation failed: Restoration would reduce active OWNER count to zero. At least one active OWNER must exist in the database.',
        )
      }

      // 2. Tags
      const tagSheet = workbook.getWorksheet('Tags')
      if (tagSheet && tagSheet.rowCount > 1) {
        const rows = tagSheet.getRows(2, tagSheet.rowCount - 1) || []
        for (const row of rows) {
          const id = String(row.getCell(1).text || '').trim()
          const name = String(row.getCell(2).text || '').trim()
          const color = String(row.getCell(3).text || 'indigo').trim()
          const isArchived = parseBool(row.getCell(4).value, false)
          const createdById = String(row.getCell(5).text || '').trim() || null
          const createdAt = parseDate(row.getCell(6).value) || new Date()
          const updatedAt = parseDate(row.getCell(7).value) || new Date()

          if (!id || !name) continue

          const existing = await tx.tag.findFirst({
            where: { OR: [{ id }, { name }] },
          })

          if (existing) {
            if (mode === 'EXACT_OVERWRITE') {
              await tx.tag.update({
                where: { id: existing.id },
                data: { color, isArchived, updatedAt },
              })
              restored.tags++
            } else {
              skippedExisting++
            }
          } else {
            await tx.tag.create({
              data: {
                id,
                name,
                color,
                isArchived,
                createdById: createdById || undefined,
                createdAt,
                updatedAt,
              },
            })
            restored.tags++
          }
        }
      }

      // 3. Templates
      const tplSheet = workbook.getWorksheet('Templates')
      if (tplSheet && tplSheet.rowCount > 1) {
        const rows = tplSheet.getRows(2, tplSheet.rowCount - 1) || []
        for (const row of rows) {
          const id = String(row.getCell(1).text || '').trim()
          const title = String(row.getCell(2).text || '').trim()
          const category = String(row.getCell(3).text || 'EMAIL').trim()
          const subcategory = String(row.getCell(4).text || '').trim() || null
          const subject = String(row.getCell(5).text || '').trim() || null
          const body = String(row.getCell(6).text || '').trim()
          const isArchived = parseBool(row.getCell(7).value, false)
          const createdById = String(row.getCell(8).text || '').trim()
          const createdAt = parseDate(row.getCell(9).value) || new Date()
          const updatedAt = parseDate(row.getCell(10).value) || new Date()

          if (!id || !title || !body || !createdById) continue

          const existing = await tx.template.findUnique({ where: { id } })
          if (existing) {
            if (mode === 'EXACT_OVERWRITE') {
              await tx.template.update({
                where: { id },
                data: { title, category, subcategory, subject, body, isArchived, updatedAt },
              })
              restored.templates++
            } else {
              skippedExisting++
            }
          } else {
            await tx.template.create({
              data: { id, title, category, subcategory, subject, body, isArchived, createdById, createdAt, updatedAt },
            })
            restored.templates++
          }
        }
      }

      // 4. Organisations
      const orgSheet = workbook.getWorksheet('Organisations')
      if (orgSheet && orgSheet.rowCount > 1) {
        const rows = orgSheet.getRows(2, orgSheet.rowCount - 1) || []
        for (const row of rows) {
          const id = String(row.getCell(1).text || '').trim()
          const name = String(row.getCell(2).text || '').trim()
          const nameNormalized = String(row.getCell(3).text || name.toLowerCase()).trim()
          const category = String(row.getCell(4).text || '').trim() || null
          const website = String(row.getCell(5).text || '').trim() || null
          const domain = String(row.getCell(6).text || '').trim() || null
          const generalEmail = String(row.getCell(7).text || '').trim() || null
          const generalPhone = String(row.getCell(8).text || '').trim() || null
          const linkedinUrl = String(row.getCell(9).text || '').trim() || null
          const location = String(row.getCell(10).text || '').trim() || null
          const priority = String(row.getCell(11).text || 'MEDIUM').trim() as Priority
          const status = String(row.getCell(12).text || 'NEW').trim() as OrgStatus
          const notes = String(row.getCell(13).text || '').trim() || null

          const nextAction = String(row.getCell(14).text || '').trim() || null
          const leadSource = String(row.getCell(15).text || '').trim() || null
          const leadSourceDetail = String(row.getCell(16).text || '').trim() || null
          const rejectionReason = String(row.getCell(17).text || '').trim() || null
          const rejectionNote = String(row.getCell(18).text || '').trim() || null
          const partnershipStage = String(row.getCell(19).text || '').trim() || null
          const aiScore = row.getCell(20).value ? parseIntVal(row.getCell(20).value) : null
          const customFields = parseJsonVal(row.getCell(21).value, null)

          const assignedToId = String(row.getCell(22).text || '').trim() || null
          const createdById = String(row.getCell(23).text || '').trim() || null
          const lastContactedAt = parseDate(row.getCell(24).value)
          const nextFollowupAt = parseDate(row.getCell(25).value)
          const activityCount = parseIntVal(row.getCell(26).value, 0)
          const createdAt = parseDate(row.getCell(27).value) || new Date()
          const updatedAt = parseDate(row.getCell(28).value) || new Date()
          const deletedAt = parseDate(row.getCell(29).value)

          if (!id || !name) continue

          const existing = await tx.organisation.findUnique({ where: { id } })
          if (existing) {
            if (mode === 'EXACT_OVERWRITE') {
              await tx.organisation.update({
                where: { id },
                data: {
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
                  nextAction,
                  leadSource,
                  leadSourceDetail,
                  rejectionReason,
                  rejectionNote,
                  partnershipStage,
                  aiScore,
                  customFields: customFields ?? undefined,
                  assignedToId: assignedToId || undefined,
                  lastContactedAt,
                  nextFollowupAt,
                  activityCount,
                  updatedAt,
                  deletedAt,
                },
              })
              restored.organisations++
            } else {
              skippedExisting++
            }
          } else {
            const creator = createdById ? await tx.user.findUnique({ where: { id: createdById } }) : null
            const validCreatorId = creator ? creator.id : (await tx.user.findFirst())?.id || 'admin'

            await tx.organisation.create({
              data: {
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
                nextAction,
                leadSource,
                leadSourceDetail,
                rejectionReason,
                rejectionNote,
                partnershipStage,
                aiScore,
                customFields: customFields ?? undefined,
                assignedToId: assignedToId || undefined,
                createdById: validCreatorId,
                lastContactedAt,
                nextFollowupAt,
                activityCount,
                createdAt,
                updatedAt,
                deletedAt,
              },
            })
            restored.organisations++
          }
        }
      }

      // 5. Contacts
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
          const secondaryEmail = String(row.getCell(11).text || '').trim() || null
          const secondaryPhone = String(row.getCell(12).text || '').trim() || null
          const linkedinUrl = String(row.getCell(13).text || '').trim() || null
          const linkedinHandle = String(row.getCell(14).text || '').trim() || null
          const leadSource = String(row.getCell(15).text || '').trim() || null
          const isDecisionMaker = parseBool(row.getCell(16).value, false)
          const priority = String(row.getCell(17).text || 'MEDIUM').trim() as Priority
          const status = String(row.getCell(18).text || 'NEW').trim() as ContactStatus
          const notes = String(row.getCell(19).text || '').trim() || null
          const aiScore = row.getCell(20).value ? parseIntVal(row.getCell(20).value) : null
          const customFields = parseJsonVal(row.getCell(21).value, null)
          const assignedToId = String(row.getCell(22).text || '').trim() || null
          const createdById = String(row.getCell(23).text || '').trim() || null
          const lastContactedAt = parseDate(row.getCell(24).value)
          const createdAt = parseDate(row.getCell(25).value) || new Date()
          const updatedAt = parseDate(row.getCell(26).value) || new Date()
          const deletedAt = parseDate(row.getCell(27).value)

          if (!id || !name || !organisationId) continue

          const orgExists = await tx.organisation.findUnique({ where: { id: organisationId } })
          if (!orgExists) continue

          const existing = await tx.contact.findUnique({ where: { id } })
          if (existing) {
            if (mode === 'EXACT_OVERWRITE') {
              await tx.contact.update({
                where: { id },
                data: {
                  organisationId,
                  name,
                  nameNormalized,
                  designation,
                  department,
                  email,
                  emailNormalized,
                  phone,
                  phoneNormalized,
                  secondaryEmail,
                  secondaryPhone,
                  linkedinUrl,
                  linkedinHandle,
                  leadSource,
                  isDecisionMaker,
                  priority: ['HIGH', 'MEDIUM', 'LOW'].includes(priority) ? priority : undefined,
                  status: ['NEW', 'CONTACTED', 'RESPONDED', 'INTERESTED', 'NOT_INTERESTED', 'UNREACHABLE'].includes(status) ? status : undefined,
                  notes,
                  aiScore,
                  customFields: customFields ?? undefined,
                  assignedToId: assignedToId || undefined,
                  lastContactedAt,
                  updatedAt,
                  deletedAt,
                },
              })
              restored.contacts++
            } else {
              skippedExisting++
            }
          } else {
            const creator = createdById ? await tx.user.findUnique({ where: { id: createdById } }) : null
            const validCreatorId = creator ? creator.id : (await tx.user.findFirst())?.id || 'admin'

            await tx.contact.create({
              data: {
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
                secondaryEmail,
                secondaryPhone,
                linkedinUrl,
                linkedinHandle,
                leadSource,
                isDecisionMaker,
                priority: ['HIGH', 'MEDIUM', 'LOW'].includes(priority) ? priority : 'MEDIUM',
                status: ['NEW', 'CONTACTED', 'RESPONDED', 'INTERESTED', 'NOT_INTERESTED', 'UNREACHABLE'].includes(status) ? status : 'NEW',
                notes,
                aiScore,
                customFields: customFields ?? undefined,
                assignedToId: assignedToId || undefined,
                createdById: validCreatorId,
                lastContactedAt,
                createdAt,
                updatedAt,
                deletedAt,
              },
            })
            restored.contacts++
          }
        }
      }

      // 6. Organisation Tags
      const orgTagSheet = workbook.getWorksheet('Organisation Tags')
      if (orgTagSheet && orgTagSheet.rowCount > 1) {
        const rows = orgTagSheet.getRows(2, orgTagSheet.rowCount - 1) || []
        for (const row of rows) {
          const organisationId = String(row.getCell(1).text || '').trim()
          const tagId = String(row.getCell(2).text || '').trim()
          if (!organisationId || !tagId) continue

          const [orgExists, tagExists] = await Promise.all([
            tx.organisation.findUnique({ where: { id: organisationId } }),
            tx.tag.findUnique({ where: { id: tagId } }),
          ])
          if (!orgExists || !tagExists) continue

          const existing = await tx.organisationTag.findUnique({
            where: { organisationId_tagId: { organisationId, tagId } },
          })
          if (!existing) {
            await tx.organisationTag.create({
              data: { organisationId, tagId },
            })
            restored.organisationTags++
          } else {
            skippedExisting++
          }
        }
      }

      // 7. Contact Tags
      const contactTagSheet = workbook.getWorksheet('Contact Tags')
      if (contactTagSheet && contactTagSheet.rowCount > 1) {
        const rows = contactTagSheet.getRows(2, contactTagSheet.rowCount - 1) || []
        for (const row of rows) {
          const contactId = String(row.getCell(1).text || '').trim()
          const tagId = String(row.getCell(2).text || '').trim()
          if (!contactId || !tagId) continue

          const [contactExists, tagExists] = await Promise.all([
            tx.contact.findUnique({ where: { id: contactId } }),
            tx.tag.findUnique({ where: { id: tagId } }),
          ])
          if (!contactExists || !tagExists) continue

          const existing = await tx.contactTag.findUnique({
            where: { contactId_tagId: { contactId, tagId } },
          })
          if (!existing) {
            await tx.contactTag.create({
              data: { contactId, tagId },
            })
            restored.contactTags++
          } else {
            skippedExisting++
          }
        }
      }

      // 8. Activities
      const actSheet = workbook.getWorksheet('Activities')
      if (actSheet && actSheet.rowCount > 1) {
        const rows = actSheet.getRows(2, actSheet.rowCount - 1) || []
        for (const row of rows) {
          const id = String(row.getCell(1).text || '').trim()
          const organisationId = String(row.getCell(2).text || '').trim()
          const contactId = String(row.getCell(3).text || '').trim() || null
          const performedById = String(row.getCell(4).text || '').trim()
          const type = String(row.getCell(5).text || 'NOTE').trim() as ActivityType
          const activityDate = parseDate(row.getCell(6).value) || new Date()
          const outcome = String(row.getCell(7).text || 'LOGGED').trim() as ActivityOutcome
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

          if (!id || !organisationId || !performedById) continue

          const [orgExists, userExists] = await Promise.all([
            tx.organisation.findUnique({ where: { id: organisationId } }),
            tx.user.findUnique({ where: { id: performedById } }),
          ])
          if (!orgExists || !userExists) continue

          const existing = await tx.activity.findUnique({ where: { id } })
          if (existing) {
            if (mode === 'EXACT_OVERWRITE') {
              await tx.activity.update({
                where: { id },
                data: {
                  organisationId,
                  contactId: contactId || undefined,
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
                  statusAfter: (statusAfter as OrgStatus) || undefined,
                  updatedAt,
                  deletedAt,
                },
              })
              restored.activities++
            } else {
              skippedExisting++
            }
          } else {
            await tx.activity.create({
              data: {
                id,
                organisationId,
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
                statusAfter: (statusAfter as OrgStatus) || undefined,
                createdAt,
                updatedAt,
                deletedAt,
              },
            })
            restored.activities++
          }
        }
      }

      // 9. Followups
      const followSheet = workbook.getWorksheet('Followups')
      if (followSheet && followSheet.rowCount > 1) {
        const rows = followSheet.getRows(2, followSheet.rowCount - 1) || []
        for (const row of rows) {
          const id = String(row.getCell(1).text || '').trim()
          const organisationId = String(row.getCell(2).text || '').trim()
          const contactId = String(row.getCell(3).text || '').trim() || null
          const activityId = String(row.getCell(4).text || '').trim() || null
          const dueDate = parseDate(row.getCell(5).value) || new Date()
          const note = String(row.getCell(6).text || '').trim() || null
          const status = String(row.getCell(7).text || 'PENDING').trim() as FollowUpStatus
          const reminderEnabled = parseBool(row.getCell(8).value, true)
          const assignedToId = String(row.getCell(9).text || '').trim()
          const createdById = String(row.getCell(10).text || '').trim()
          const completedAt = parseDate(row.getCell(11).value)
          const completedById = String(row.getCell(12).text || '').trim() || null
          const createdAt = parseDate(row.getCell(13).value) || new Date()
          const updatedAt = parseDate(row.getCell(14).value) || new Date()
          const deletedAt = parseDate(row.getCell(15).value)

          if (!id || !organisationId || !assignedToId || !createdById) continue

          const orgExists = await tx.organisation.findUnique({ where: { id: organisationId } })
          if (!orgExists) continue

          const existing = await tx.followUp.findUnique({ where: { id } })
          if (existing) {
            if (mode === 'EXACT_OVERWRITE') {
              await tx.followUp.update({
                where: { id },
                data: {
                  organisationId,
                  contactId: contactId || undefined,
                  activityId: activityId || undefined,
                  dueDate,
                  note,
                  status: ['PENDING', 'DONE', 'CANCELLED'].includes(status) ? status : 'PENDING',
                  reminderEnabled,
                  assignedToId,
                  completedAt,
                  completedById: completedById || undefined,
                  updatedAt,
                  deletedAt,
                },
              })
              restored.followups++
            } else {
              skippedExisting++
            }
          } else {
            await tx.followUp.create({
              data: {
                id,
                organisationId,
                contactId: contactId || undefined,
                activityId: activityId || undefined,
                dueDate,
                note,
                status: ['PENDING', 'DONE', 'CANCELLED'].includes(status) ? status : 'PENDING',
                reminderEnabled,
                assignedToId,
                createdById,
                completedAt,
                completedById: completedById || undefined,
                createdAt,
                updatedAt,
                deletedAt,
              },
            })
            restored.followups++
          }
        }
      }

      // 10. Assignments (Reassignment Requests)
      const assignSheet = workbook.getWorksheet('Assignments')
      if (assignSheet && assignSheet.rowCount > 1) {
        const rows = assignSheet.getRows(2, assignSheet.rowCount - 1) || []
        for (const row of rows) {
          const id = String(row.getCell(1).text || '').trim()
          const organisationId = String(row.getCell(2).text || '').trim()
          const requestedById = String(row.getCell(3).text || '').trim()
          const currentAssigneeId = String(row.getCell(4).text || '').trim()
          const reason = String(row.getCell(5).text || '').trim() || null
          const status = String(row.getCell(6).text || 'PENDING').trim() as ReassignmentStatus
          const decidedById = String(row.getCell(7).text || '').trim() || null
          const decidedAt = parseDate(row.getCell(8).value)
          const decisionNote = String(row.getCell(9).text || '').trim() || null
          const createdAt = parseDate(row.getCell(10).value) || new Date()
          const updatedAt = parseDate(row.getCell(11).value) || new Date()

          if (!id || !organisationId || !requestedById || !currentAssigneeId) continue

          const existing = await tx.reassignmentRequest.findUnique({ where: { id } })
          if (existing) {
            if (mode === 'EXACT_OVERWRITE') {
              await tx.reassignmentRequest.update({
                where: { id },
                data: {
                  status: ['PENDING', 'APPROVED', 'REJECTED'].includes(status) ? status : 'PENDING',
                  decidedById,
                  decidedAt,
                  decisionNote,
                  updatedAt,
                },
              })
              restored.assignments++
            } else {
              skippedExisting++
            }
          } else {
            await tx.reassignmentRequest.create({
              data: {
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
            })
            restored.assignments++
          }
        }
      }

      // 11. Comments
      const commentSheet = workbook.getWorksheet('Comments')
      if (commentSheet && commentSheet.rowCount > 1) {
        const rows = commentSheet.getRows(2, commentSheet.rowCount - 1) || []
        for (const row of rows) {
          const id = String(row.getCell(1).text || '').trim()
          const organisationId = String(row.getCell(2).text || '').trim()
          const authorId = String(row.getCell(3).text || '').trim()
          const body = String(row.getCell(4).text || '').trim()
          const mentions = parseJsonVal<string[]>(row.getCell(5).value, [])
          const createdAt = parseDate(row.getCell(6).value) || new Date()
          const updatedAt = parseDate(row.getCell(7).value) || new Date()
          const deletedAt = parseDate(row.getCell(8).value)

          if (!id || !organisationId || !authorId || !body) continue

          const existing = await tx.comment.findUnique({ where: { id } })
          if (existing) {
            if (mode === 'EXACT_OVERWRITE') {
              await tx.comment.update({
                where: { id },
                data: { body, mentions, updatedAt, deletedAt },
              })
              restored.comments++
            } else {
              skippedExisting++
            }
          } else {
            await tx.comment.create({
              data: { id, organisationId, authorId, body, mentions, createdAt, updatedAt, deletedAt },
            })
            restored.comments++
          }
        }
      }

      // 12. Attachments Metadata
      const attachSheet = workbook.getWorksheet('Attachments Metadata')
      if (attachSheet && attachSheet.rowCount > 1) {
        const rows = attachSheet.getRows(2, attachSheet.rowCount - 1) || []
        for (const row of rows) {
          const id = String(row.getCell(1).text || '').trim()
          const organisationId = String(row.getCell(2).text || '').trim()
          const filename = String(row.getCell(3).text || '').trim()
          const fileSize = parseIntVal(row.getCell(4).value, 0)
          const mimeType = String(row.getCell(5).text || 'application/octet-stream').trim()
          const uploadedById = String(row.getCell(6).text || '').trim()
          const createdAt = parseDate(row.getCell(7).value) || new Date()

          if (!id || !organisationId || !uploadedById || !filename) continue

          const existing = await tx.attachment.findUnique({ where: { id } })
          if (existing) {
            if (mode === 'EXACT_OVERWRITE') {
              await tx.attachment.update({
                where: { id },
                data: { filename, fileSize, mimeType },
              })
              restored.attachments++
            } else {
              skippedExisting++
            }
          } else {
            await tx.attachment.create({
              data: {
                id,
                organisationId,
                filename,
                fileSize,
                mimeType,
                contentBase64: 'RESTORED_METADATA_ONLY',
                uploadedById,
                createdAt,
              },
            })
            restored.attachments++
          }
        }
      }

      // 13. Conversations
      const convSheet = workbook.getWorksheet('Conversations')
      if (convSheet && convSheet.rowCount > 1) {
        const rows = convSheet.getRows(2, convSheet.rowCount - 1) || []
        for (const row of rows) {
          const id = String(row.getCell(1).text || '').trim()
          const type = String(row.getCell(2).text || 'DM').trim() as ConversationType
          const name = String(row.getCell(3).text || '').trim() || null
          const description = String(row.getCell(4).text || '').trim() || null
          const dmKey = String(row.getCell(5).text || '').trim() || null
          const createdById = String(row.getCell(6).text || '').trim()
          const isArchived = parseBool(row.getCell(7).value, false)
          const archivedAt = parseDate(row.getCell(8).value)
          const createdAt = parseDate(row.getCell(9).value) || new Date()
          const updatedAt = parseDate(row.getCell(10).value) || new Date()

          if (!id || !createdById) continue

          const existing = await tx.conversation.findUnique({ where: { id } })
          if (existing) {
            if (mode === 'EXACT_OVERWRITE') {
              await tx.conversation.update({
                where: { id },
                data: { name, description, isArchived, archivedAt, updatedAt },
              })
              restored.conversations++
            } else {
              skippedExisting++
            }
          } else {
            await tx.conversation.create({
              data: {
                id,
                type: ['DM', 'CHANNEL'].includes(type) ? type : 'DM',
                name,
                description,
                dmKey: dmKey || undefined,
                createdById,
                isArchived,
                archivedAt,
                createdAt,
                updatedAt,
              },
            })
            restored.conversations++
          }
        }
      }

      // 14. Conversation Members
      const memberSheet = workbook.getWorksheet('Conversation Members')
      if (memberSheet && memberSheet.rowCount > 1) {
        const rows = memberSheet.getRows(2, memberSheet.rowCount - 1) || []
        for (const row of rows) {
          const id = String(row.getCell(1).text || '').trim()
          const conversationId = String(row.getCell(2).text || '').trim()
          const userId = String(row.getCell(3).text || '').trim()
          const joinedAt = parseDate(row.getCell(4).value) || new Date()
          const lastReadAt = parseDate(row.getCell(5).value)

          if (!id || !conversationId || !userId) continue

          const [convExists, userExists] = await Promise.all([
            tx.conversation.findUnique({ where: { id: conversationId } }),
            tx.user.findUnique({ where: { id: userId } }),
          ])
          if (!convExists || !userExists) continue

          const existing = await tx.conversationMember.findUnique({
            where: { conversationId_userId: { conversationId, userId } },
          })
          if (existing) {
            if (mode === 'EXACT_OVERWRITE') {
              await tx.conversationMember.update({
                where: { id: existing.id },
                data: { lastReadAt },
              })
              restored.conversationMembers++
            } else {
              skippedExisting++
            }
          } else {
            await tx.conversationMember.create({
              data: { id, conversationId, userId, joinedAt, lastReadAt },
            })
            restored.conversationMembers++
          }
        }
      }

      // 15. Messages
      const msgSheet = workbook.getWorksheet('Messages')
      if (msgSheet && msgSheet.rowCount > 1) {
        const rows = msgSheet.getRows(2, msgSheet.rowCount - 1) || []
        for (const row of rows) {
          const id = String(row.getCell(1).text || '').trim()
          const conversationId = String(row.getCell(2).text || '').trim()
          const senderId = String(row.getCell(3).text || '').trim()
          const content = String(row.getCell(4).text || '').trim()
          const createdAt = parseDate(row.getCell(5).value) || new Date()
          const updatedAt = parseDate(row.getCell(6).value)
          const deletedAt = parseDate(row.getCell(7).value)

          if (!id || !conversationId || !senderId || !content) continue

          const existing = await tx.message.findUnique({ where: { id } })
          if (existing) {
            if (mode === 'EXACT_OVERWRITE') {
              await tx.message.update({
                where: { id },
                data: { content, updatedAt, deletedAt },
              })
              restored.messages++
            } else {
              skippedExisting++
            }
          } else {
            await tx.message.create({
              data: { id, conversationId, senderId, content, createdAt, updatedAt, deletedAt },
            })
            restored.messages++
          }
        }
      }

      // 16. EOD Reports
      const eodSheet = workbook.getWorksheet('EOD Reports')
      if (eodSheet && eodSheet.rowCount > 1) {
        const rows = eodSheet.getRows(2, eodSheet.rowCount - 1) || []
        for (const row of rows) {
          const id = String(row.getCell(1).text || '').trim()
          const dateKey = String(row.getCell(2).text || '').trim()
          const reportDate = parseDate(row.getCell(3).value) || new Date()
          const metrics = parseJsonVal(row.getCell(4).value, {})
          const perUser = parseJsonVal(row.getCell(5).value, [])
          const keyUpdates = parseJsonVal(row.getCell(6).value, [])
          const aiSummary = String(row.getCell(7).text || '').trim() || null
          const whatsappText = String(row.getCell(8).text || '').trim()
          const generatedById = String(row.getCell(9).text || '').trim()
          const createdAt = parseDate(row.getCell(10).value) || new Date()

          if (!id || !dateKey || !generatedById) continue

          const existing = await tx.eodReport.findUnique({ where: { dateKey } })
          if (existing) {
            if (mode === 'EXACT_OVERWRITE') {
              await tx.eodReport.update({
                where: { id: existing.id },
                data: { metrics, perUser, keyUpdates, aiSummary, whatsappText },
              })
              restored.eodReports++
            } else {
              skippedExisting++
            }
          } else {
            await tx.eodReport.create({
              data: {
                id,
                dateKey,
                reportDate,
                metrics,
                perUser,
                keyUpdates,
                aiSummary,
                whatsappText: whatsappText || 'Report summary',
                generatedById,
                createdAt,
              },
            })
            restored.eodReports++
          }
        }
      }

      // 17. Audit Logs
      const auditSheet = workbook.getWorksheet('Audit Logs')
      if (auditSheet && auditSheet.rowCount > 1) {
        const rows = auditSheet.getRows(2, auditSheet.rowCount - 1) || []
        for (const row of rows) {
          const id = String(row.getCell(1).text || '').trim()
          const userId = String(row.getCell(2).text || '').trim() || null
          const action = String(row.getCell(3).text || '').trim()
          const entityType = String(row.getCell(4).text || '').trim()
          const entityId = String(row.getCell(5).text || '').trim()
          const entityLabel = String(row.getCell(6).text || '').trim() || null
          const summary = String(row.getCell(7).text || '').trim()
          const before = parseJsonVal(row.getCell(8).value, null)
          const after = parseJsonVal(row.getCell(9).value, null)
          const createdAt = parseDate(row.getCell(10).value) || new Date()

          if (!id || !action || !entityType || !entityId) continue

          const existing = await tx.auditLog.findUnique({ where: { id } })
          if (!existing) {
            await tx.auditLog.create({
              data: {
                id,
                userId: userId || undefined,
                action,
                entityType,
                entityId,
                entityLabel,
                summary: summary || `${action} on ${entityType}`,
                before: before ? (before as unknown as Prisma.InputJsonValue) : undefined,
                after: after ? (after as unknown as Prisma.InputJsonValue) : undefined,
                createdAt,
              },
            })
            restored.auditLogs++
          } else {
            skippedExisting++
          }
        }
      }

      // Optional: Apply decrypted credentials if buffer and secret are provided
      if (options.credentialsBuffer && options.credentialsSecret) {
        const decryptedCreds = importEncryptedCredentials(
          options.credentialsBuffer,
          options.credentialsSecret,
        )
        const credResult = await applyRestoredCredentials(tx, decryptedCreds)
        restoredCredentialsCount = credResult.applied
      }
    },
    { timeout: 120000, maxWait: 15000 },
  )

  // Audit log the restore operation
  if (user) {
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'SYSTEM_RESTORE',
        entityType: 'backup',
        entityId: 'database_restore',
        summary: `Executed database restore in ${mode} mode. Restored ${restored.organisations} orgs, ${restored.contacts} contacts, ${restored.activities} activities, ${restored.messages} messages.`,
        after: {
          timestamp: new Date().toISOString(),
          mode,
          preRestoreBackupFile,
          restoredCounts: restored,
          restoredCredentials: restoredCredentialsCount,
          skippedExisting,
        },
      },
    })
  }

  const totalProcessed =
    Object.values(restored).reduce((a, b) => a + b, 0) + skippedExisting

  return {
    success: true,
    mode,
    preRestoreBackupFile,
    restored,
    restoredCredentials: restoredCredentialsCount,
    skippedExisting,
    totalProcessed,
    message: `Database restoration completed successfully in ${mode} mode!`,
  }
}
