import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { prisma } from '@/lib/db'
import { canReadOrganisation } from '@/lib/rbac'
import { scoreOrganisation, recommendTodayPriorities } from '@/server/services/ai/intelligence'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get('orgId')
  const priorities = searchParams.get('priorities')

  try {
    if (priorities === 'true') {
      const items = await recommendTodayPriorities(user)
      return NextResponse.json({ priorities: items })
    }

    if (orgId) {
      const org = await prisma.organisation.findFirst({
        where: { id: orgId, deletedAt: null },
        select: { id: true, assignedToId: true, createdById: true },
      })
      if (!org) {
        return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
      }
      if (!canReadOrganisation(user, org)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const intel = await scoreOrganisation(orgId)
      return NextResponse.json({ intelligence: intel })
    }

    return NextResponse.json({ error: 'orgId or priorities=true is required.' }, { status: 400 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
