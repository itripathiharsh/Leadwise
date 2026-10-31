import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { assertCan } from '@/lib/rbac'
import { buildFullBackupWorkbook } from '@/server/services/backup'
import { writeAuditSafe } from '@/server/services/audit'
import { todayKey } from '@/lib/dates'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role === 'INTERN') {
    return NextResponse.json(
      { error: 'Forbidden: Complete database backup export is restricted to leaders' },
      { status: 403 },
    )
  }

  assertCan(user, 'backup:manage')

  try {
    const timestamp = new Date()
    const dateStr = todayKey()
    const timeStr = `${String(timestamp.getHours()).padStart(2, '0')}${String(
      timestamp.getMinutes(),
    ).padStart(2, '0')}`
    const fileName = `leadwise_backup_FULL_${dateStr}_${timeStr}.xlsx`

    const { workbook, counts } = await buildFullBackupWorkbook()
    const arrayBuffer = await workbook.xlsx.writeBuffer()
    const buffer = Buffer.from(arrayBuffer)

    await writeAuditSafe({
      userId: user.id,
      action: 'export.generated',
      entityType: 'settings',
      entityId: 'backup_full',
      entityLabel: fileName,
      summary: `Downloaded complete database backup spreadsheet locally (${counts.organisations} orgs, ${counts.contacts} contacts, ${counts.activities} activities)`,
    })

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `Failed to generate full local backup: ${message}` },
      { status: 500 },
    )
  }
}
