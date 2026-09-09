import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import {
  listTags,
  createTag,
  assignTagToOrganisation,
  removeTagFromOrganisation,
} from '@/server/services/tags'

const tagMutationSchema = z.union([
  z.object({
    action: z.literal('ASSIGN_ORG'),
    organisationId: z.string().min(1, 'organisationId is required').max(64),
    tagId: z.string().min(1, 'tagId is required').max(64),
  }),
  z.object({
    action: z.literal('REMOVE_ORG'),
    organisationId: z.string().min(1, 'organisationId is required').max(64),
    tagId: z.string().min(1, 'tagId is required').max(64),
  }),
  z.object({
    action: z.undefined().optional(),
    name: z.string().min(1, 'Tag name is required').max(60),
    color: z.string().max(40).optional(),
  }),
])

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
    const rawBody = await req.json()
    const parsed = tagMutationSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid tag payload', details: parsed.error.flatten() }, { status: 400 })
    }
    const data = parsed.data

    if (data.action === 'ASSIGN_ORG') {
      await assignTagToOrganisation(user, data.organisationId, data.tagId)
      return NextResponse.json({ success: true })
    }

    if (data.action === 'REMOVE_ORG') {
      await removeTagFromOrganisation(user, data.organisationId, data.tagId)
      return NextResponse.json({ success: true })
    }

    const tag = await createTag(user, { name: data.name, color: data.color })
    return NextResponse.json({ success: true, tag })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
