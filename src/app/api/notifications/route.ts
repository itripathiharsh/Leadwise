import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import {
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/server/services/notifications'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 30
  const onlyUnread = searchParams.get('onlyUnread') === 'true'

  const items = await getUserNotifications(user.id, { limit, onlyUnread })
  return NextResponse.json({ items })
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))

  if (body.all) {
    await markAllNotificationsAsRead(user.id)
    return NextResponse.json({ success: true, markedAll: true })
  }

  if (body.id) {
    await markNotificationAsRead(user.id, body.id)
    return NextResponse.json({ success: true, id: body.id })
  }

  return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
}
