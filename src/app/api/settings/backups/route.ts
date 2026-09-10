import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { assertCan } from '@/lib/rbac'
import { getAppSetting, setAppSetting } from '@/server/services/settings'
import {
  getGoogleDriveConfig,
  testGoogleDriveConnection,
} from '@/server/services/google-drive'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role === 'INTERN') {
    return NextResponse.json(
      { error: 'Forbidden: Backup settings restricted to leaders' },
      { status: 403 },
    )
  }

  assertCan(user, 'settings:manage')

  const [
    scheduleDay,
    scheduleTime,
    retentionCount,
    config,
    driveStatus,
  ] = await Promise.all([
    getAppSetting('backup_schedule_day'),
    getAppSetting('backup_schedule_time'),
    getAppSetting('backup_retention_count'),
    getGoogleDriveConfig(),
    testGoogleDriveConnection(),
  ])

  return NextResponse.json({
    scheduleDay: scheduleDay || 'Saturday',
    scheduleTime: scheduleTime || '19:00',
    retentionCount: retentionCount ? parseInt(retentionCount, 10) : 8,
    googleDriveFolderId: config.folderId || '1Rg8Gr68cwglbsq_HYZphghMADlafrGCg',
    googleDriveOAuthClientId: config.clientId || '',
    googleDriveOAuthHasSecret: Boolean(config.clientSecret),
    googleDriveOAuthConnected: Boolean(config.refreshToken),
    googleDriveOAuthUserEmail: config.userEmail || '',
    driveStatus,
  })
}

const backupSettingsSchema = z.object({
  scheduleDay: z.string().max(20).optional(),
  scheduleTime: z.string().max(10).optional(),
  retentionCount: z.coerce.number().int().min(1).max(52).optional(),
  googleDriveFolderId: z.string().max(200).optional(),
  googleDriveOAuthClientId: z.string().optional(),
  googleDriveOAuthClientSecret: z.string().optional(),
})

export async function PUT(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  assertCan(user, 'settings:manage')

  try {
    const rawBody = await req.json()
    const parsed = backupSettingsSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid backup settings', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const body = parsed.data

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
      await setAppSetting(
        'google_drive_backup_folder_id',
        String(body.googleDriveFolderId).trim(),
      )
    }
    if (body.googleDriveOAuthClientId !== undefined) {
      await setAppSetting(
        'google_drive_oauth_client_id',
        String(body.googleDriveOAuthClientId).trim(),
      )
    }
    if (
      body.googleDriveOAuthClientSecret !== undefined &&
      String(body.googleDriveOAuthClientSecret).trim().length > 0
    ) {
      await setAppSetting(
        'google_drive_oauth_client_secret',
        String(body.googleDriveOAuthClientSecret).trim(),
      )
    }

    const driveStatus = await testGoogleDriveConnection()

    return NextResponse.json({
      success: true,
      driveStatus,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
