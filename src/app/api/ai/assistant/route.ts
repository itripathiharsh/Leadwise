import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { generateCallPrep, summarizeCallNotes } from '@/server/services/ai/assistant'

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { action, orgId, contactId, rawNotes } = body

    if (action === 'CALL_PREP') {
      if (!orgId) return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
      const prep = await generateCallPrep(orgId, contactId)
      return NextResponse.json({ callPrep: prep })
    }

    if (action === 'SUMMARIZE_NOTES') {
      if (!rawNotes) return NextResponse.json({ error: 'rawNotes is required' }, { status: 400 })
      const summary = await summarizeCallNotes(rawNotes)
      return NextResponse.json(summary)
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
