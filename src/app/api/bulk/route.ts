import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { bulkUpdateOrganisationStatus, bulkAssignOrganisations } from '@/server/services/bulk'
import { bulkSchema } from '@/lib/validation'

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const parsed = bulkSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: "Invalid bulk input", details: parsed.error.flatten() }, { status: 400 })
    const body = parsed.data
    const { action, orgIds, status, rejectionReason, assignedToId } = body

    if (action === 'STATUS') {
      if (!status) {
        return NextResponse.json({ error: 'Status is required for STATUS action' }, { status: 400 })
      }
      const result = await bulkUpdateOrganisationStatus(user, orgIds, status, rejectionReason)
      return NextResponse.json(result)
    }

    if (action === 'ASSIGN') {
      const result = await bulkAssignOrganisations(user, orgIds, assignedToId ?? null)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Unknown bulk action' }, { status: 400 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
