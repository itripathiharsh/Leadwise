import { SignJWT, jwtVerify } from 'jose'
import type { Role } from '@prisma/client'
import { env } from '@/lib/env'

/**
 * Stateless session tokens.
 *
 * The session is a signed JWT in an httpOnly cookie. `jose` is used (rather
 * than a Node-only JWT library) because the same verification runs inside
 * Next.js middleware, which executes on the Edge runtime.
 *
 * The token carries only identity + role. Every server action re-reads the user
 * from the database, so a deactivated account or a role change takes effect on
 * the next request rather than waiting for the token to expire.
 */

export const SESSION_COOKIE = 'leadwise_session'

export interface SessionPayload {
  sub: string // user id
  email: string
  name: string
  role: Role
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.authSecret)
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const days = env.sessionDays
  return new SignJWT({ email: payload.email, name: payload.name, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setIssuer('leadwise-crm')
    .setAudience('leadwise-crm')
    .setExpirationTime(`${days}d`)
    .sign(secretKey())
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: 'leadwise-crm',
      audience: 'leadwise-crm',
    })
    if (!payload.sub || typeof payload.email !== 'string' || typeof payload.role !== 'string') {
      return null
    }
    return {
      sub: payload.sub,
      email: payload.email,
      name: typeof payload.name === 'string' ? payload.name : payload.email,
      role: payload.role as Role,
    }
  } catch {
    // Expired, tampered, or signed with an old secret — all mean "no session".
    return null
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.isProduction,
    path: '/',
    maxAge: env.sessionDays * 24 * 60 * 60,
  }
}
