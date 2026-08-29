import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/server/services/notifications'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const preferences = await getNotificationPreferences(user.id)
  return NextResponse.json({ preferences })
}

export async function PUT(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const updated = await updateNotificationPreferences(user.id, body)

  return NextResponse.json({ success: true, preferences: updated })
}
