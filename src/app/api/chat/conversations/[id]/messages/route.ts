import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { sendMessageSchema, chatMessagesQuerySchema } from '@/lib/validation'
import { getConversationMessages, sendMessage } from '@/server/services/chat'
import { ForbiddenError } from '@/lib/rbac'
import { NotFoundError, ValidationError } from '@/server/errors'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { searchParams } = new URL(req.url)

  const parsedQuery = chatMessagesQuerySchema.safeParse({
    limit: searchParams.get('limit') || undefined,
    before: searchParams.get('before') || undefined,
  })

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsedQuery.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const messages = await getConversationMessages(user.id, id, parsedQuery.data)
    return NextResponse.json({ messages })
  } catch (err: any) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: err.message || 'Failed to fetch messages' },
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
    const parsed = sendMessageSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid message payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const message = await sendMessage(user.id, id, parsed.data.content)
    return NextResponse.json(message, { status: 201 })
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
      { error: err.message || 'Failed to send message' },
      { status: 500 }
    )
  }
}
