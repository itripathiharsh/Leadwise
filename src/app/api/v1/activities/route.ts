import { NextResponse } from 'next/server'
import { verifyApiKey } from '@/server/services/api-keys'
import { getCurrentUser } from '@/lib/auth/current-user'
import { prisma } from '@/lib/db'
import { organisationScope } from '@/lib/rbac'

async function resolveUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const rawKey = authHeader.slice(7).trim()
    const user = await verifyApiKey(rawKey)
    if (user) return user
  }
  return getCurrentUser()
}

export async function GET(req: Request) {
  const user = await resolveUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Invalid API Key or session' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const rawLimit = Number(searchParams.get('limit'))
  const rawOffset = Number(searchParams.get('offset'))
  const take = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(100, rawLimit) : 50
  const skip = Number.isInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where: {
        deletedAt: null,
        organisation: organisationScope(user),
      },
      include: {
        organisation: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true, designation: true } },
        performedBy: { select: { id: true, name: true } },
      },
      take,
      skip,
      orderBy: { activityDate: 'desc' },
    }),
    prisma.activity.count({
      where: {
        deletedAt: null,
        organisation: organisationScope(user),
      },
    }),
  ])

  return NextResponse.json({
    data: activities,
    pagination: { total, limit: take, offset: skip },
  })
}
