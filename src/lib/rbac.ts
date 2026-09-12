import type { Role } from '@prisma/client'
import type { CurrentUser } from '@/lib/auth/current-user'

/**
 * Role-based access control.
 *
 * A single permission matrix is the authority for both UI affordances (hiding
 * nav items / buttons) and server-side enforcement. Every mutating server
 * action calls `assertCan` — hiding a button is never treated as security.
 */

export const PERMISSIONS = [
  // Organisations
  'org:viewAll',
  'org:create',
  'org:edit',
  'org:delete',
  'org:assign',
  'org:changeStatus',
  // Contacts
  'contact:create',
  'contact:edit',
  'contact:delete',
  // Activities
  'activity:create',
  'activity:viewAll',
  'activity:delete',
  // Follow-ups
  'followup:create',
  'followup:manageAll',
  // Templates
  'template:manage',
  // Team & admin
  'team:view',
  'user:manage',
  'audit:view',
  'settings:manage',
  // Reporting
  'eod:view',
  'eod:generate',
  'data:import',
  'data:export',
  'backup:manage',
  'reassign:approve',
  'reassign:request',
] as const

export type Permission = (typeof PERMISSIONS)[number]

const OWNER_PERMISSIONS: Permission[] = [...PERMISSIONS]

const TL_PERMISSIONS: Permission[] = PERMISSIONS.filter((p) => p !== 'org:delete')

const INTERN_PERMISSIONS: Permission[] = [
  // Interns see only what is assigned to them — enforced by scope helpers below,
  // not by the absence of a permission.
  'org:create',
  'contact:create',
  'contact:edit',
  'activity:create',
  'org:changeStatus',
  'followup:create',
  'template:manage',
  'reassign:request',
]

const MATRIX: Record<Role, Permission[]> = {
  OWNER: OWNER_PERMISSIONS,
  TL: TL_PERMISSIONS,
  INTERN: INTERN_PERMISSIONS,
}

export function can(user: Pick<CurrentUser, 'role'>, permission: Permission): boolean {
  return MATRIX[user.role].includes(permission)
}

export function canAny(user: Pick<CurrentUser, 'role'>, ...permissions: Permission[]): boolean {
  return permissions.some((p) => can(user, p))
}

/** Thrown by `assertCan`; surfaced to the client as a friendly message. */
export class ForbiddenError extends Error {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export function assertCan(user: Pick<CurrentUser, 'role'>, permission: Permission): void {
  if (!can(user, permission)) throw new ForbiddenError()
}

// ── Data scoping ─────────────────────────────────────────────────────────────

/**
 * Prisma `where` fragment limiting organisations to what `user` may see.
 *
 * Owner/TL see everything. Interns see organisations assigned to them, plus any
 * they created themselves — otherwise an intern who adds an organisation would
 * immediately lose sight of it before a TL assigns it.
 */
export function organisationScope(user: Pick<CurrentUser, 'id' | 'role'>) {
  if (can(user, 'org:viewAll')) return {}
  return {
    OR: [{ assignedToId: user.id }, { createdById: user.id }],
  }
}

/** Same rule, expressed against a Contact (scoped via its organisation). */
export function contactScope(user: Pick<CurrentUser, 'id' | 'role'>) {
  if (can(user, 'org:viewAll')) return {}
  return {
    OR: [
      { assignedToId: user.id },
      { createdById: user.id },
      { organisation: { OR: [{ assignedToId: user.id }, { createdById: user.id }] } },
    ],
  }
}

/** Activities an intern may read: their own, or on organisations they hold. */
export function activityScope(user: Pick<CurrentUser, 'id' | 'role'>) {
  if (can(user, 'activity:viewAll')) return {}
  return {
    OR: [
      { performedById: user.id },
      { organisation: { OR: [{ assignedToId: user.id }, { createdById: user.id }] } },
    ],
  }
}

export function followUpScope(user: Pick<CurrentUser, 'id' | 'role'>) {
  if (can(user, 'followup:manageAll')) return {}
  return { assignedToId: user.id }
}

/**
 * May `user` read records (attachments, comments, intel) for this organisation?
 */
export function canReadOrganisation(
  user: Pick<CurrentUser, 'id' | 'role'>,
  org: { assignedToId: string | null; createdById: string },
): boolean {
  if (can(user, 'org:viewAll')) return true
  return org.assignedToId === user.id || org.createdById === user.id
}

/**
 * May `user` write to this organisation (log activity, add contacts, edit)?
 *
 * Interns are confined to their own assignments so two interns can never
 * silently work the same organisation.
 */
export function canWriteOrganisation(
  user: Pick<CurrentUser, 'id' | 'role'>,
  org: { assignedToId: string | null; createdById: string },
): boolean {
  if (can(user, 'org:edit')) return true
  return org.assignedToId === user.id || org.createdById === user.id
}

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Owner',
  TL: 'Team Lead',
  INTERN: 'Employee',
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  OWNER: 'Full access to every organisation, team member, report and setting.',
  TL: 'Full executive access to manage team, user approvals, assign work, reports and settings.',
  INTERN: 'Normal employee access: works assigned organisations and logs outreach activity.',
}
