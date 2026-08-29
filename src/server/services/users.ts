import type { Prisma, Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { CurrentUser } from '@/lib/auth/current-user'
import { checkPasswordStrength, hashPassword, verifyPassword } from '@/lib/auth/password'
import { assertCan, ForbiddenError } from '@/lib/rbac'
import { normalizeEmail } from '@/lib/normalize'
import { addDaysToKey, startOfDayUtc, todayKey } from '@/lib/dates'
import type { UserCreateInput, UserUpdateInput } from '@/lib/validation'
import { ConflictError, NotFoundError, ValidationError } from '@/server/errors'
import { writeAudit } from './audit'
import { getPersonMetrics, type CoreMetrics } from './metrics'

/**
 * User & team management (spec §4).
 *
 * Only the Owner manages accounts. Deactivation is preferred over deletion so
 * that every activity, follow-up and audit row keeps a real author (spec §32).
 */

/** Palette used for avatar initials — deterministic per user, not random. */
const AVATAR_COLORS = [
  'indigo',
  'violet',
  'cyan',
  'emerald',
  'amber',
  'rose',
  'sky',
  'teal',
] as const

function pickAvatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 100_000
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  avatarColor: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  _count: {
    select: {
      organisationsAssigned: { where: { deletedAt: null } },
      activities: { where: { deletedAt: null } },
      followUpsAssigned: { where: { deletedAt: null, status: 'PENDING' } },
    },
  },
} satisfies Prisma.UserSelect

export type TeamMember = Prisma.UserGetPayload<{ select: typeof userSelect }>

export async function listUsers(
  user: CurrentUser,
  options: { includeInactive?: boolean } = {},
): Promise<TeamMember[]> {
  assertCan(user, 'team:view')
  return prisma.user.findMany({
    where: {
      deletedAt: null,
      ...(options.includeInactive ? {} : { isActive: true }),
    },
    select: userSelect,
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })
}

/** Lightweight list for assignment dropdowns — no permission needed to see names. */
export async function listAssignableUsers(): Promise<
  Array<{ id: string; name: string; role: Role; avatarColor: string }>
> {
  return prisma.user.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, name: true, role: true, avatarColor: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })
}

export async function getUser(user: CurrentUser, id: string): Promise<TeamMember> {
  assertCan(user, 'team:view')
  const found = await prisma.user.findFirst({ where: { id, deletedAt: null }, select: userSelect })
  if (!found) throw new NotFoundError('User')
  return found
}

export async function createUser(
  user: CurrentUser,
  input: UserCreateInput,
): Promise<{ id: string }> {
  assertCan(user, 'user:manage')

  const strength = checkPasswordStrength(input.password)
  if (!strength.ok) {
    throw new ValidationError(strength.message!, { password: strength.message! })
  }

  const email = normalizeEmail(input.email)!
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    throw new ConflictError('A user with this email already exists.', { email: 'Already in use' })
  }

  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.user.create({
      data: {
        name: input.name,
        email,
        role: input.role,
        phone: input.phone ?? null,
        passwordHash: await hashPassword(input.password),
        avatarColor: pickAvatarColor(email),
      },
      select: { id: true, name: true, role: true },
    })

    await writeAudit(
      {
        userId: user.id,
        action: 'user.created',
        entityType: 'user',
        entityId: row.id,
        entityLabel: row.name,
        summary: `Added ${row.name} as ${row.role}`,
        after: { name: row.name, email, role: row.role },
      },
      tx,
    )

    return row
  })

  return { id: created.id }
}

export async function updateUser(
  user: CurrentUser,
  input: UserUpdateInput,
): Promise<{ id: string }> {
  assertCan(user, 'user:manage')

  const existing = await prisma.user.findFirst({
    where: { id: input.id, deletedAt: null },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  })
  if (!existing) throw new NotFoundError('User')

  const email = normalizeEmail(input.email)!
  if (email !== existing.email) {
    const clash = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (clash) {
      throw new ConflictError('A user with this email already exists.', { email: 'Already in use' })
    }
  }

  // Never let the last active Owner lock everyone out of the CRM.
  const losingOwner =
    existing.role === 'OWNER' && (input.role !== 'OWNER' || input.isActive === false)
  if (losingOwner) {
    const otherOwners = await prisma.user.count({
      where: { role: 'OWNER', isActive: true, deletedAt: null, id: { not: existing.id } },
    })
    if (otherOwners === 0) {
      throw new ValidationError(
        'This is the only active Owner. Promote another Owner before changing this account.',
        { role: 'At least one active Owner is required' },
      )
    }
  }

  if (input.newPassword) {
    const strength = checkPasswordStrength(input.newPassword)
    if (!strength.ok) {
      throw new ValidationError(strength.message!, { newPassword: strength.message! })
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        email,
        role: input.role,
        phone: input.phone ?? null,
        isActive: input.isActive,
        ...(input.newPassword ? { passwordHash: await hashPassword(input.newPassword) } : {}),
      },
    })

    const changes: string[] = []
    if (input.name !== existing.name) changes.push('name')
    if (email !== existing.email) changes.push('email')
    if (input.role !== existing.role) changes.push(`role → ${input.role}`)
    if (input.isActive !== existing.isActive) {
      changes.push(input.isActive ? 'reactivated' : 'deactivated')
    }
    if (input.newPassword) changes.push('password reset')

    await writeAudit(
      {
        userId: user.id,
        action: input.isActive === false ? 'user.deactivated' : 'user.updated',
        entityType: 'user',
        entityId: existing.id,
        entityLabel: input.name,
        summary: changes.length
          ? `Updated ${input.name}: ${changes.join(', ')}`
          : `Updated ${input.name}`,
        before: { role: existing.role, isActive: existing.isActive, email: existing.email },
        after: { role: input.role, isActive: input.isActive, email },
      },
      tx,
    )
  })

  return { id: existing.id }
}

