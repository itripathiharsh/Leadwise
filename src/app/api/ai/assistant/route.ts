import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { prisma } from '@/lib/db'
import { canReadOrganisation } from '@/lib/rbac'
import { generateCallPrep, summarizeCallNotes } from '@/server/services/ai/assistant'

const aiAssistantSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('CALL_PREP'),
    orgId: z.string().min(1, 'orgId is required'),
    contactId: z.string().optional(),
  }),
  z.object({
    action: z.literal('SUMMARIZE_NOTES'),
    rawNotes: z.string().min(1, 'rawNotes is required'),
  }),
])

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rawBody = await req.json()
    const parsed = aiAssistantSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.format() }, { status: 400 })
    }
    const body = parsed.data

    if (body.action === 'CALL_PREP') {
      const org = await prisma.organisation.findFirst({
        where: { id: body.orgId, deletedAt: null },
        select: { id: true, assignedToId: true, createdById: true },
      })
      if (!org) {
        return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
      }
      if (!canReadOrganisation(user, org)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const prep = await generateCallPrep(body.orgId, body.contactId)
      return NextResponse.json({ callPrep: prep })
    }

    if (body.action === 'SUMMARIZE_NOTES') {
      const summary = await summarizeCallNotes(body.rawNotes)
      return NextResponse.json(summary)
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
