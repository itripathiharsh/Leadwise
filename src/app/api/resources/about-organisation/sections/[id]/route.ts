import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { updateSection, deleteSection } from '@/server/services/handbook/handbook'
import { ForbiddenError } from '@/lib/rbac'

const updateSectionSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  subtitle: z.string().max(250).nullable().optional(),
  badge: z.string().max(60).nullable().optional(),
  content: z.string().max(50000).nullable().optional(),
  data: z.any().optional(),
  isVisible: z.boolean().optional(),
  saveAsDraft: z.boolean().optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const rawBody = await req.json()
    const parsed = updateSectionSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid section data', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const section = await updateSection(user, id, parsed.data)
    return NextResponse.json({ success: true, section })
  } catch (err: unknown) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    await deleteSection(user, id)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
