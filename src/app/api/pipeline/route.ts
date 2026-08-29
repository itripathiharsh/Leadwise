import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { getPipelineBoard, moveOrganisationStage, type LeadHealth } from '@/server/services/pipeline'
import type { Priority } from '@prisma/client'

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
    const body = await req.json()
    const result = await moveOrganisationStage(user, body)
    return NextResponse.json({ success: true, organisation: result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
