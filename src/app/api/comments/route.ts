import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { listComments, addComment, deleteComment } from '@/server/services/comments'

const commentCreateSchema = z.object({
  organisationId: z.string().min(1, 'organisationId is required').max(64),
  comment: z.string().min(1, 'comment is required').max(5000),
})

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const organisationId = searchParams.get('organisationId')
  if (!organisationId) {
    return NextResponse.json({ error: 'organisationId is required' }, { status: 400 })
  }

  try {
    const comments = await listComments(user, organisationId)
    return NextResponse.json({ comments })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 403 })
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rawBody = await req.json()
    const parsed = commentCreateSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid comment input', details: parsed.error.flatten() }, { status: 400 })
    }

    const { organisationId, comment } = parsed.data
    const created = await addComment(user, organisationId, comment)
    return NextResponse.json({ success: true, comment: created })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 })
  }

  try {
    await deleteComment(user, id)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

