import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { getWeeklyAnalytics } from '@/server/services/analytics'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const analytics = await getWeeklyAnalytics(user)
  return NextResponse.json(analytics)
}
