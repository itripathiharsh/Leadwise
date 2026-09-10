import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { prisma } from '@/lib/db'
import { pageSchema, pageSizeSchema } from '@/lib/validation'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role === 'INTERN') {
    return NextResponse.json({ error: 'Forbidden: Access restricted to leaders' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const pageParsed = pageSchema.safeParse(searchParams.get('page') ?? undefined)
  const pageSizeParsed = pageSizeSchema.safeParse(searchParams.get('pageSize') ?? undefined)
  const page = pageParsed.success ? pageParsed.data : 1
  const pageSize = pageSizeParsed.success ? pageSizeParsed.data : 30

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, name: true, avatarColor: true } },
      },
    }),
    prisma.auditLog.count(),
  ])

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize),
  })
}
