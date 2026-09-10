import { getAppSetting, setAppSetting } from './settings'

export interface GoogleDriveUploadResult {
  success: boolean
  fileId?: string
  viewUrl?: string
  folderId?: string
  error?: string
}

export interface GoogleDriveOAuthConfig {
  clientId: string
  clientSecret: string
  refreshToken?: string
  userEmail?: string
  folderId: string
}

/**
 * Retrieves the Google Drive OAuth configuration from Environment or AppSettings.
 * Never logs or returns secrets to client-facing callers.
 */
export async function getGoogleDriveConfig(): Promise<GoogleDriveOAuthConfig> {
  const dbClientId = await getAppSetting('google_drive_oauth_client_id')
  const clientId = (dbClientId || process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim()

  const dbClientSecret = await getAppSetting('google_drive_oauth_client_secret')
  const clientSecret = (dbClientSecret || process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim()

  const dbRefreshToken = await getAppSetting('google_drive_oauth_refresh_token')
  const refreshToken = (dbRefreshToken || process.env.GOOGLE_OAUTH_REFRESH_TOKEN || '').trim()

  const userEmail =
    (await getAppSetting('google_drive_oauth_user_email')) ||
    ''

  const dbFolderId = await getAppSetting('google_drive_backup_folder_id')
  const folderId = (
    dbFolderId ||
    process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID ||
    '1Rg8Gr68cwglbsq_HYZphghMADlafrGCg'
  ).trim()

  return { clientId, clientSecret, refreshToken, userEmail, folderId }
}

/**
 * Exchanges a long-lived OAuth 2.0 refresh token for an ephemeral (1-hr) access token.
 * Strictly avoids logging or leaking any credentials on error.
 */
async function getOAuth2AccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    let detail = ''
    try {
      const parsed = JSON.parse(errorBody)
      detail = parsed.error_description || parsed.error || errorBody
    } catch {
      detail = errorBody
    }
    throw new Error(
      `Google OAuth token refresh failed with status ${response.status}${detail ? `: ${detail}` : ''}. Re-authentication in Settings > Backups may be required.`,
    )
  }

  const data = (await response.json()) as { access_token?: string }
  if (!data.access_token) {
    throw new Error('Google OAuth token refresh returned empty access token.')
  }

  return data.access_token
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/**
 * Finds an existing folder by name and parentId, or creates a new one.
 */
async function findOrCreateFolder(
  accessToken: string,
  folderName: string,
  parentId?: string,
): Promise<string | undefined> {
  try {
    let q = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`
    if (parentId) {
      q += ` and '${parentId}' in parents`
    }
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (searchRes.ok) {
      const searchData = (await searchRes.json()) as { files?: { id: string; name: string }[] }
      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id
      }
    }

    // Create if not found
    const createBody: { name: string; mimeType: string; parents?: string[] } = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }
    if (parentId) createBody.parents = [parentId]

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createBody),
    })
    if (createRes.ok) {
      const created = (await createRes.json()) as { id: string }
      return created.id
    }
  } catch {
    // If folder creation fails, fallback gracefully to parentId
  }
  return parentId
}

/**
 * Resolves or creates the hierarchical disaster recovery folder:
 * Leadwise Backups/ -> YYYY/ -> MonthName/
 */
async function resolveBackupDestinationFolder(
  accessToken: string,
  rootOverride?: string,
): Promise<string | undefined> {
  try {
    const now = new Date()
    const yearStr = String(now.getFullYear())
    const monthStr = MONTH_NAMES[now.getMonth()]

    // 1. Root folder ("Leadwise Backups" or rootOverride)
    let baseFolderId = rootOverride
    if (!baseFolderId) {
      baseFolderId = await findOrCreateFolder(accessToken, 'Leadwise Backups')
    }

    // 2. Year folder (e.g. "2026")
    const yearFolderId = await findOrCreateFolder(accessToken, yearStr, baseFolderId)

    // 3. Month folder (e.g. "September")
    const monthFolderId = await findOrCreateFolder(accessToken, monthStr, yearFolderId)

    return monthFolderId || yearFolderId || baseFolderId
  } catch {
    return rootOverride
  }
}

/**
 * Uploads an Excel backup buffer to Google Drive using the authenticated user's OAuth credentials.
 * The uploaded file is owned by the user's Google account and consumes their 5 TB storage quota.
 */
export async function uploadBackupToGoogleDrive(
  buffer: Buffer,
  fileName: string,
  folderIdOverride?: string,
): Promise<GoogleDriveUploadResult> {
  try {
    const config = await getGoogleDriveConfig()
    const folderId = folderIdOverride || config.folderId

    if (!config.clientId || !config.clientSecret) {
      return {
        success: false,
        error:
          'Google OAuth credentials not configured. Please set Client ID and Client Secret in Settings > Backups.',
      }
    }

    if (!config.refreshToken) {
      return {
        success: false,
        error:
          'Google Account not connected. Please click "Connect with Google" in Settings > Backups to authorize uploads to your My Drive.',
      }
    }

    const accessToken = await getOAuth2AccessToken(
      config.clientId,
      config.clientSecret,
      config.refreshToken,
    )

    // Resolve hierarchical disaster recovery structure inside target folder
    const destinationFolderId = await resolveBackupDestinationFolder(accessToken, folderId)

    // Build multipart body for Drive v3 upload
    const boundary = `-------314159265358979323846`
    const delimiter = `\r\n--${boundary}\r\n`
    const closeDelimiter = `\r\n--${boundary}--`

    const metadata: { name: string; mimeType: string; parents?: string[] } = {
      name: fileName,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }

    if (destinationFolderId && destinationFolderId.trim().length > 0) {
      metadata.parents = [destinationFolderId.trim()]
    }

    const metadataHeader =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n'

    const multipartBody = Buffer.concat([
      Buffer.from(metadataHeader, 'utf8'),
      Buffer.from(buffer.toString('base64'), 'utf8'),
      Buffer.from(closeDelimiter, 'utf8'),
    ])

    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': multipartBody.length.toString(),
        },
        body: multipartBody,
      },
    )

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      return {
        success: false,
        error: `Google Drive API upload failed (${uploadResponse.status}): ${errorText}`,
      }
    }

    const result = (await uploadResponse.json()) as {
      id: string
      name: string
      webViewLink?: string
      webContentLink?: string
    }

    const viewUrl = result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`

    return {
      success: true,
      fileId: result.id,
      viewUrl,
      folderId,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      error: `Google Drive upload exception: ${message}`,
    }
  }
}

/**
 * Validates Google Drive connection and permissions via OAuth 2.0.
 */
export async function testGoogleDriveConnection(): Promise<{
  connected: boolean
  message: string
  folderName?: string
  userEmail?: string
}> {
  try {
    const config = await getGoogleDriveConfig()
    if (!config.clientId || !config.clientSecret) {
      return {
        connected: false,
        message: 'Google OAuth Client ID & Secret missing. Configure them in Settings or environment variables.',
      }
    }

    if (!config.refreshToken) {
      return {
        connected: false,
        message: 'Google Account not connected. Click "Connect with Google" to authorize backups.',
      }
    }

    const accessToken = await getOAuth2AccessToken(
      config.clientId,
      config.clientSecret,
      config.refreshToken,
    )

    if (config.folderId) {
      const folderRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
          config.folderId,
        )}?fields=id,name,mimeType,trashed`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      )
      if (!folderRes.ok) {
        return {
          connected: false,
          userEmail: config.userEmail,
          message: `Authenticated with Google as ${config.userEmail || 'user'}, but folder "${config.folderId}" was not found (${folderRes.status}). Verify folder ID.`,
        }
      }
      const folderData = (await folderRes.json()) as { name: string }
      return {
        connected: true,
        userEmail: config.userEmail,
        folderName: folderData.name,
        message: `Connected to Google Drive as ${config.userEmail || 'user'}. Target folder: "${folderData.name}".`,
      }
    }

    return {
      connected: true,
      userEmail: config.userEmail,
      message: `Connected to Google Drive as ${config.userEmail || 'user'}. (Root folder will be used)`,
    }
  } catch (err: unknown) {
    return {
      connected: false,
      message: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Generates the Google OAuth 2.0 authorization URL.
 */
export function generateGoogleOAuthUrl(
  redirectUri: string,
  state: string,
  clientId: string,
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope:
      'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

/**
 * Exchanges the one-time authorization code for permanent refresh and access tokens.
 */
export async function exchangeOAuthCodeForTokens(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
): Promise<{ refreshToken: string; accessToken: string; email?: string }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    let detail = ''
    try {
      const parsed = JSON.parse(errorBody)
      detail = parsed.error_description || parsed.error || errorBody
    } catch {
      detail = errorBody
    }
    throw new Error(
      `Google OAuth code exchange failed (${response.status}): ${detail || 'Verify redirect URI and credentials.'}`,
    )
  }

  const data = (await response.json()) as { refresh_token?: string; access_token: string }
  if (!data.access_token) {
    throw new Error('Google OAuth exchange returned no access token.')
  }

  // Retrieve authenticated user's email
  let email: string | undefined
  try {
    const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    })
    if (userinfoRes.ok) {
      const udata = (await userinfoRes.json()) as { email?: string }
      email = udata.email
    }
  } catch {
    // Non-fatal
  }

  return {
    refreshToken: data.refresh_token || '',
    accessToken: data.access_token,
    email,
  }
}

/**
 * Revokes and deletes stored Google OAuth tokens.
 */
export async function disconnectGoogleDrive(): Promise<void> {
  const config = await getGoogleDriveConfig()
  if (config.refreshToken) {
    try {
      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(config.refreshToken)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      )
    } catch {
      // Non-fatal
    }
  }
  await setAppSetting('google_drive_oauth_refresh_token', '')
  await setAppSetting('google_drive_oauth_user_email', '')
}
