import type {
  ActivityOutcome,
  ActivityType,
  ContactStatus,
  OrgStatus,
  Priority,
  Role,
} from '@prisma/client'
import { Crown, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EnumIcon } from '@/components/ui/enum-icon'
import {
  ACTIVITY_TYPE_META,
  CONTACT_STATUS_META,
  ORG_STATUS_META,
  OUTCOME_META,
  PRIORITY_META,
} from '@/lib/constants'
import { ROLE_LABELS } from '@/lib/rbac'
import { cn } from '@/lib/utils'

/**
 * Domain badges. Every place a status/priority/outcome appears in the app goes
 * through these, so a status always looks the same everywhere.
 */

export function OrgStatusBadge({
  status,
  size = 'md',
  className,
}: {
  status: OrgStatus
  size?: 'sm' | 'md'
  className?: string
}) {
  const meta = ORG_STATUS_META[status]
  return (
    <Badge tone={meta.tone} size={size} dot className={className}>
      {meta.label}
    </Badge>
  )
}

export function PriorityBadge({
  priority,
  size = 'md',
  className,
}: {
  priority: Priority
  size?: 'sm' | 'md'
  className?: string
}) {
  const meta = PRIORITY_META[priority]
  return (
    <Badge tone={meta.tone} size={size} className={className}>
      {meta.label}
    </Badge>
  )
}

export function ContactStatusBadge({
  status,
  size = 'sm',
  className,
}: {
  status: ContactStatus
  size?: 'sm' | 'md'
  className?: string
}) {
  const meta = CONTACT_STATUS_META[status]
  return (
    <Badge tone={meta.tone} size={size} dot className={className}>
      {meta.label}
    </Badge>
  )
}

export function ActivityTypeBadge({
  type,
  size = 'sm',
  className,
}: {
  type: ActivityType
  size?: 'sm' | 'md'
  className?: string
}) {
  const meta = ACTIVITY_TYPE_META[type]
  return (
    <Badge
      tone={meta.tone}
      size={size}
      className={cn('uppercase tracking-[0.03em]', className)}
      icon={<EnumIcon name={meta.icon} className="size-3" />}
    >
      {meta.label}
    </Badge>
  )
}

export function OutcomeBadge({
  outcome,
  size = 'sm',
  className,
}: {
  outcome: ActivityOutcome
  size?: 'sm' | 'md'
  className?: string
}) {
  const meta = OUTCOME_META[outcome]
  return (
    <Badge tone={meta.tone} size={size} className={className}>
      {meta.label}
    </Badge>
  )
}

/**
 * Decision-maker badge — the spec calls this out specifically (§7): the team
 * must see at a glance whether they're talking to someone who can say yes.
 */
export function DecisionMakerBadge({
  size = 'sm',
  className,
}: {
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <Badge
      tone="amber"
      size={size}
      className={cn('font-semibold', className)}
      icon={<Star className="size-3 fill-current" />}
      title="Decision maker"
    >
      Decision maker
    </Badge>
  )
}

export function RoleBadge({
  role,
  size = 'sm',
  className,
}: {
  role: Role
  size?: 'sm' | 'md'
  className?: string
}) {
  const tone = role === 'OWNER' ? 'violet' : role === 'TL' ? 'indigo' : 'slate'
  return (
    <Badge
      tone={tone}
      size={size}
      className={className}
      icon={role === 'OWNER' ? <Crown className="size-3" /> : undefined}
    >
      {ROLE_LABELS[role]}
    </Badge>
  )
}
