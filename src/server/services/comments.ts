import { prisma } from '@/lib/db'
import type { CurrentUser } from '@/lib/auth/current-user'
import { assertCan } from '@/lib/rbac'
import { NotFoundError } from '@/server/errors'

export async function listComments(organisationId: string) {
  return prisma.comment.findMany({
    where: { organisationId, deletedAt: null },
    include: {
      author: { select: { id: true, name: true, avatarColor: true, role: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function addComment(
  user: CurrentUser,
  organisationId: string,
  body: string,
) {
  assertCan(user, 'org:edit')

  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { id: true, name: true },
  })

  if (!org) throw new NotFoundError('Organisation')

  // Parse @mentions (e.g. @Harsh, @Priya)
  const mentionMatches = body.match(/@(\w+)/g) || []
  const mentions = mentionMatches.map((m) => m.slice(1).toLowerCase())

  const comment = await prisma.comment.create({
    data: {
      organisationId: org.id,
      authorId: user.id,
      body: body.trim(),
      mentions,
    },
    include: {
      author: { select: { id: true, name: true, avatarColor: true, role: true } },
    },
  })

  // Notify mentioned users
  if (mentions.length > 0) {
    const mentionedUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        name: { in: mentions, mode: 'insensitive' },
      },
      select: { id: true },
    })

    for (const u of mentionedUsers) {
      if (u.id !== user.id) {
        await prisma.notification.create({
          data: {
            userId: u.id,
            type: 'SYSTEM',
            priority: 'INFO',
            title: `${user.name} mentioned you in a note`,
            message: `${user.name} commented on ${org.name}: "${body.slice(0, 80)}..."`,
            linkUrl: `/organisations/${org.id}`,
            entityType: 'organisation',
            entityId: org.id,
          },
        }).catch(() => {})
      }
    }
  }

  return comment
}
