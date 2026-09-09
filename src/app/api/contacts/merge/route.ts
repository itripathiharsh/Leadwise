import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { mergeContacts } from '@/server/services/merge'

const contactMergeSchema = z.object({
  sourceId: z.string().min(1, 'sourceId is required').max(64),
  targetId: z.string().min(1, 'targetId is required').max(64),
})

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rawBody = await req.json()
    const parsed = contactMergeSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid contact merge request', details: parsed.error.flatten() }, { status: 400 })
    }
    const { sourceId, targetId } = parsed.data

    if (sourceId === targetId) {
      return NextResponse.json({ error: 'Source and target contacts cannot be the same.' }, { status: 400 })
    }

    const result = await mergeContacts(user, sourceId, targetId)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
