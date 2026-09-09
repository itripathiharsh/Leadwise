import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { updateTemplate, deleteTemplate } from '@/server/services/templates'

const templateUpdateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  category: z.string().min(1).max(60).optional(),
  subcategory: z.string().max(60).nullable().optional(),
  subject: z.string().max(200).nullable().optional(),
  body: z.string().min(1).max(10000).optional(),
})

export async function PUT(
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
    const parsed = templateUpdateSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid template update input', details: parsed.error.flatten() }, { status: 400 })
    }
    const result = await updateTemplate(user, id, parsed.data)
    return NextResponse.json({ success: true, template: result })
  } catch (err: unknown) {
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
    await deleteTemplate(user, id)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
