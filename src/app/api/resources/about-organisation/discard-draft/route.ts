import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { discardDraft } from '@/server/services/handbook/handbook'
import { ForbiddenError } from '@/lib/rbac'

export async function POST(_req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await discardDraft(user)
    return NextResponse.json(result)
  } catch (err: unknown) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
