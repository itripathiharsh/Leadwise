import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { listSavedViews, createSavedView, deleteSavedView } from '@/server/services/views'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const entityType = searchParams.get('entityType') || undefined

  const views = await listSavedViews(user, entityType)
  return NextResponse.json({ views })
}

const savedViewCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  entityType: z.string().min(1, 'entityType is required').max(64),
  filters: z.record(z.unknown()),
  isShared: z.boolean().optional(),
})

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rawBody = await req.json()
    const parsed = savedViewCreateSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid saved view input', details: parsed.error.flatten() }, { status: 400 })
    }
    const view = await createSavedView(user, parsed.data)
    return NextResponse.json({ success: true, view })
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
    return NextResponse.json({ error: 'id parameter is required' }, { status: 400 })
  }

  await deleteSavedView(user, id)
  return NextResponse.json({ success: true })
}
