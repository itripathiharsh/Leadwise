import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { logActivity, listActivities } from '@/server/services/activities'
import type { ActivityType } from '@prisma/client'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') as ActivityType | null
  const performer = searchParams.get('performer') || undefined
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1
  const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 25

  const result = await listActivities(user, {
    type: type ? [type] : undefined,
    performedById: performer,
    page,
    pageSize,
  })

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const result = await logActivity(user, body)
    return NextResponse.json({ success: true, ...result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
