import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { createConversationSchema } from '@/lib/validation'
import {
  listUserConversations,
  createOrGetDm,
  createChannel,
} from '@/server/services/chat'
import { ForbiddenError } from '@/lib/rbac'
import { NotFoundError, ValidationError, ConflictError } from '@/server/errors'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await listUserConversations(user.id)
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to list conversations' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const json = await req.json()
    const parsed = createConversationSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const payload = parsed.data

    if (payload.type === 'DM') {
      const dm = await createOrGetDm(user.id, payload.recipientId)
      return NextResponse.json(dm, { status: 200 })
    }

    if (payload.type === 'CHANNEL') {
      const channel = await createChannel(user.id, user.role, {
        name: payload.name,
        description: payload.description,
        memberIds: payload.memberIds,
      })
      return NextResponse.json(channel, { status: 201 })
    }

    return NextResponse.json({ error: 'Invalid conversation type' }, { status: 400 })
  } catch (err: any) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    if (err instanceof ConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    return NextResponse.json(
      { error: err.message || 'Failed to create conversation' },
      { status: 500 }
    )
  }
}
