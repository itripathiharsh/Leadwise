import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import {
  createOrganisation,
  listOrganisations,
  bulkAssignOrganisations,
} from '@/server/services/organisations'
import {
  organisationCreateSchema,
  organisationBulkAssignSchema,
  pageSchema,
  pageSizeSchema,
} from '@/lib/validation'
import type { OrgStatus, Priority } from '@prisma/client'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || undefined
  const status = searchParams.get('status')
    ? (searchParams.get('status')!.split(',') as OrgStatus[])
    : undefined
  const priority = searchParams.get('priority')
    ? (searchParams.get('priority')!.split(',') as Priority[])
    : undefined
  const assignee = searchParams.get('assignee') || undefined
  const category = searchParams.get('category') || undefined
  const followUp = searchParams.get('followUp') as any || undefined
  const sort = (searchParams.get('sort') as any) || undefined
  const page = pageSchema.parse(searchParams.get('page') || undefined)
  const pageSize = pageSizeSchema.parse(searchParams.get('pageSize') || undefined)

  const result = await listOrganisations(user, {
    q,
    status,
    priority,
    assignee,
    category,
    followUp,
    sort,
    page,
    pageSize,
  })

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rawBody = await req.json()
    const parsed = organisationCreateSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid organisation input', details: parsed.error.flatten() }, { status: 400 })
    }
    const result = await createOrganisation(user, parsed.data)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rawBody = await req.json()
    if (rawBody?.bulkAssign) {
      const parsed = organisationBulkAssignSchema.safeParse(rawBody)
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid bulk assign input', details: parsed.error.flatten() }, { status: 400 })
      }
      const result = await bulkAssignOrganisations(user, parsed.data)
      return NextResponse.json({ success: true, ...result })
    }

    return NextResponse.json({ error: 'Invalid operation' }, { status: 400 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
