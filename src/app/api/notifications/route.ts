import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import {
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  deleteNotification,
  clearAllNotifications,
} from '@/server/services/notifications'

const notificationPatchSchema = z.union([
  z.object({
    all: z.literal(true),
  }),
  z.object({
    id: z.string().min(1, 'Notification ID is required').max(64),
  }),
])

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const limitParam = searchParams.get('limit')
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 30, 1), 100) : 30
  const onlyUnread = searchParams.get('onlyUnread') === 'true'

  const items = await getUserNotifications(user.id, { limit, onlyUnread })
  return NextResponse.json({ items })
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rawBody = await req.json()
    const parsed = notificationPatchSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.flatten() }, { status: 400 })
    }

    const body = parsed.data
    if ('all' in body && body.all) {
      await markAllNotificationsAsRead(user.id)
      return NextResponse.json({ success: true, markedAll: true })
    }

    if ('id' in body && body.id) {
      await markNotificationAsRead(user.id, body.id)
      return NextResponse.json({ success: true, id: body.id })
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const all = searchParams.get('all') === 'true'

  try {
    if (all) {
      await clearAllNotifications(user.id)
      return NextResponse.json({ success: true, clearedAll: true })
    }

    if (!id) {
      return NextResponse.json({ error: 'Notification ID or all=true is required' }, { status: 400 })
    }

    await deleteNotification(user.id, id)
    return NextResponse.json({ success: true, id })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

