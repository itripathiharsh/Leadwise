import { z } from 'zod'
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

const notificationPreferencesSchema = z.object({
  followUpReminders: z.boolean().optional(),
  followUpReminderTiming: z.enum(['SAME_DAY', 'ONE_DAY_BEFORE']).optional(),
  overdueReminders: z.boolean().optional(),
  meetingReminders: z.boolean().optional(),
  assignmentNotifications: z.boolean().optional(),
  backupAlerts: z.boolean().optional(),
})

export async function PUT(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rawBody = await req.json()
    const parsed = notificationPreferencesSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid notification preferences', details: parsed.error.flatten() }, { status: 400 })
    }
    const updated = await updateNotificationPreferences(user.id, parsed.data)
    return NextResponse.json({ success: true, preferences: updated })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
