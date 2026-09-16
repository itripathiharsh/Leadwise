import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { listEligibleDmUsers } from '@/server/services/chat'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || undefined

  try {
    const users = await listEligibleDmUsers(user.id, search)
    return NextResponse.json({ users })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to list team members' },
      { status: 500 }
    )
  }
}
