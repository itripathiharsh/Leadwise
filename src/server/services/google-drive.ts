import { importPKCS8, SignJWT } from 'jose'
import { getAppSetting } from './settings'

export interface GoogleDriveUploadResult {
  success: boolean
  fileId?: string
  viewUrl?: string
  folderId?: string
  error?: string
}

export interface GoogleDriveConfig {
  clientEmail?: string
  privateKey?: string
  folderId?: string
}

/**
 * Retrieves the Google Drive configuration from Environment or AppSettings.
 */
export async function getGoogleDriveConfig(): Promise<GoogleDriveConfig> {
  const clientEmail =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    (await getAppSetting('google_drive_client_email')) ||
    ''

  const rawKey =
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    (await getAppSetting('google_drive_private_key')) ||
    ''

  // Handle formatted or escaped newlines in PEM
  const privateKey = rawKey.replace(/\\n/g, '\n')

  const folderId =
    process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID ||
    (await getAppSetting('google_drive_backup_folder_id')) ||
    ''

  return { clientEmail, privateKey, folderId }
}

/**
 * Generate a Google OAuth 2.0 access token using Service Account RS256 JWT
 */
async function getServiceAccountAccessToken(
  clientEmail: string,
  privateKeyPem: string,
): Promise<string> {
  const privateKey = await importPKCS8(privateKeyPem, 'RS256')

  const now = Math.floor(Date.now() / 1000)
  const jwt = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey)

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Google Auth Token request failed (${response.status}): ${errorText}`)
  }

  const data = (await response.json()) as { access_token: string }
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
 * Uploads an Excel backup buffer to Google Drive.
 * If credentials are not configured or upload fails, returns structured failure without throwing.
 */
export async function uploadBackupToGoogleDrive(
  buffer: Buffer,
  fileName: string,
  folderIdOverride?: string,
): Promise<GoogleDriveUploadResult> {
  try {
    const config = await getGoogleDriveConfig()
    const folderId = folderIdOverride || config.folderId

    if (!config.clientEmail || !config.privateKey) {
      return {
        success: false,
        error:
          'Google Drive credentials not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in Settings or .env.',
      }
    }

    const accessToken = await getServiceAccountAccessToken(config.clientEmail, config.privateKey)

    // Resolve hierarchical disaster recovery structure: Leadwise Backups/ -> YYYY/ -> MonthName/
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
 * Validates Google Drive connection and permissions.
 */
export async function testGoogleDriveConnection(): Promise<{
  connected: boolean
  message: string
  folderName?: string
}> {
  try {
    const config = await getGoogleDriveConfig()
    if (!config.clientEmail || !config.privateKey) {
      return {
        connected: false,
        message: 'Google Service Account credentials missing in environment and settings.',
      }
    }

    const accessToken = await getServiceAccountAccessToken(config.clientEmail, config.privateKey)

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
          message: `Authenticated with Google, but target folder "${config.folderId}" was not accessible (${folderRes.status}). Ensure the folder is shared with ${config.clientEmail}.`,
        }
      }
      const folderData = (await folderRes.json()) as { name: string }
      return {
        connected: true,
        message: `Successfully connected to Google Drive. Target folder: ${folderData.name}`,
        folderName: folderData.name,
      }
    }

    return {
      connected: true,
      message: `Successfully authenticated with Google Drive as ${config.clientEmail}. (Root drive will be used)`,
    }
  } catch (err: unknown) {
    return {
      connected: false,
      message: err instanceof Error ? err.message : String(err),
    }
  }
}
