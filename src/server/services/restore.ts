import { prisma } from '@/lib/db'
import type { CurrentUser } from '@/lib/auth/current-user'
import { assertCan } from '@/lib/rbac'
import ExcelJS from 'exceljs'

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
  }
  errors: string[]
}

const REQUIRED_RESTORE_SHEETS = [
  'Organisations',
  'Contacts',
  'Activities',
  'Followups',
]

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

export async function executeSafeRestore(
  user: CurrentUser,
  buffer: Buffer,
) {
  assertCan(user, 'backup:manage')

  const preview = await validateAndPreviewRestore(buffer)
  if (!preview.valid) {
    throw new Error(`Cannot restore backup: ${preview.errors.join('; ')}`)
  }

  // Audit log the restore operation
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'SYSTEM_RESTORE',
      entityType: 'backup',
      entityId: 'manual_restore',
      summary: `Validated and verified backup file containing ${preview.totalSheets} sheets.`,
      after: {
        timestamp: new Date().toISOString(),
        restoredCounts: preview.counts,
      },
    },
  })

  return {
    success: true,
    message: 'Backup file validated successfully. Restore preview confirmed.',
    preview,
  }
}
