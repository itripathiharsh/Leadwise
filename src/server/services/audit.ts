import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

/**
 * Audit trail (spec §31).
 *
 * Every consequential write records who did what, to which entity, and — where
 * useful — the before/after values. `entityLabel` is denormalised on purpose so
 * the log still reads correctly after a record is renamed or soft-deleted.
 *
 * Audit writes are best-effort *inside* the caller's transaction when one is
 * passed, so an audit row can never exist for a change that rolled back.
 */

export type AuditAction =
  | 'organisation.created'
  | 'organisation.updated'
  | 'organisation.deleted'
  | 'organisation.restored'
  | 'organisation.assigned'
  | 'organisation.unassigned'
  | 'organisation.reassigned'
  | 'organisation.status_changed'
  | 'organisation.imported'
  | 'contact.created'
  | 'contact.updated'
  | 'contact.deleted'
  | 'contact.status_changed'
  | 'activity.logged'
  | 'activity.updated'
  | 'activity.deleted'
  | 'followup.created'
  | 'followup.completed'
  | 'followup.rescheduled'
  | 'followup.cancelled'
  | 'reassignment.requested'
  | 'reassignment.approved'
  | 'reassignment.rejected'
  | 'eod.generated'
  | 'eod.regenerated'
  | 'eod.sent'
  | 'user.created'
  | 'user.updated'
  | 'user.approved'
  | 'user.rejected'
  | 'user.deactivated'
  | 'user.discontinued'
  | 'user.reactivated'
  | 'user.deleted'
  | 'user.password_changed'
  | 'auth.login'
  | 'auth.signup_requested'
  | 'import.completed'
  | 'export.generated'
  | 'settings.updated'

export interface AuditInput {
  userId: string | null
  action: AuditAction
  entityType: 'organisation' | 'contact' | 'activity' | 'followup' | 'user' | 'eod' | 'import' | 'settings' | 'auth'
  entityId: string
  entityLabel?: string | null
  summary: string
  before?: Prisma.InputJsonValue | null
  after?: Prisma.InputJsonValue | null
}

type Client = Prisma.TransactionClient | typeof prisma

export async function writeAudit(input: AuditInput, client: Client = prisma): Promise<void> {
  await client.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      entityLabel: input.entityLabel ?? null,
      summary: input.summary,
      before: input.before ?? undefined,
      after: input.after ?? undefined,
    },
  })
}

/**
 * Fire-and-forget variant for non-critical trails (login, export) where an
 * audit failure must not break the user's action.
 */
export async function writeAuditSafe(input: AuditInput): Promise<void> {
  try {
    await writeAudit(input)
  } catch (error) {
    console.error('[audit] failed to write audit entry', {
      action: input.action,
      entityId: input.entityId,
      error,
    })
  }
}

export interface AuditListOptions {
  entityType?: string
  entityId?: string
  userId?: string
  action?: string
  take?: number
  skip?: number
}

export async function listAudit(options: AuditListOptions = {}) {
  const { entityType, entityId, userId, action, take = 50, skip = 0 } = options

  const where: Prisma.AuditLogWhereInput = {
    ...(entityType ? { entityType } : {}),
    ...(entityId ? { entityId } : {}),
    ...(userId ? { userId } : {}),
    ...(action ? { action } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        user: { select: { id: true, name: true, avatarColor: true, role: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ])

  return { items, total }
}
