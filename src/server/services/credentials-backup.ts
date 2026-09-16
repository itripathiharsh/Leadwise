import crypto from 'crypto'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

const MAGIC_HEADER = Buffer.from('LEADWISE_ENC_CREDS_V1', 'utf8') // 21 bytes
const SALT_LENGTH = 16
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

export interface EncryptedCredentialEntry {
  id: string
  name: string
  email: string
  role: string
  passwordHash: string
}

export interface EncryptedCredentialPayload {
  version: 1
  exportedAt: string
  system: 'Leadwise CRM'
  credentials: EncryptedCredentialEntry[]
}

/**
 * Derives a 32-byte (256-bit) encryption key from a secret and salt using scrypt.
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return crypto.scryptSync(secret, salt, 32)
}

/**
 * Exports active and non-deleted user credentials as an AES-256-GCM encrypted binary buffer.
 * Password hashes are encrypted at rest using the provided secret key (e.g. OWNER_RECOVERY_SECRET).
 * Plaintext passwords are never exported or known.
 */
export async function exportEncryptedCredentials(secret: string): Promise<Buffer> {
  if (!secret || secret.trim().length < 16) {
    throw new Error('Credential backup encryption key must be at least 16 characters long.')
  }

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      passwordHash: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  const payload: EncryptedCredentialPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    system: 'Leadwise CRM',
    credentials: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      passwordHash: u.passwordHash,
    })),
  }

  const json = JSON.stringify(payload)
  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)
  const key = deriveKey(secret, salt)

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return Buffer.concat([MAGIC_HEADER, salt, iv, authTag, ciphertext])
}

/**
 * Decrypts an AES-256-GCM encrypted credential backup using the provided secret.
 * Verifies authenticity and integrity via the GCM auth tag.
 */
export function importEncryptedCredentials(
  buffer: Buffer,
  secret: string,
): EncryptedCredentialEntry[] {
  if (!secret || secret.trim().length === 0) {
    throw new Error('Decryption secret is required.')
  }

  const minLength = MAGIC_HEADER.length + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH + 2
  if (!buffer || buffer.length < minLength) {
    throw new Error('Invalid or corrupted credential backup file (insufficient length).')
  }

  // 1. Verify Magic Header
  const header = buffer.subarray(0, MAGIC_HEADER.length)
  if (!crypto.timingSafeEqual(header, MAGIC_HEADER)) {
    throw new Error('Invalid credential backup format: magic header mismatch.')
  }

  let offset = MAGIC_HEADER.length
  const salt = buffer.subarray(offset, offset + SALT_LENGTH)
  offset += SALT_LENGTH

  const iv = buffer.subarray(offset, offset + IV_LENGTH)
  offset += IV_LENGTH

  const authTag = buffer.subarray(offset, offset + AUTH_TAG_LENGTH)
  offset += AUTH_TAG_LENGTH

  const ciphertext = buffer.subarray(offset)

  try {
    const key = deriveKey(secret, salt)
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    const payload = JSON.parse(decrypted.toString('utf8')) as EncryptedCredentialPayload

    if (payload.version !== 1 || !Array.isArray(payload.credentials)) {
      throw new Error('Unrecognized credential backup payload structure.')
    }

    return payload.credentials
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('Unsupported state or unable to authenticate data')) {
      throw new Error('Decryption failed: Incorrect recovery secret or corrupted file.')
    }
    throw new Error(`Credential decryption error: ${msg}`)
  }
}

/**
 * Safely applies decrypted password hashes to restored users within a Prisma transaction.
 * Matches existing users by original ID first, then fallback to email.
 */
export async function applyRestoredCredentials(
  tx: Prisma.TransactionClient,
  credentials: EncryptedCredentialEntry[],
): Promise<{ applied: number; skipped: number }> {
  let applied = 0
  let skipped = 0

  for (const cred of credentials) {
    if (!cred.passwordHash || !cred.passwordHash.startsWith('$2')) {
      skipped++
      continue
    }

    // 1. Match by original ID first
    let user = await tx.user.findUnique({
      where: { id: cred.id },
      select: { id: true, email: true },
    })

    // 2. Fallback match by email
    if (!user && cred.email) {
      user = await tx.user.findUnique({
        where: { email: cred.email.toLowerCase() },
        select: { id: true, email: true },
      })
    }

    if (user) {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: cred.passwordHash },
      })
      applied++
    } else {
      skipped++
    }
  }

  return { applied, skipped }
}
