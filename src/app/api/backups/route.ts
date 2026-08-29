import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { assertCan } from '@/lib/rbac'
import { executeFullBackup, getBackupHistory, getLatestBackupHealth } from '@/server/services/backup'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  assertCan(user, 'backup:manage')

  const [history, health] = await Promise.all([
    getBackupHistory(30),
    getLatestBackupHealth(),
  ])

  return NextResponse.json({ history, health })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  assertCan(user, 'backup:manage')

  try {
    const body = await req.json().catch(() => ({}))
    const trigger = body.trigger === 'SCHEDULED' ? 'SCHEDULED' : 'MANUAL'

    const result = await executeFullBackup(trigger, user.id)

    return NextResponse.json({
      success: result.status === 'SUCCESS' || result.status === 'PARTIAL_SUCCESS',
      recordId: result.recordId,
      fileName: result.fileName,
      fileSize: result.fileSize,
      status: result.status,
      driveUrl: result.driveUrl,
      driveFileId: result.driveFileId,
      validation: result.validation,
      errorMessage: result.errorMessage,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `Backup execution failed: ${message}` },
      { status: 500 },
    )
  }
}
