import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { getUnreadNotificationCount } from '@/server/services/notifications'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const count = await getUnreadNotificationCount(user.id)
  return NextResponse.json({ count })
}
