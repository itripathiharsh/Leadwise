import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import {
  listFollowUps,
  completeFollowUp,
  createFollowUp,
} from '@/server/services/followups'
import { pageSchema, pageSizeSchema, followUpCreateSchema } from '@/lib/validation'

const followUpActionSchema = z.object({
  id: z.string().min(1, 'Follow-up ID is required').max(64),
  action: z.literal('COMPLETE'),
})

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const bucket = (searchParams.get('bucket') as any) || undefined
  const from = searchParams.get('from') || undefined
  const to = searchParams.get('to') || undefined
  const page = pageSchema.parse(searchParams.get('page') || undefined)
  const pageSize = pageSizeSchema.parse(searchParams.get('pageSize') || undefined)

  const result = await listFollowUps(user, { bucket, from, to, page, pageSize })
  return NextResponse.json(result)
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rawBody = await req.json()
    const parsed = followUpActionSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid follow-up action', details: parsed.error.flatten() }, { status: 400 })
    }
    const result = await completeFollowUp(user, parsed.data.id)
    return NextResponse.json({ success: true, ...result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rawBody = await req.json()
    const parsed = followUpCreateSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid follow-up input', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const result = await createFollowUp(user, parsed.data)
    return NextResponse.json({ success: true, followUp: result }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
