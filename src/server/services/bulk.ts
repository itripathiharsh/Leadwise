import { prisma } from '@/lib/db'
import type { CurrentUser } from '@/lib/auth/current-user'
import { assertCan } from '@/lib/rbac'
import type { OrgStatus } from '@prisma/client'
import { writeAudit } from './audit'
import { recomputeOrganisationCaches } from './caches'
import { ValidationError } from '@/server/errors'

export async function bulkUpdateOrganisationStatus(
  user: CurrentUser,
  orgIds: string[],
  status: OrgStatus,
  rejectionReason?: string,
) {
  assertCan(user, 'org:edit')
  if (!orgIds || orgIds.length === 0) {
    throw new ValidationError('No organisation IDs provided.')
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.organisation.updateMany({
      where: { id: { in: orgIds }, deletedAt: null },
      data: {
        status,
        ...(rejectionReason !== undefined ? { rejectionReason } : {}),
      },
    })

    // Recompute caches
    for (const id of orgIds) {
      await recomputeOrganisationCaches(tx, id)
    }

    await writeAudit(
      {
        userId: user.id,
        action: 'organisation.status_changed',
        entityType: 'organisation',
        entityId: 'bulk',
        entityLabel: `${orgIds.length} organisations`,
        summary: `${user.name} bulk changed status of ${orgIds.length} organisations to ${status}${
          rejectionReason ? ` (Reason: ${rejectionReason})` : ''
        }`,
        after: { status, count: orgIds.length },
      },
      tx,
    )

    return updated
  })

  return { success: true, count: result.count }
}

export async function bulkAssignOrganisations(
  user: CurrentUser,
  orgIds: string[],
  assignedToId: string | null,
) {
  assertCan(user, 'org:assign')
  if (!orgIds || orgIds.length === 0) {
    throw new ValidationError('No organisation IDs provided.')
  }

  const assignee = assignedToId
    ? await prisma.user.findUnique({ where: { id: assignedToId }, select: { id: true, name: true } })
    : null

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.organisation.updateMany({
      where: { id: { in: orgIds }, deletedAt: null },
      data: { assignedToId },
    })

    // Also reassign contacts
    await tx.contact.updateMany({
      where: { organisationId: { in: orgIds }, deletedAt: null },
      data: { assignedToId },
    })

    await writeAudit(
      {
        userId: user.id,
        action: 'organisation.assigned',
        entityType: 'organisation',
        entityId: 'bulk',
        entityLabel: `${orgIds.length} organisations`,
        summary: `${user.name} bulk assigned ${orgIds.length} organisations to ${assignee?.name || 'Unassigned'}`,
        after: { assignedToId, assigneeName: assignee?.name || null, count: orgIds.length },
      },
      tx,
    )

    return updated
  })

  return { success: true, count: result.count }
}

export async function bulkUpdatePriority(
  user: CurrentUser,
  orgIds: string[],
  priority: 'HIGH' | 'MEDIUM' | 'LOW',
) {
  assertCan(user, 'org:edit')
  if (!orgIds || orgIds.length === 0) {
    throw new ValidationError('No organisation IDs provided.')
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.organisation.updateMany({
      where: { id: { in: orgIds }, deletedAt: null },
      data: { priority },
    })

    await writeAudit(
      {
        userId: user.id,
        action: 'organisation.updated',
        entityType: 'organisation',
        entityId: 'bulk',
        entityLabel: `${orgIds.length} organisations`,
        summary: `${user.name} bulk changed priority of ${orgIds.length} organisations to ${priority}`,
        after: { priority, count: orgIds.length },
      },
      tx,
    )

    return updated
  })

  return { success: true, count: result.count }
}

export async function bulkSoftDelete(
  user: CurrentUser,
  orgIds: string[],
) {
  assertCan(user, 'org:delete')
  if (!orgIds || orgIds.length === 0) {
    throw new ValidationError('No organisation IDs provided.')
  }

  const now = new Date()

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.organisation.updateMany({
      where: { id: { in: orgIds }, deletedAt: null },
      data: { deletedAt: now },
    })

    // Also soft-delete associated contacts
    await tx.contact.updateMany({
      where: { organisationId: { in: orgIds }, deletedAt: null },
      data: { deletedAt: now },
    })

    await writeAudit(
      {
        userId: user.id,
        action: 'organisation.deleted',
        entityType: 'organisation',
        entityId: 'bulk',
        entityLabel: `${orgIds.length} organisations`,
        summary: `${user.name} bulk archived ${orgIds.length} organisations`,
        after: { count: orgIds.length, deletedAt: now.toISOString() },
      },
      tx,
    )

    return updated
  })

  return { success: true, count: result.count }
}
