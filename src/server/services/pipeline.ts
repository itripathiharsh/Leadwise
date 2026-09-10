import type { OrgStatus, Priority, Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { CurrentUser } from '@/lib/auth/current-user'
import { assertCan, can, canWriteOrganisation, ForbiddenError, organisationScope } from '@/lib/rbac'
import { writeAudit } from './audit'
import { recomputeOrganisationCaches } from './caches'
import { notifyOwnersAndTLs } from './notifications'
import { ORG_STATUS_META } from '@/lib/constants'
import { NotFoundError } from '@/server/errors'

export type LeadHealth = 'ACTIVE' | 'ATTENTION' | 'GOING_COLD'

export interface PipelineCardItem {
  id: string
  name: string
  category: string | null
  domain: string | null
  location: string | null
  priority: Priority
  status: OrgStatus
  nextAction: string | null
  recommendedAction: string
  health: LeadHealth
  daysSinceContact: number | null
  lastContactedAt: Date | null
  nextFollowupAt: Date | null
  activityCount: number
  primaryContact: {
    id: string
    name: string
    designation: string | null
    isDecisionMaker: boolean
    phone: string | null
    email: string | null
  } | null
  assignedTo: {
    id: string
    name: string
    avatarColor: string
  } | null
  tags: Array<{
    id: string
    name: string
    color: string
  }>
}

export interface PipelineBoard {
  columns: Record<OrgStatus, PipelineCardItem[]>
  counts: Record<OrgStatus, number>
  total: number
}

export const PIPELINE_STAGES: OrgStatus[] = [
  'ASSIGNED',
  'CONTACTED',
  'RESPONDED',
  'MEETING',
  'INTERESTED',
  'PARTNERSHIP',
  'REJECTED',
]

/**
 * Calculates lead health deterministically.
 * Rule:
 *  - If future follow-up is scheduled -> ACTIVE (🔥)
 *  - Inactive for > 7 days (or no activity for > 7 days since creation) and no future follow-up -> GOING_COLD (❄️)
 *  - Inactive between 4 and 7 days -> ATTENTION (⚠️)
 *  - Otherwise -> ACTIVE (🔥)
 */
export function calculateLeadHealth(
  lastContactedAt: Date | null,
  nextFollowupAt: Date | null,
  createdAt: Date,
): { health: LeadHealth; daysSinceContact: number | null } {
  const now = new Date().getTime()

  // Future scheduled follow-up keeps lead warm
  if (nextFollowupAt && nextFollowupAt.getTime() >= now - 24 * 60 * 60 * 1000) {
    return { health: 'ACTIVE', daysSinceContact: lastContactedAt ? Math.floor((now - lastContactedAt.getTime()) / (1000 * 60 * 60 * 24)) : null }
  }

  const referenceDate = lastContactedAt ?? createdAt
  const days = Math.max(0, Math.floor((now - referenceDate.getTime()) / (1000 * 60 * 60 * 24)))

  if (days >= 7) {
    return { health: 'GOING_COLD', daysSinceContact: days }
  }
  if (days >= 4) {
    return { health: 'ATTENTION', daysSinceContact: days }
  }
  return { health: 'ACTIVE', daysSinceContact: days }
}

/**
 * Generates deterministic recommended next action.
 */
export function getRecommendedNextAction(
  status: OrgStatus,
  hasContacts: boolean,
  hasFollowUp: boolean,
  daysSinceContact: number | null,
): string {
  if (status === 'NEW' || status === 'ASSIGNED') {
    return 'Make initial outreach call / send LinkedIn intro'
  }
  if (status === 'CONTACTED') {
    return daysSinceContact && daysSinceContact >= 3
      ? 'Follow up on email / place check-in call'
      : 'Wait for response or try alternate contact'
  }
  if (status === 'RESPONDED') {
    return 'Schedule partnership discovery meeting'
  }
  if (status === 'MEETING') {
    return hasFollowUp ? 'Conduct scheduled meeting & assess fit' : 'Schedule clinical pitch / demo session'
  }
  if (status === 'INTERESTED') {
    return 'Prepare & send formal partnership agreement / proposal'
  }
  if (status === 'PARTNERSHIP') {
    return 'Coordinate onboarding & live partnership launch'
  }
  return 'Review feedback / keep on quarterly radar'
}

export async function getPipelineBoard(
  user: Pick<CurrentUser, 'id' | 'role'>,
  filters: {
    assignee?: string
    priority?: Priority
    health?: LeadHealth
    tag?: string
  } = {},
): Promise<PipelineBoard> {
  const where: Prisma.OrganisationWhereInput = {
    deletedAt: null,
    AND: [
      organisationScope(user),
      filters.assignee ? { assignedToId: filters.assignee === 'UNASSIGNED' ? null : filters.assignee } : {},
      filters.priority ? { priority: filters.priority } : {},
      filters.tag ? { tags: { some: { tag: { name: filters.tag } } } } : {},
    ],
  }

  const orgs = await prisma.organisation.findMany({
    where,
    include: {
      assignedTo: { select: { id: true, name: true, avatarColor: true } },
      contacts: {
        where: { deletedAt: null },
        orderBy: [{ isDecisionMaker: 'desc' }, { createdAt: 'asc' }],
        take: 1,
        select: { id: true, name: true, designation: true, isDecisionMaker: true, phone: true, email: true },
      },
      tags: {
        select: {
          tag: { select: { id: true, name: true, color: true } },
        },
      },
    },
    orderBy: [{ priority: 'asc' }, { lastContactedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
  })

  const columns: Record<OrgStatus, PipelineCardItem[]> = {
    NEW: [],
    ASSIGNED: [],
    CONTACTED: [],
    RESPONDED: [],
    INTERESTED: [],
    MEETING: [],
    PARTNERSHIP: [],
    REJECTED: [],
  }

  const counts: Record<OrgStatus, number> = {
    NEW: 0,
    ASSIGNED: 0,
    CONTACTED: 0,
    RESPONDED: 0,
    INTERESTED: 0,
    MEETING: 0,
    PARTNERSHIP: 0,
    REJECTED: 0,
  }

  for (const org of orgs) {
    const { health, daysSinceContact } = calculateLeadHealth(
      org.lastContactedAt,
      org.nextFollowupAt,
      org.createdAt,
    )

    if (filters.health && health !== filters.health) {
      continue
    }

    const primaryContact = org.contacts[0] ?? null
    const recommendedAction = getRecommendedNextAction(
      org.status,
      Boolean(primaryContact),
      Boolean(org.nextFollowupAt),
      daysSinceContact,
    )

    const item: PipelineCardItem = {
      id: org.id,
      name: org.name,
      category: org.category,
      domain: org.domain,
      location: org.location,
      priority: org.priority,
      status: org.status,
      nextAction: org.nextAction,
      recommendedAction,
      health,
      daysSinceContact,
      lastContactedAt: org.lastContactedAt,
      nextFollowupAt: org.nextFollowupAt,
      activityCount: org.activityCount,
      primaryContact,
      assignedTo: org.assignedTo,
      tags: org.tags.map((t) => t.tag),
    }

    columns[org.status].push(item)
    counts[org.status] += 1
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  return { columns, counts, total }
}

export async function moveOrganisationStage(
  user: CurrentUser,
  input: {
    id: string
    status: OrgStatus
    nextAction?: string
    rejectionReason?: string
    rejectionNote?: string
  },
) {
  assertCan(user, 'org:changeStatus')

  const existing = await prisma.organisation.findFirst({
    where: { id: input.id, deletedAt: null },
    select: { id: true, name: true, status: true, assignedToId: true, createdById: true },
  })

  if (!existing) throw new NotFoundError('Organisation')
  if (!canWriteOrganisation(user, existing) && existing.assignedToId !== null) {
    throw new ForbiddenError('You can only move organisations assigned to you.')
  }

  const updated = await prisma.$transaction(async (tx) => {
    const org = await tx.organisation.update({
      where: { id: existing.id },
      data: {
        status: input.status,
        ...(existing.assignedToId === null ? { assignedToId: user.id } : {}),
        ...(input.nextAction !== undefined ? { nextAction: input.nextAction } : {}),
        ...(input.rejectionReason !== undefined ? { rejectionReason: input.rejectionReason } : {}),
        ...(input.rejectionNote !== undefined ? { rejectionNote: input.rejectionNote } : {}),
      },
    })

    await recomputeOrganisationCaches(tx, org.id)

    await writeAudit(
      {
        userId: user.id,
        action: 'organisation.status_changed',
        entityType: 'organisation',
        entityId: org.id,
        entityLabel: org.name,
        summary: `${user.name} moved ${org.name} from ${existing.status} to ${input.status}${
          input.rejectionReason ? ` (Reason: ${input.rejectionReason})` : ''
        }`,
        before: { status: existing.status },
        after: { status: input.status, rejectionReason: input.rejectionReason ?? null },
      },
      tx,
    )

    return org
  })

  // Drop notification to TL and OWNER when moved by an intern
  if (user.role === 'INTERN' && existing.status !== input.status) {
    const fromLabel = ORG_STATUS_META[existing.status]?.label ?? existing.status
    const toLabel = ORG_STATUS_META[input.status]?.label ?? input.status

    await notifyOwnersAndTLs({
      type: 'SYSTEM',
      priority: input.status === 'PARTNERSHIP' ? 'URGENT' : input.status === 'REJECTED' ? 'WARNING' : 'INFO',
      title: `Pipeline Stage Updated by ${user.name}`,
      message: `${user.name} moved "${existing.name}" from ${fromLabel} → ${toLabel}.${
        input.rejectionReason ? ` Reason: ${input.rejectionReason}` : ''
      }`,
      linkUrl: `/organisations/${existing.id}`,
      entityType: 'organisation',
      entityId: existing.id,
    }).catch((err) => {
      console.error('Failed to notify owners/TLs on pipeline stage move:', err)
    })
  }

  return updated
}
