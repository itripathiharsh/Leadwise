import { NextResponse } from 'next/server'
import {
  getGoogleDriveConfig,
  exchangeOAuthCodeForTokens,
} from '@/server/services/google-drive'
import { setAppSetting } from '@/server/services/settings'
import { writeAudit } from '@/server/services/audit'

export async function GET(req: Request) {
  const urlObj = new URL(req.url)
  const code = urlObj.searchParams.get('code')
  const error = urlObj.searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || urlObj.origin
  const redirectTarget = `${appUrl}/settings/backups`

  if (error || !code) {
    const errorMsg = encodeURIComponent(error || 'Missing authorization code from Google.')
    return NextResponse.redirect(`${redirectTarget}?drive_error=${errorMsg}`)
  }

  try {
    const config = await getGoogleDriveConfig()
    if (!config.clientId || !config.clientSecret) {
      const errorMsg = encodeURIComponent('Missing Client ID or Client Secret in configuration.')
      return NextResponse.redirect(`${redirectTarget}?drive_error=${errorMsg}`)
    }

    const redirectUri = `${appUrl}/api/auth/google/callback`

    const tokens = await exchangeOAuthCodeForTokens(
      code,
      redirectUri,
      config.clientId,
      config.clientSecret,
    )

    if (tokens.refreshToken) {
      await setAppSetting('google_drive_oauth_refresh_token', tokens.refreshToken)
    }

    if (tokens.email) {
      await setAppSetting('google_drive_oauth_user_email', tokens.email)
    }

    // Write audit log entry (zero credentials/tokens leaked)
    await writeAudit({
      userId: null,
      action: 'settings.updated',
      entityType: 'settings',
      entityId: 'google_drive_oauth',
      entityLabel: 'Google Drive OAuth',
      summary: `Google Drive connected successfully via OAuth 2.0${tokens.email ? ` for account ${tokens.email}` : ''}.`,
    })

    return NextResponse.redirect(`${redirectTarget}?drive_connected=true`)
  } catch (err: unknown) {
    const errorMsg = encodeURIComponent(
      err instanceof Error ? err.message : 'Failed to connect Google Drive OAuth.',
    )
    return NextResponse.redirect(`${redirectTarget}?drive_error=${errorMsg}`)
  }
}
