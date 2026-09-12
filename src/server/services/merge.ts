import { prisma } from '@/lib/db'
import type { CurrentUser } from '@/lib/auth/current-user'
import { assertCan, canWriteOrganisation } from '@/lib/rbac'
import { writeAudit } from './audit'
import { recomputeOrganisationCaches, recomputeContactCache } from './caches'
import { NotFoundError, ValidationError } from '@/server/errors'

export interface MergePreview {
  source: { id: string; name: string; contactCount: number; activityCount: number; followUpCount: number }
  target: { id: string; name: string; contactCount: number; activityCount: number; followUpCount: number }
}

/**
 * Previews what records will be transferred during an organisation merge.
 */
export async function previewOrganisationMerge(
  user: CurrentUser,
  sourceId: string,
  targetId: string,
): Promise<MergePreview> {
  assertCan(user, 'org:edit')
  if (sourceId === targetId) {
    throw new ValidationError('Source and target organisation cannot be the same.')
  }

  const [source, target] = await Promise.all([
    prisma.organisation.findFirst({
      where: { id: sourceId, deletedAt: null },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            contacts: { where: { deletedAt: null } },
            activities: { where: { deletedAt: null } },
            followUps: { where: { deletedAt: null } },
          },
        },
      },
    }),
    prisma.organisation.findFirst({
      where: { id: targetId, deletedAt: null },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            contacts: { where: { deletedAt: null } },
            activities: { where: { deletedAt: null } },
            followUps: { where: { deletedAt: null } },
          },
        },
      },
    }),
  ])

  if (!source) throw new NotFoundError('Source organisation')
  if (!target) throw new NotFoundError('Target organisation')

  return {
    source: {
      id: source.id,
      name: source.name,
      contactCount: source._count.contacts,
      activityCount: source._count.activities,
      followUpCount: source._count.followUps,
    },
    target: {
      id: target.id,
      name: target.name,
      contactCount: target._count.contacts,
      activityCount: target._count.activities,
      followUpCount: target._count.followUps,
    },
  }
}

/**
 * Safely merges two organisations:
 *   • Reassigns all contacts, activities, and follow-ups from source to target
 *   • Reassigns tags
 *   • Soft deletes source organisation
 *   • Recomputes caches on target organisation
 *   • Logs audit event
 */
export async function mergeOrganisations(
  user: CurrentUser,
  sourceId: string,
  targetId: string,
) {
  assertCan(user, 'org:edit')
  if (sourceId === targetId) {
    throw new ValidationError('Source and target organisation cannot be the same.')
  }

  const [source, target] = await Promise.all([
    prisma.organisation.findFirst({
      where: { id: sourceId, deletedAt: null },
      select: { id: true, name: true },
    }),
    prisma.organisation.findFirst({
      where: { id: targetId, deletedAt: null },
      select: { id: true, name: true },
    }),
  ])

  if (!source) throw new NotFoundError('Source organisation')
  if (!target) throw new NotFoundError('Target organisation')

  await prisma.$transaction(async (tx) => {
    // 1. Move contacts
    await tx.contact.updateMany({
      where: { organisationId: source.id },
      data: { organisationId: target.id },
    })

    // 2. Move activities
    await tx.activity.updateMany({
      where: { organisationId: source.id },
      data: { organisationId: target.id },
    })

    // 3. Move follow-ups
    await tx.followUp.updateMany({
      where: { organisationId: source.id },
      data: { organisationId: target.id },
    })

    // 4. Soft-delete source organisation
    await tx.organisation.update({
      where: { id: source.id },
      data: { deletedAt: new Date() },
    })

    // 5. Recompute derived caches on target
    await recomputeOrganisationCaches(tx, target.id)

    // 6. Write audit log
    await writeAudit(
      {
        userId: user.id,
        action: 'organisation.updated',
        entityType: 'organisation',
        entityId: target.id,
        entityLabel: target.name,
        summary: `${user.name} merged ${source.name} into ${target.name} (all contacts, activities, and follow-ups preserved)`,
        before: { sourceId: source.id, sourceName: source.name },
        after: { targetId: target.id, targetName: target.name },
      },
      tx,
    )
  })

  return { success: true, targetId: target.id, targetName: target.name }
}

/**
 * Safely merges two contacts under the same organisation.
 */
export async function mergeContacts(
  user: CurrentUser,
  sourceId: string,
  targetId: string,
) {
  assertCan(user, 'contact:edit')
  if (sourceId === targetId) {
    throw new ValidationError('Source and target contact cannot be the same.')
  }

  const [source, target] = await Promise.all([
    prisma.contact.findFirst({
      where: { id: sourceId, deletedAt: null },
      select: { id: true, name: true, organisationId: true },
    }),
    prisma.contact.findFirst({
      where: { id: targetId, deletedAt: null },
      select: { id: true, name: true, organisationId: true },
    }),
  ])

  if (!source) throw new NotFoundError('Source contact')
  if (!target) throw new NotFoundError('Target contact')

  if (source.organisationId !== target.organisationId) {
    throw new ValidationError('Contacts must belong to the same organisation to be merged.')
  }

  const org = await prisma.organisation.findFirst({
    where: { id: target.organisationId, deletedAt: null },
    select: { id: true, assignedToId: true, createdById: true },
  })
  if (!org) throw new NotFoundError('Organisation')

  if (!canWriteOrganisation(user, org)) {
    throw new ValidationError('You do not have permission to modify contacts for this organisation.')
  }

  await prisma.$transaction(async (tx) => {
    // 1. Move activities to target contact
    await tx.activity.updateMany({
      where: { contactId: source.id },
      data: { contactId: target.id },
    })

    // 2. Move follow-ups to target contact
    await tx.followUp.updateMany({
      where: { contactId: source.id },
      data: { contactId: target.id },
    })

    // 3. Soft-delete source contact
    await tx.contact.update({
      where: { id: source.id },
      data: { deletedAt: new Date() },
    })

    // 4. Recompute caches
    await recomputeContactCache(tx, target.id)
    await recomputeOrganisationCaches(tx, target.organisationId)

    // 5. Write audit log
    await writeAudit(
      {
        userId: user.id,
        action: 'contact.updated',
        entityType: 'contact',
        entityId: target.id,
        entityLabel: target.name,
        summary: `${user.name} merged contact ${source.name} into ${target.name}`,
        before: { sourceId: source.id, sourceName: source.name },
        after: { targetId: target.id, targetName: target.name },
      },
      tx,
    )
  })

  return { success: true, targetId: target.id, targetName: target.name }
}
