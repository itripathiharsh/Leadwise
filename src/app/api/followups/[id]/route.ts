import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { ForbiddenError } from '@/lib/rbac'
import { NotFoundError } from '@/server/errors'
import {
  getFollowUp,
  rescheduleFollowUp,
  setFollowUpStatus,
  softDeleteFollowUp,
} from '@/server/services/followups'
import { dateKeySchema } from '@/lib/validation'

const followUpUpdateSchema = z.object({
  status: z.enum(['PENDING', 'DONE', 'CANCELLED']).optional(),
  dueDate: dateKeySchema.optional(),
  note: z.string().max(1000).optional(),
})

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const followUp = await getFollowUp(user, id)
    return NextResponse.json({ followUp })
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
    const rawBody = await req.json()
    const parsed = followUpUpdateSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid update data', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { status, dueDate, note } = parsed.data
    let result: any = { id }

    if (dueDate) {
      result = await rescheduleFollowUp(user, { id, dueDate, note })
    }
    if (status) {
      result = await setFollowUpStatus(user, { id, status })
    }

    return NextResponse.json({ success: true, ...result })
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
    await softDeleteFollowUp(user, id)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const status = err instanceof ForbiddenError ? 403 : err instanceof NotFoundError ? 404 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}
