import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { previewOrganisationMerge, mergeOrganisations } from '@/server/services/merge'

const orgMergeSchema = z.object({
  sourceId: z.string().min(1, 'sourceId is required').max(64),
  targetId: z.string().min(1, 'targetId is required').max(64),
  preview: z.boolean().optional(),
})

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rawBody = await req.json()
    const parsed = orgMergeSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid merge request', details: parsed.error.flatten() }, { status: 400 })
    }
    const { sourceId, targetId, preview } = parsed.data

    if (sourceId === targetId) {
      return NextResponse.json({ error: 'Source and target organisation cannot be the same.' }, { status: 400 })
    }

    if (preview) {
      const data = await previewOrganisationMerge(user, sourceId, targetId)
      return NextResponse.json({ preview: data })
    }

    const result = await mergeOrganisations(user, sourceId, targetId)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
