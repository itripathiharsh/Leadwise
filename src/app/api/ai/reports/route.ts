import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import {
  getAdvancedOutreachAnalytics,
  generateOwnerExecutiveInsights,
} from '@/server/services/ai/analytics-intelligence'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode')

  try {
    if (mode === 'insights') {
      const insights = await generateOwnerExecutiveInsights(user)
      return NextResponse.json(insights)
    }

    const analytics = await getAdvancedOutreachAnalytics(user)
    return NextResponse.json(analytics)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
