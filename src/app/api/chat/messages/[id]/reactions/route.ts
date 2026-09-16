import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { toggleMessageReaction, getMessageReactions } from '@/server/services/chat'
import { ForbiddenError } from '@/lib/rbac'
import { NotFoundError, ValidationError } from '@/server/errors'
import { z } from 'zod'

const reactionPayloadSchema = z.object({
  emoji: z.string().min(1, 'Emoji is required').max(16, 'Emoji too long'),
})

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const reactions = await getMessageReactions(user.id, id)
    return NextResponse.json({ reactions })
  } catch (err: any) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: err.message || 'Failed to fetch reactions' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const json = await req.json()
    const parsed = reactionPayloadSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid reaction payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await toggleMessageReaction(user.id, id, parsed.data.emoji)
    return NextResponse.json(result)
  } catch (err: any) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: err.message || 'Failed to update reaction' },
      { status: 500 }
    )
  }
}
