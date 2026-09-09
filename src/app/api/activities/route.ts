import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { logActivity, listActivities } from '@/server/services/activities'
import { activityCreateSchema, pageSchema, pageSizeSchema } from '@/lib/validation'
import type { ActivityType } from '@prisma/client'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') as ActivityType | null
  const performer = searchParams.get('performer') || undefined
  const page = pageSchema.parse(searchParams.get('page') || undefined)
  const pageSize = pageSizeSchema.parse(searchParams.get('pageSize') || undefined)

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
    const rawBody = await req.json()
    const parsed = activityCreateSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid activity input', details: parsed.error.flatten() }, { status: 400 })
    }
    const result = await logActivity(user, parsed.data)
    return NextResponse.json({ success: true, ...result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
