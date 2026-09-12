import { NextResponse } from 'next/server'
import { scanAndGenerateReminders } from '@/server/services/notifications'
import { isCronAuthorized } from '@/lib/auth/cron-auth'

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await scanAndGenerateReminders()
    return NextResponse.json({
      success: true,
      scanned: result.scanned,
      notificationsCreated: result.created,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  return GET(req)
}
