import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { createContact, listContacts } from '@/server/services/contacts'
import { contactCreateSchema, pageSchema, pageSizeSchema } from '@/lib/validation'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const organisationId = searchParams.get('organisationId') || undefined
  const sort = (searchParams.get('sort') as any) || undefined
  const page = pageSchema.parse(searchParams.get('page') || undefined)
  const pageSize = pageSizeSchema.parse(searchParams.get('pageSize') || undefined)

  const result = await listContacts(user, { q, organisationId, sort, page, pageSize })
  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rawBody = await req.json()
    const parsed = contactCreateSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid contact input', details: parsed.error.flatten() }, { status: 400 })
    }
    const result = await createContact(user, parsed.data)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
