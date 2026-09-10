import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { listUsers, createUser, getTeamPerformance } from '@/server/services/users'
import { userCreateSchema } from '@/lib/validation'

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
    const body = await req.json()
    const { userId, action, role } = body
    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing userId or action.' }, { status: 400 })
    }

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
    const body = await req.json()
    const { userId } = body
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId.' }, { status: 400 })
    }

    const { deleteUser } = await import('@/server/services/users')
    const result = await deleteUser(user, userId)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
