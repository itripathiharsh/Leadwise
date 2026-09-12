import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import type { Role, User } from '@prisma/client'
import { prisma } from '@/lib/db'
import { SESSION_COOKIE, verifySessionToken } from './session'

/**
 * The authenticated user for the current request.
 *
 * Wrapped in React's `cache()` so that a page, its layout and any number of
 * server components/actions in the same render share a single database read.
 */

export type CurrentUser = Pick<
  User,
  'id' | 'name' | 'email' | 'role' | 'status' | 'phone' | 'avatarColor' | 'isActive'
>

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const payload = await verifySessionToken(token)
  if (!payload) return null

  // Re-read from the DB: the token is only a claim about identity, never
  // the authority on whether the account is still active or what role it has.
  const user = await prisma.user.findFirst({
    where: {
      id: payload.sub,
      deletedAt: null,
      isActive: true,
      status: 'APPROVED',
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      phone: true,
      avatarColor: true,
      isActive: true,
    },
  })

  return user
})

/** Use in any authenticated page/layout. Redirects to /login when signed out. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}

/** Use when a page is restricted to specific roles. */
export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser()
  if (!roles.includes(user.role)) redirect('/dashboard?denied=1')
  return user
}
