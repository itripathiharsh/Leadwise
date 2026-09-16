import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { getConversation } from '@/server/services/chat'
import { ForbiddenError } from '@/lib/rbac'
import { NotFoundError } from '@/server/errors'

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
    const conv = await getConversation(user.id, id)
    return NextResponse.json(conv)
  } catch (err: any) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: err.message || 'Failed to load conversation' },
      { status: 500 }
    )
  }
}
