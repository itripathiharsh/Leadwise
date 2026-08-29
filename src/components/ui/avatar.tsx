import * as React from 'react'
import { cn, initials, type AvatarKey } from '@/lib/utils'

/**
 * User chip. Deliberately not an image avatar — the team has no photos, and
 * coloured initials are faster to scan in dense tables anyway.
 */

const COLORS: Record<AvatarKey, string> = {
  violet:
    'bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-400/15 dark:text-violet-300 dark:ring-violet-400/25',
  teal: 'bg-teal-100 text-teal-700 ring-teal-200 dark:bg-teal-400/15 dark:text-teal-300 dark:ring-teal-400/25',
  amber:
    'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-amber-400/25',
  rose: 'bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-400/15 dark:text-rose-300 dark:ring-rose-400/25',
  sky: 'bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-400/15 dark:text-sky-300 dark:ring-sky-400/25',
  emerald:
    'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/15 dark:text-emerald-300 dark:ring-emerald-400/25',
  indigo:
    'bg-indigo-100 text-indigo-700 ring-indigo-200 dark:bg-indigo-400/15 dark:text-indigo-300 dark:ring-indigo-400/25',
}

const SIZES = {
  xs: 'size-5 text-[9px] ring-1',
  sm: 'size-6.5 text-[10px] ring-1',
  md: 'size-8 text-[11px] ring-1',
  lg: 'size-9.5 text-[13px] ring-1',
  xl: 'size-12 text-base ring-2',
} as const

// `color` is ours (a palette key), not the deprecated HTML `color` attribute.
export interface UserAvatarProps extends Omit<React.ComponentProps<'span'>, 'color'> {
  name: string
  color?: string | null
  size?: keyof typeof SIZES
}

function resolveColor(color: string | null | undefined): AvatarKey {
  if (color && color in COLORS) return color as AvatarKey
  return 'violet'
}

export function UserAvatar({
  name,
  color,
  size = 'md',
  className,
  ...props
}: UserAvatarProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-inset select-none',
        COLORS[resolveColor(color)],
        SIZES[size],
        className,
      )}
      title={name}
      {...props}
    >
      {initials(name)}
    </span>
  )
}

export const Avatar = UserAvatar

/** Avatar + name, the standard way a person is rendered in tables and lists. */
export function UserChip({
  name,
  color,
  size = 'sm',
  subtitle,
  className,
}: {
  name: string
  color?: string | null
  size?: keyof typeof SIZES
  subtitle?: string
  className?: string
}) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <UserAvatar name={name} color={color} size={size} />
      <span className="min-w-0">
        <span className="block truncate text-[13px] leading-4.5 font-medium text-foreground">
          {name}
        </span>
        {subtitle && (
          <span className="block truncate text-[11px] leading-4 text-muted-foreground">
            {subtitle}
          </span>
        )}
      </span>
    </span>
  )
}

/** Placeholder used wherever an organisation is unassigned. */
export function UnassignedChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-[13px] text-muted-foreground italic',
        className,
      )}
    >
      <span
        className="inline-flex size-6.5 shrink-0 items-center justify-center rounded-full border border-dashed border-border-strong text-[10px] not-italic"
        aria-hidden
      >
        —
      </span>
      Unassigned
    </span>
  )
}

/** Overlapping stack, used on organisation cards to show who has touched it. */
export function AvatarStack({
  users,
  max = 3,
  size = 'sm',
}: {
  users: { name: string; avatarColor?: string | null }[]
  max?: number
  size?: keyof typeof SIZES
}) {
  const shown = users.slice(0, max)
  const rest = users.length - shown.length
  return (
    <span className="inline-flex items-center">
      {shown.map((u, i) => (
        <UserAvatar
          key={`${u.name}-${i}`}
          name={u.name}
          color={u.avatarColor}
          size={size}
          className={cn('ring-background', i > 0 && '-ml-1.5')}
        />
      ))}
      {rest > 0 && (
        <span className="-ml-1.5 inline-flex size-6.5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-1 ring-background ring-inset">
          +{rest}
        </span>
      )}
    </span>
  )
}
