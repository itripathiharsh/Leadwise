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

  if (wantsPerformance) {
    if (user.role !== 'OWNER' && user.role !== 'TL') {
      return NextResponse.json({ error: 'Forbidden: Only Owner and Team Lead have access to team performance.' }, { status: 403 })
    }
    const performance = await getTeamPerformance(user)
    return NextResponse.json({ performance })
  }

  // If user is Owner or TL, give full team member stats, otherwise return lightweight assignable list
  if (user.role === 'OWNER' || user.role === 'TL') {
    const users = await listUsers(user)
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
