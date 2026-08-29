import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import {
  listTags,
  createTag,
  assignTagToOrganisation,
  removeTagFromOrganisation,
} from '@/server/services/tags'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tags = await listTags()
  return NextResponse.json({ tags })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()

    if (body.action === 'ASSIGN_ORG') {
      await assignTagToOrganisation(user, body.organisationId, body.tagId)
      return NextResponse.json({ success: true })
    }

    if (body.action === 'REMOVE_ORG') {
      await removeTagFromOrganisation(user, body.organisationId, body.tagId)
      return NextResponse.json({ success: true })
    }

    const tag = await createTag(user, { name: body.name, color: body.color })
    return NextResponse.json({ success: true, tag })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
