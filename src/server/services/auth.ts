import { prisma } from '@/lib/db'
import { verifyPassword } from '@/lib/auth/password'
import { normalizeEmail } from '@/lib/normalize'
import type { SessionPayload } from '@/lib/auth/session'
import { writeAuditSafe } from './audit'

/**
 * Authentication (spec §42 "Secure authentication").
 *
 * The service verifies credentials and nothing else — cookie handling lives in
 * the server action, because only that layer can write headers.
 */

export type LoginOutcome =
  | { ok: true; session: SessionPayload }
  | { ok: false; reason: 'INVALID' | 'INACTIVE' | 'PENDING' | 'REJECTED' | 'DISCONTINUED' }

export async function authenticate(email: string, password: string): Promise<LoginOutcome> {
  const normalized = normalizeEmail(email)
  if (!normalized) return { ok: false, reason: 'INVALID' }

  const user = await prisma.user.findFirst({
    where: { email: normalized, deletedAt: null },
    select: { id: true, name: true, email: true, role: true, passwordHash: true, isActive: true, status: true },
  })

  // Compare against a dummy hash when the account is missing so that a wrong
  // email and a wrong password take the same amount of time to fail.
  const hash = user?.passwordHash ?? DUMMY_HASH
  const valid = await verifyPassword(password, hash)

  if (!user || !valid) return { ok: false, reason: 'INVALID' }
  if (user.status === 'PENDING') return { ok: false, reason: 'PENDING' }
  if (user.status === 'REJECTED') return { ok: false, reason: 'REJECTED' }
  if (user.status === 'DISCONTINUED') return { ok: false, reason: 'DISCONTINUED' }
  if (!user.isActive) return { ok: false, reason: 'INACTIVE' }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

  await writeAuditSafe({
    userId: user.id,
    action: 'auth.login',
    entityType: 'auth',
    entityId: user.id,
    entityLabel: user.name,
    summary: `${user.name} signed in`,
  })

  return {
    ok: true,
    session: { sub: user.id, email: user.email, name: user.name, role: user.role },
  }
}

/** A real bcrypt hash of a value nobody can supply — used only for timing parity. */
const DUMMY_HASH = '$2a$12$K8Zx3vP1qYbN0uJ7hRw6ieQO5m2sT9cXaLdFgHiJkLmNoPqRsTuVw'
