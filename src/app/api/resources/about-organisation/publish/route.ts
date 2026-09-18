import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { publishHandbook } from '@/server/services/handbook/handbook'
import { ForbiddenError } from '@/lib/rbac'

const publishSchema = z.object({
  changeSummary: z.string().max(250).optional(),
})

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let changeSummary: string | undefined = undefined
    try {
      const rawBody = await req.json()
      const parsed = publishSchema.safeParse(rawBody)
      if (parsed.success && parsed.data.changeSummary) {
        changeSummary = parsed.data.changeSummary
      }
    } catch {
      // Body may be empty, which is valid
    }

    const result = await publishHandbook(user, changeSummary)
    return NextResponse.json({ success: true, ...result })
  } catch (err: unknown) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
