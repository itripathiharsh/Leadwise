import { prisma } from '@/lib/db'
import type { CurrentUser } from '@/lib/auth/current-user'
import { Prisma } from '@prisma/client'

export async function listSavedViews(
  user: CurrentUser,
  entityType?: string,
) {
  return prisma.savedView.findMany({
    where: {
      OR: [
        { createdById: user.id },
        { isShared: true },
      ],
      ...(entityType ? { entityType } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  })
}

export async function createSavedView(
  user: CurrentUser,
  input: {
    name: string
    entityType: string
    filters: Record<string, any>
    isShared?: boolean
  },
) {
  return prisma.savedView.create({
    data: {
      name: input.name.trim(),
      entityType: input.entityType,
      filters: input.filters as Prisma.InputJsonValue,
      isShared: input.isShared ?? false,
      createdById: user.id,
    },
  })
}

export async function deleteSavedView(
  user: CurrentUser,
  id: string,
) {
  return prisma.savedView.deleteMany({
    where: {
      id,
      OR: [
        { createdById: user.id },
        user.role === 'OWNER' || user.role === 'TL' ? {} : { createdById: user.id },
      ],
    },
  })
}
