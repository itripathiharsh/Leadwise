import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
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
