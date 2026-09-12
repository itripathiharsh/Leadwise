import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { ForbiddenError } from '@/lib/rbac'
import { NotFoundError } from '@/server/errors'
import { getActivity, updateActivity, softDeleteActivity } from '@/server/services/activities'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const activity = await getActivity(user, id)
    return NextResponse.json({ activity })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const status = err instanceof ForbiddenError ? 403 : err instanceof NotFoundError ? 404 : 400
    return NextResponse.json({ error: msg }, { status })
  }
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
    const result = await updateActivity(user, { ...body, id })
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
    await softDeleteActivity(user, id)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const status = err instanceof ForbiddenError ? 403 : err instanceof NotFoundError ? 404 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}
