import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { getGlobalUnreadChatCount } from '@/server/services/chat'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const unreadCount = await getGlobalUnreadChatCount(user.id)
    return NextResponse.json({ unreadCount })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch unread count' },
      { status: 500 }
    )
  }
}
