import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { assertCan } from '@/lib/rbac'
import { disconnectGoogleDrive } from '@/server/services/google-drive'
import { writeAudit } from '@/server/services/audit'

export async function POST() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  assertCan(user, 'settings:manage')

  await disconnectGoogleDrive()

  await writeAudit({
    userId: user.id,
    action: 'settings.updated',
    entityType: 'settings',
    entityId: 'google_drive_oauth',
    entityLabel: 'Google Drive OAuth',
    summary: 'Google Drive OAuth account disconnected and tokens revoked.',
  })

  return NextResponse.json({ success: true })
}
