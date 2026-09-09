import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import {
  generateEodReport,
  getEodReport,
  listEodReports,
  markEodSent,
} from '@/server/services/eod'
import { todayKey } from '@/lib/dates'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== 'OWNER' && user.role !== 'TL') {
    return NextResponse.json({ error: 'Forbidden: Only Owner and Team Lead have access to EOD reports.' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const dateKey = searchParams.get('dateKey') || todayKey()
  const history = searchParams.get('history') === 'true'

  if (history) {
    const list = await listEodReports(30)
    return NextResponse.json({ history: list })
  }

  const report = await getEodReport(dateKey)
  return NextResponse.json({ report, dateKey })
}

const eodActionSchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  markSent: z.boolean().optional(),
  forceRegenerate: z.boolean().optional(),
  skipAi: z.boolean().optional(),
})

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== 'OWNER' && user.role !== 'TL') {
    return NextResponse.json({ error: 'Forbidden: Only Owner and Team Lead can generate or update EOD reports.' }, { status: 403 })
  }

  try {
    let rawBody = {}
    try {
      rawBody = await req.json()
    } catch {
      rawBody = {}
    }

    const parsed = eodActionSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid EOD request', details: parsed.error.flatten() }, { status: 400 })
    }

    const body = parsed.data
    const dateKey = body.dateKey || todayKey()

    if (body.markSent) {
      const result = await markEodSent(user, dateKey)
      return NextResponse.json({ success: true, ...result })
    }

    const result = await generateEodReport(user, {
      dateKey,
      regenerate: body.forceRegenerate ?? false,
      skipAi: body.skipAi ?? false,
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
