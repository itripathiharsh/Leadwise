import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { reorderSections } from '@/server/services/handbook/handbook'
import { ForbiddenError } from '@/lib/rbac'

const reorderSchema = z.object({
  sectionIds: z.array(z.string()).min(1, 'sectionIds array is required'),
})

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rawBody = await req.json()
    const parsed = reorderSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid reorder input', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    await reorderSections(user, parsed.data.sectionIds)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
