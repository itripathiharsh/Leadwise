import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Empty state.
 *
 * Every list in the app renders one of these instead of a blank area — an empty
 * follow-up queue is good news and should read that way ("You're all caught up"),
 * while an empty organisation list should offer the action that fixes it.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
}: {
  icon?: React.ReactNode
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  secondaryAction?: React.ReactNode
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        size === 'sm' ? 'px-4 py-8' : 'px-6 py-14',
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            'mb-3.5 inline-flex items-center justify-center rounded-xl border border-border bg-surface-muted text-muted-foreground',
            size === 'sm' ? 'size-9 [&_svg]:size-4.5' : 'size-12 [&_svg]:size-5.5',
          )}
          aria-hidden
        >
          {icon}
        </div>
      )}
      <p
        className={cn(
          'font-display font-semibold tracking-[-0.01em] text-foreground',
          size === 'sm' ? 'text-[13px]' : 'text-[15px]',
        )}
      >
        {title}
      </p>
      {description && (
        <p
          className={cn(
            'text-pretty mt-1 max-w-sm text-muted-foreground',
            size === 'sm' ? 'text-xs leading-5' : 'text-[13px] leading-5.5',
          )}
        >
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}

/**
 * Error state with a retry affordance. Never renders the raw error — the
 * message shown is always a sentence we wrote (spec §39).
 */
export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this section. Please try again.',
  action,
  className,
}: {
  title?: string
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-destructive/25 bg-destructive-soft/45 px-6 py-12 text-center',
        className,
      )}
    >
      <div
        className="mb-3.5 inline-flex size-11 items-center justify-center rounded-xl border border-destructive/25 bg-surface text-destructive"
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="size-5.5"
        >
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        </svg>
      </div>
      <p className="font-display text-[15px] font-semibold text-foreground">{title}</p>
      <p className="text-pretty mt-1 max-w-sm text-[13px] leading-5.5 text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
