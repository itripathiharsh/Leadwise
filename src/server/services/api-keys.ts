import { prisma } from '@/lib/db'
import type { CurrentUser } from '@/lib/auth/current-user'
import { assertCan } from '@/lib/rbac'
import crypto from 'crypto'

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

export async function createApiKey(
  user: CurrentUser,
  name: string,
  permissions: string[] = ['read', 'write'],
) {
  assertCan(user, 'user:manage')

  const randomBytes = crypto.randomBytes(24).toString('base64url')
  const rawKey = `sm_live_${randomBytes}`
  const keyHash = hashApiKey(rawKey)
  const prefix = rawKey.slice(0, 12)

  const record = await prisma.apiKey.create({
    data: {
      name: name.trim(),
      keyHash,
      prefix,
      userId: user.id,
      permissions,
    },
  })

  return {
    id: record.id,
    name: record.name,
    prefix: record.prefix,
    rawKey, // Returned only once at creation
    createdAt: record.createdAt,
  }
}

export async function verifyApiKey(rawKey: string) {
  if (!rawKey || !rawKey.startsWith('sm_live_')) {
    return null
  }

  const keyHash = hashApiKey(rawKey)
  const keyRecord = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: true },
  })

  if (!keyRecord || keyRecord.isRevoked) {
    return null
  }

  if (keyRecord.expiresAt && keyRecord.expiresAt.getTime() < Date.now()) {
    return null
  }

  // Update last used timestamp async
  prisma.apiKey.update({
    where: { id: keyRecord.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {})

  return keyRecord.user
}
