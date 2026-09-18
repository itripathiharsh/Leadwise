import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { getHandbook, updateHandbookMetadata } from '@/server/services/handbook/handbook'
import { ForbiddenError } from '@/lib/rbac'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const modeParam = searchParams.get('mode')
  const mode = modeParam === 'edit' ? 'edit' : modeParam === 'preview' ? 'preview' : 'read'

  try {
    const data = await getHandbook(user, mode)
    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

const updateHandbookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(120).optional(),
  subtitle: z.string().max(200).optional(),
})

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rawBody = await req.json()
    const parsed = updateHandbookSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const updated = await updateHandbookMetadata(user, parsed.data)
    return NextResponse.json({ success: true, handbook: updated })
  } catch (err: unknown) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
