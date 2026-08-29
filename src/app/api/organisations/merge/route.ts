import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { previewOrganisationMerge, mergeOrganisations } from '@/server/services/merge'

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { sourceId, targetId, preview } = body

    if (!sourceId || !targetId) {
      return NextResponse.json({ error: 'Both sourceId and targetId are required.' }, { status: 400 })
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
