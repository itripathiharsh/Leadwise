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

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const dateKey = body.dateKey || todayKey()

    if (body.markSent) {
      const result = await markEodSent(user, dateKey)
      return NextResponse.json({ success: true, ...result })
    }

    const result = await generateEodReport(user, {
      dateKey,
      regenerate: body.forceRegenerate ?? false,
      skipAi: false,
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
