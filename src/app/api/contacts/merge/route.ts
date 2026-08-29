import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { mergeContacts } from '@/server/services/merge'

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { sourceId, targetId } = body

    if (!sourceId || !targetId) {
      return NextResponse.json({ error: 'Both sourceId and targetId are required.' }, { status: 400 })
    }

    const result = await mergeContacts(user, sourceId, targetId)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
