import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import {
  getOrganisation,
  updateOrganisation,
  changeOrganisationStatus,
  assignOrganisation,
  softDeleteOrganisation,
  restoreOrganisation,
} from '@/server/services/organisations'
import { listActivitiesForOrganisation } from '@/server/services/activities'
import { listFollowUpsForOrganisation } from '@/server/services/followups'
import {
  organisationCreateSchema,
  organisationUpdateSchema,
  organisationStatusSchema,
  organisationAssignSchema,
} from '@/lib/validation'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const org = await getOrganisation(user, id)

  if (!org) {
    return NextResponse.json({ error: 'Organisation not found or unauthorized' }, { status: 404 })
  }

  const [activities, followups] = await Promise.all([
    listActivitiesForOrganisation(user, id),
    listFollowUpsForOrganisation(user, id),
  ])

  return NextResponse.json({
    organisation: org,
    activities,
    followups,
  })
}

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
    const parsed = organisationUpdateSchema.safeParse({ ...rawBody, id })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid organisation update input', details: parsed.error.flatten() }, { status: 400 })
    }
    const result = await updateOrganisation(user, parsed.data)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

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

    if (rawBody?.status) {
      const parsed = organisationStatusSchema.safeParse({ ...rawBody, id })
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid status update', details: parsed.error.flatten() }, { status: 400 })
      }
      const result = await changeOrganisationStatus(user, parsed.data)
      return NextResponse.json({ success: true, ...result })
    }

    if (rawBody?.assignedToId !== undefined) {
      const parsed = organisationAssignSchema.safeParse({ ...rawBody, id })
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid assignment', details: parsed.error.flatten() }, { status: 400 })
      }
      const result = await assignOrganisation(user, parsed.data)
      return NextResponse.json({ success: true, ...result })
    }

    return NextResponse.json({ error: 'Invalid patch payload' }, { status: 400 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const restore = searchParams.get('restore') === 'true'

  try {
    if (restore) {
      await restoreOrganisation(user, id)
      return NextResponse.json({ success: true, message: 'Organisation restored' })
    }
    await softDeleteOrganisation(user, id)
    return NextResponse.json({ success: true, message: 'Organisation archived' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
