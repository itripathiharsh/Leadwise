import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { listUsers, createUser, getTeamPerformance } from '@/server/services/users'
import { userCreateSchema } from '@/lib/validation'

const userActionSchema = z.object({
  userId: z.string().min(1, 'userId is required').max(64),
  action: z.enum(['APPROVE', 'REJECT', 'DISCONTINUE', 'REACTIVATE', 'RESET_PASSWORD', 'CHANGE_ROLE']),
  role: z.enum(['OWNER', 'TL', 'INTERN']).optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(100).optional(),
  confirmOwnerChange: z.boolean().optional(),
})

const userDeleteSchema = z.object({
  userId: z.string().min(1, 'userId is required').max(64),
})

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const wantsPerformance = searchParams.get('performance') === 'true'
  const wantsPending = searchParams.get('pending') === 'true'

  if (wantsPending) {
    if (user.role !== 'OWNER' && user.role !== 'TL') {
      return NextResponse.json({ error: 'Forbidden: Only Owner and Team Lead can view pending access requests.' }, { status: 403 })
    }
    const { listPendingUsers } = await import('@/server/services/users')
    const pending = await listPendingUsers(user)
    return NextResponse.json({ pending })
  }

  if (wantsPerformance) {
    if (user.role !== 'OWNER' && user.role !== 'TL') {
      return NextResponse.json({ error: 'Forbidden: Only Owner and Team Lead have access to team performance.' }, { status: 403 })
    }
    const performance = await getTeamPerformance(user)
    return NextResponse.json({ performance })
  }

  // If user is Owner or TL, give full team member stats, otherwise return lightweight assignable list
  if (user.role === 'OWNER' || user.role === 'TL') {
    const users = await listUsers(user, { includeInactive: true })
    return NextResponse.json({ users })
  } else {
    const { listAssignableUsers } = await import('@/server/services/users')
    const users = await listAssignableUsers()
    return NextResponse.json({ users })
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rawBody = await req.json()
    const parsed = userCreateSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid user input', details: parsed.error.flatten() }, { status: 400 })
    }
    const result = await createUser(user, parsed.data)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== 'OWNER' && user.role !== 'TL') {
    return NextResponse.json({ error: 'Forbidden: Only Owner and Team Lead can manage team members.' }, { status: 403 })
  }

  try {
    const rawBody = await req.json()
    const parsed = userActionSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid team action input', details: parsed.error.flatten() }, { status: 400 })
    }

    const { userId, action, role } = parsed.data

    if (action === 'APPROVE' || action === 'REJECT') {
      const { reviewUserRegistration } = await import('@/server/services/users')
      const result = await reviewUserRegistration(user, { userId, action, role })
      return NextResponse.json(result)
    }

    if (action === 'DISCONTINUE') {
      const { discontinueUser } = await import('@/server/services/users')
      const result = await discontinueUser(user, userId)
      return NextResponse.json(result)
    }

    if (action === 'REACTIVATE') {
      const { reactivateUser } = await import('@/server/services/users')
      const result = await reactivateUser(user, userId)
      return NextResponse.json(result)
    }

    if (action === 'RESET_PASSWORD') {
      if (user.role !== 'OWNER') {
        return NextResponse.json({ error: 'Forbidden: Only an OWNER can reset user credentials.' }, { status: 403 })
      }
      if (!parsed.data.newPassword) {
        return NextResponse.json({ error: 'newPassword is required' }, { status: 400 })
      }
      const { resetUserPasswordByOwner } = await import('@/server/services/users')
      const result = await resetUserPasswordByOwner(user, userId, parsed.data.newPassword)
      return NextResponse.json(result)
    }

    if (action === 'CHANGE_ROLE') {
      if (user.role !== 'OWNER') {
        return NextResponse.json({ error: 'Forbidden: Only an OWNER can change user roles.' }, { status: 403 })
      }
      if (!role) {
        return NextResponse.json({ error: 'role is required to change user role' }, { status: 400 })
      }
      const { changeUserRole } = await import('@/server/services/users')
      const result = await changeUserRole(user, userId, role, parsed.data.confirmOwnerChange)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== 'OWNER' && user.role !== 'TL') {
    return NextResponse.json({ error: 'Forbidden: Only Owner and Team Lead can remove team members.' }, { status: 403 })
  }

  try {
    const rawBody = await req.json()
    const parsed = userDeleteSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid user deletion input', details: parsed.error.flatten() }, { status: 400 })
    }

    const { deleteUser } = await import('@/server/services/users')
    const result = await deleteUser(user, parsed.data.userId)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
