import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'

const DEFAULT_DIR = path.join(os.homedir(), '.leadwise-whatsapp', 'chrome-profile')

export function getProfileDir(): string {
  const dir = process.env.BROWSER_PROFILE_DIR || DEFAULT_DIR
  // Expand ~ for cross-platform
  const resolved = dir.startsWith('~') ? path.join(os.homedir(), dir.slice(1)) : dir
  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true })
  }
  return resolved
}

export function isSessionActive(): boolean {
  const profileDir = getProfileDir()
  // Check if the profile directory has meaningful content (cookies, storage, etc.)
  if (!fs.existsSync(profileDir)) return false
  try {
    const contents = fs.readdirSync(profileDir)
    return contents.length > 0
  } catch {
    return false
  }
}

export function getSessionInfo(): { profileDir: string; hasSession: boolean; lastModified: string | null } {
  const profileDir = getProfileDir()
  const hasSession = isSessionActive()
  let lastModified: string | null = null

  if (hasSession) {
    try {
      const stat = fs.statSync(profileDir)
      lastModified = stat.mtime.toISOString()
    } catch {
      // ignore
    }
  }

  return { profileDir, hasSession, lastModified }
}
