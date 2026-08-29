import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { getTeamTargetsAndProgress, setUserTarget, getUserTarget } from '@/server/services/targets'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const dateKey = searchParams.get('date') || undefined
  const userId = searchParams.get('userId') || undefined

  if (userId) {
    const target = await getUserTarget(userId)
    return NextResponse.json({ target })
  }

  const progress = await getTeamTargetsAndProgress(user, dateKey)
  return NextResponse.json({ progress })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { userId, ...targets } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const updated = await setUserTarget(user, userId, targets)
    return NextResponse.json({ success: true, target: updated })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
