import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { listUsers, createUser, getTeamPerformance } from '@/server/services/users'
import { userCreateSchema } from '@/lib/validation'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== 'OWNER' && user.role !== 'TL') {
    return NextResponse.json({ error: 'Forbidden: Only Owner and Team Lead have access to team works.' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  if (searchParams.get('performance') === 'true') {
    const performance = await getTeamPerformance(user)
    return NextResponse.json({ performance })
  }

  const users = await listUsers(user)
  return NextResponse.json({ users })
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
