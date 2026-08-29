import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import {
  getOrganisation,
  updateOrganisation,
  changeOrganisationStatus,
  assignOrganisation,
} from '@/server/services/organisations'
import { listActivitiesForOrganisation } from '@/server/services/activities'
import { listFollowUpsForOrganisation } from '@/server/services/followups'

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
    const body = await req.json()
    const result = await updateOrganisation(user, { ...body, id })
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
    const body = await req.json()

    if (body.status) {
      const result = await changeOrganisationStatus(user, { id, status: body.status })
      return NextResponse.json({ success: true, ...result })
    }

    if (body.assignedToId !== undefined) {
      const result = await assignOrganisation(user, {
        id,
        assignedToId: body.assignedToId,
      })
      return NextResponse.json({ success: true, ...result })
    }

    return NextResponse.json({ error: 'Invalid patch payload' }, { status: 400 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
