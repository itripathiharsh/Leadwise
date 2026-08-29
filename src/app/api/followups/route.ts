import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import {
  listFollowUps,
  completeFollowUp,
  createFollowUp,
} from '@/server/services/followups'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const bucket = (searchParams.get('bucket') as any) || undefined
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1
  const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 25

  const result = await listFollowUps(user, { bucket, page, pageSize })
  return NextResponse.json(result)
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    if (body.id && body.action === 'COMPLETE') {
      const result = await completeFollowUp(user, body.id)
      return NextResponse.json({ success: true, ...result })
    }

    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
