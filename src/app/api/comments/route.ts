import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { listComments, addComment } from '@/server/services/comments'

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

  const comments = await listComments(organisationId)
  return NextResponse.json({ comments })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { organisationId, comment } = body

    if (!organisationId || !comment) {
      return NextResponse.json({ error: 'organisationId and comment are required' }, { status: 400 })
    }

    const created = await addComment(user, organisationId, comment)
    return NextResponse.json({ success: true, comment: created })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
