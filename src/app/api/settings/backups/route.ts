import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { assertCan } from '@/lib/rbac'
import { getAppSetting, setAppSetting } from '@/server/services/settings'
import { testGoogleDriveConnection } from '@/server/services/google-drive'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  assertCan(user, 'settings:manage')

  const [
    scheduleDay,
    scheduleTime,
    retentionCount,
    folderId,
    clientEmail,
    driveStatus,
  ] = await Promise.all([
    getAppSetting('backup_schedule_day'),
    getAppSetting('backup_schedule_time'),
    getAppSetting('backup_retention_count'),
    getAppSetting('google_drive_backup_folder_id'),
    getAppSetting('google_drive_client_email'),
    testGoogleDriveConnection(),
  ])

  return NextResponse.json({
    scheduleDay: scheduleDay || 'Saturday',
    scheduleTime: scheduleTime || '19:00',
    retentionCount: retentionCount ? parseInt(retentionCount, 10) : 8,
    googleDriveFolderId: folderId || '',
    googleDriveClientEmail: clientEmail || '',
    googleDriveConfigured: Boolean(clientEmail || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
    driveStatus,
  })
}

export async function PUT(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  assertCan(user, 'settings:manage')

  const body = await req.json().catch(() => ({}))

  if (body.scheduleDay !== undefined) {
    await setAppSetting('backup_schedule_day', String(body.scheduleDay))
  }
  if (body.scheduleTime !== undefined) {
    await setAppSetting('backup_schedule_time', String(body.scheduleTime))
  }
  if (body.retentionCount !== undefined) {
    await setAppSetting('backup_retention_count', String(body.retentionCount))
  }
  if (body.googleDriveFolderId !== undefined) {
    await setAppSetting('google_drive_backup_folder_id', String(body.googleDriveFolderId).trim())
  }
  if (body.googleDriveClientEmail !== undefined) {
    await setAppSetting('google_drive_client_email', String(body.googleDriveClientEmail).trim())
  }
  if (body.googleDrivePrivateKey !== undefined && String(body.googleDrivePrivateKey).trim().length > 0) {
    await setAppSetting('google_drive_private_key', String(body.googleDrivePrivateKey).trim())
  }

  const driveStatus = await testGoogleDriveConnection()

  return NextResponse.json({
    success: true,
    driveStatus,
  })
}
