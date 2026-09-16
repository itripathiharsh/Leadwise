import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { markConversationAsRead } from '@/server/services/chat'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  await markConversationAsRead(user.id, id)
  return NextResponse.json({ success: true })
}