/** Self-service password change — available to every role. */
export async function changeOwnPassword(
  user: CurrentUser,
  input: { currentPassword: string; newPassword: string },
): Promise<void> {
  const row = await prisma.user.findFirst({
    where: { id: user.id, deletedAt: null },
    select: { id: true, passwordHash: true },
  })
  if (!row) throw new NotFoundError('User')

  const ok = await verifyPassword(input.currentPassword, row.passwordHash)
  if (!ok) {
    throw new ValidationError('Your current password is incorrect.', {
      currentPassword: 'Incorrect password',
    })
  }

  const strength = checkPasswordStrength(input.newPassword)
  if (!strength.ok) {
    throw new ValidationError(strength.message!, { newPassword: strength.message! })
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: row.id },
      data: { passwordHash: await hashPassword(input.newPassword) },
    })
    await writeAudit(
      {
        userId: user.id,
        action: 'user.password_changed',
        entityType: 'user',
        entityId: row.id,
        entityLabel: user.name,
        summary: `${user.name} changed their password`,
      },
      tx,
    )
  })
}

/**
 * Reassigning someone's book of work before deactivation is the Owner's job, so
 * we refuse to strand organisations silently.
 */
export async function deactivateUser(user: CurrentUser, id: string): Promise<void> {
  assertCan(user, 'user:manage')
  if (id === user.id) throw new ForbiddenError('You cannot deactivate your own account.')

  const target = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      role: true,
      _count: { select: { organisationsAssigned: { where: { deletedAt: null } } } },
    },
  })
  if (!target) throw new NotFoundError('User')

  if (target.role === 'OWNER') {
    const otherOwners = await prisma.user.count({
      where: { role: 'OWNER', isActive: true, deletedAt: null, id: { not: id } },
    })
    if (otherOwners === 0) {
      throw new ValidationError('At least one active Owner is required.')
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { isActive: false } })
    await writeAudit(
      {
        userId: user.id,
        action: 'user.deactivated',
        entityType: 'user',
        entityId: id,
        entityLabel: target.name,
        summary: `Deactivated ${target.name}${
          target._count.organisationsAssigned > 0
            ? ` — ${target._count.organisationsAssigned} organisations still assigned to them`
            : ''
        }`,
      },
      tx,
    )
  })
}

// ── Team performance (spec §17) ──────────────────────────────────────────────

export interface TeamPerformanceRow {
  userId: string
  name: string
  role: Role
  avatarColor: string
  isActive: boolean
  today: CoreMetrics
  week: CoreMetrics
  assignedOrganisations: number
  pendingFollowUps: number
  overdueFollowUps: number
  lastActivityAt: Date | null
}

/** Per-person today/7-day performance, for the Owner and TL dashboards. */
export async function getTeamPerformance(user: CurrentUser): Promise<TeamPerformanceRow[]> {
  assertCan(user, 'team:view')

  const today = todayKey()
  const weekStart = addDaysToKey(today, -6)
  const startOfToday = startOfDayUtc(today)

  const members = await prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      role: true,
      avatarColor: true,
      isActive: true,
      _count: {
        select: {
          organisationsAssigned: { where: { deletedAt: null } },
          followUpsAssigned: { where: { deletedAt: null, status: 'PENDING' } },
        },
      },
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })

  return Promise.all(
    members.map(async (member) => {
      const [todayMetrics, weekMetrics, overdueFollowUps, lastActivity] = await Promise.all([
        getPersonMetrics(member.id, today, today),
        getPersonMetrics(member.id, weekStart, today),
        prisma.followUp.count({
          where: {
            assignedToId: member.id,
            deletedAt: null,
            status: 'PENDING',
            dueDate: { lt: startOfToday },
          },
        }),
        prisma.activity.findFirst({
          where: { performedById: member.id, deletedAt: null },
          select: { activityDate: true },
          orderBy: { activityDate: 'desc' },
        }),
      ])

      return {
        userId: member.id,
        name: member.name,
        role: member.role,
        avatarColor: member.avatarColor,
        isActive: member.isActive,
        today: todayMetrics,
        week: weekMetrics,
        assignedOrganisations: member._count.organisationsAssigned,
        pendingFollowUps: member._count.followUpsAssigned,
        overdueFollowUps,
        lastActivityAt: lastActivity?.activityDate ?? null,
      }
    }),
  )
}
