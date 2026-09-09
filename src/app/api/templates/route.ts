import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { listTemplates, createTemplate } from '@/server/services/templates'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') || undefined

  const templates = await listTemplates(user, category)
  return NextResponse.json({ templates })
}

const templateCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(120),
  category: z.string().min(1, 'Category is required').max(60),
  subcategory: z.string().max(60).nullable().optional(),
  subject: z.string().max(200).nullable().optional(),
  body: z.string().min(1, 'Body is required').max(10000),
})

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rawBody = await req.json()
    const parsed = templateCreateSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid template input', details: parsed.error.flatten() }, { status: 400 })
    }
    const template = await createTemplate(user, parsed.data)
    return NextResponse.json({ success: true, template })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
