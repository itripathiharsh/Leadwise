import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { assertCan } from '@/lib/rbac'
import { getGoogleDriveConfig, generateGoogleOAuthUrl } from '@/server/services/google-drive'
import crypto from 'node:crypto'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  assertCan(user, 'settings:manage')

  const config = await getGoogleDriveConfig()
  if (!config.clientId) {
    return NextResponse.json(
      {
        error:
          'Google OAuth Client ID is not configured. Please enter your Client ID in Settings > Backups.',
      },
      { status: 400 },
    )
  }

  // Derive redirect URI based on origin or NEXT_PUBLIC_APP_URL
  const urlObj = new URL(req.url)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || urlObj.origin
  const redirectUri = `${appUrl}/api/auth/google/callback`

  const state = crypto.randomBytes(24).toString('base64url')

  const authUrl = generateGoogleOAuthUrl(redirectUri, state, config.clientId)

  const res = NextResponse.json({
    url: authUrl,
    redirectUri,
  })

  res.cookies.set('gdrive_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60, // 10 minutes
  })

  return res
}
