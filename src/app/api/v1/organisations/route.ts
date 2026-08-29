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
  const take = Math.min(100, parseInt(searchParams.get('limit') || '50', 10))
  const skip = parseInt(searchParams.get('offset') || '0', 10)

  const [organisations, total] = await Promise.all([
    prisma.organisation.findMany({
      where: {
        deletedAt: null,
        AND: [organisationScope(user)],
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        contacts: {
          where: { deletedAt: null },
          select: { id: true, name: true, designation: true, email: true, phone: true, isDecisionMaker: true },
        },
      },
      take,
      skip,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.organisation.count({
      where: {
        deletedAt: null,
        AND: [organisationScope(user)],
      },
    }),
  ])

  return NextResponse.json({
    data: organisations,
    pagination: { total, limit: take, offset: skip },
  })
}
