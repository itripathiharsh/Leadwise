import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { createSection } from '@/server/services/handbook/handbook'
import { ForbiddenError } from '@/lib/rbac'

const createSectionSchema = z.object({
  sectionType: z.string().min(1, 'Section type is required').max(50),
  title: z.string().min(1, 'Title is required').max(150),
  subtitle: z.string().max(250).nullable().optional(),
  badge: z.string().max(60).nullable().optional(),
  content: z.string().max(50000).nullable().optional(),
  data: z.any().optional(),
  isVisible: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rawBody = await req.json()
    const parsed = createSectionSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid section data', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const section = await createSection(user, parsed.data)
    return NextResponse.json({ success: true, section })
  } catch (err: unknown) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
