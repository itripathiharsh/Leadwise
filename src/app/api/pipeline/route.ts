import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { getPipelineBoard, moveOrganisationStage, type LeadHealth } from '@/server/services/pipeline'
import { OrgStatus, Priority } from '@prisma/client'

const pipelineStageSchema = z.object({
  id: z.string().min(1, 'Organisation ID is required').max(64),
  status: z.nativeEnum(OrgStatus),
  nextAction: z.string().max(300).optional(),
  rejectionReason: z.string().max(300).optional(),
  rejectionNote: z.string().max(500).optional(),
})

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const assignee = searchParams.get('assignee') || undefined
  const priority = (searchParams.get('priority') as Priority) || undefined
  const health = (searchParams.get('health') as LeadHealth) || undefined
  const tag = searchParams.get('tag') || undefined

  const board = await getPipelineBoard(user, { assignee, priority, health, tag })
  return NextResponse.json(board)
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rawBody = await req.json()
    const parsed = pipelineStageSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid pipeline stage input', details: parsed.error.flatten() }, { status: 400 })
    }
    const result = await moveOrganisationStage(user, parsed.data)
    return NextResponse.json({ success: true, organisation: result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
