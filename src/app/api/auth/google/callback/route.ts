import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
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
  const state = urlObj.searchParams.get('state')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || urlObj.origin
  const redirectTarget = `${appUrl}/settings/backups`

  const cookieStore = await cookies()
  const expectedState = cookieStore.get('gdrive_oauth_state')?.value

  // Verify OAuth CSRF state
  if (!state || !expectedState || state !== expectedState) {
    const errorMsg = encodeURIComponent('Invalid or expired OAuth state parameter. Request rejected for security.')
    const res = NextResponse.redirect(`${redirectTarget}?drive_error=${errorMsg}`)
    res.cookies.delete('gdrive_oauth_state')
    return res
  }

  if (error || !code) {
    const errorMsg = encodeURIComponent(error || 'Missing authorization code from Google.')
    const res = NextResponse.redirect(`${redirectTarget}?drive_error=${errorMsg}`)
    res.cookies.delete('gdrive_oauth_state')
    return res
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

    const res = NextResponse.redirect(`${redirectTarget}?drive_connected=true`)
    res.cookies.delete('gdrive_oauth_state')
    return res
  } catch (err: unknown) {
    const errorMsg = encodeURIComponent(
      err instanceof Error ? err.message : 'Failed to connect Google Drive OAuth.',
    )
    const res = NextResponse.redirect(`${redirectTarget}?drive_error=${errorMsg}`)
    res.cookies.delete('gdrive_oauth_state')
    return res
  }
}
