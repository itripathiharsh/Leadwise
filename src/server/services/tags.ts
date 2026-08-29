import { prisma } from '@/lib/db'
import type { CurrentUser } from '@/lib/auth/current-user'
import { assertCan } from '@/lib/rbac'
import { NotFoundError } from '@/server/errors'

export async function listTags() {
  return prisma.tag.findMany({
    where: { isArchived: false },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { organisations: true, contacts: true } },
    },
  })
}

export async function createTag(
  user: CurrentUser,
  input: { name: string; color?: string },
) {
  assertCan(user, 'org:edit')

  const normalized = input.name.trim().toLowerCase()
  return prisma.tag.upsert({
    where: { name: normalized },
    create: {
      name: normalized,
      color: input.color || 'violet',
      createdById: user.id,
    },
    update: {
      isArchived: false,
      color: input.color || undefined,
    },
  })
}

export async function assignTagToOrganisation(
  user: CurrentUser,
  organisationId: string,
  tagId: string,
) {
  assertCan(user, 'org:edit')

  return prisma.organisationTag.upsert({
    where: {
      organisationId_tagId: { organisationId, tagId },
    },
    create: { organisationId, tagId },
    update: {},
  })
}

export async function removeTagFromOrganisation(
  user: CurrentUser,
  organisationId: string,
  tagId: string,
) {
  assertCan(user, 'org:edit')

  return prisma.organisationTag.deleteMany({
    where: { organisationId, tagId },
  })
}
