import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { getTeamTargetsAndProgress, setUserTarget, getUserTarget } from '@/server/services/targets'

const targetSetSchema = z.object({
  userId: z.string().min(1, 'userId is required').max(64),
  dailyOrganisations: z.number().int().nonnegative().optional(),
  dailyCalls: z.number().int().nonnegative().optional(),
  dailyEmails: z.number().int().nonnegative().optional(),
  dailyLinkedin: z.number().int().nonnegative().optional(),
  dailyMeetings: z.number().int().nonnegative().optional(),
})

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const dateKey = searchParams.get('date') || undefined
  const userId = searchParams.get('userId') || undefined

  if (userId) {
    if (user.role === 'INTERN' && userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden: Interns can only view their own targets.' }, { status: 403 })
    }
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
    const rawBody = await req.json()
    const parsed = targetSetSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid target input', details: parsed.error.flatten() }, { status: 400 })
    }
    const { userId, ...targets } = parsed.data
    const updated = await setUserTarget(user, userId, targets)
    return NextResponse.json({ success: true, target: updated })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
