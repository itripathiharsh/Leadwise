import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { ForbiddenError } from '@/lib/rbac'
import { NotFoundError } from '@/server/errors'
import { getContact, updateContact, softDeleteContact } from '@/server/services/contacts'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const contact = await getContact(user, id)
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

  return NextResponse.json({ contact })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const body = await req.json()
    const result = await updateContact(user, { ...body, id })
    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const status = err instanceof ForbiddenError ? 403 : err instanceof NotFoundError ? 404 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    await softDeleteContact(user, id)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const status = err instanceof ForbiddenError ? 403 : err instanceof NotFoundError ? 404 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}
