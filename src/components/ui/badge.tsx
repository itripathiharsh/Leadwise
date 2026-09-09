import * as React from 'react'
import { cn } from '@/lib/utils'
import type { Tone } from '@/lib/constants'

/**
 * Status/tone badge.
 *
 * Tone classes are written as complete literal strings so Tailwind's scanner
 * can see them — never composed at runtime from fragments.
 */

const SOFT: Record<Tone, string> = {
  slate:
    'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-400/10 dark:text-slate-300 dark:border-slate-400/25',
  blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-400/10 dark:text-blue-300 dark:border-blue-400/25',
  indigo:
    'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-400/10 dark:text-indigo-300 dark:border-indigo-400/25',
  violet:
    'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-400/10 dark:text-violet-300 dark:border-violet-400/25',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-400/10 dark:text-cyan-300 dark:border-cyan-400/25',
  sky: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-400/10 dark:text-sky-300 dark:border-sky-400/25',
  teal: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-400/10 dark:text-teal-300 dark:border-teal-400/25',
  emerald:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/25',
  amber:
    'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/25',
  orange:
    'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-400/10 dark:text-orange-300 dark:border-orange-400/25',
  rose: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-400/10 dark:text-rose-300 dark:border-rose-400/25',
}

const DOT: Record<Tone, string> = {
  slate: 'bg-slate-400',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  violet: 'bg-violet-500',
  cyan: 'bg-cyan-500',
  sky: 'bg-sky-500',
  teal: 'bg-teal-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  orange: 'bg-orange-500',
  rose: 'bg-rose-500',
}

export const TONE_DOT = DOT

export interface BadgeProps extends React.ComponentProps<'span'> {
  tone?: Tone
  size?: 'sm' | 'md'
  /** Leading status dot — reads better than colour alone on dense tables. */
  dot?: boolean
  icon?: React.ReactNode
}

export function Badge({
  className,
  tone = 'slate',
  size = 'md',
  dot = false,
  icon,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border font-medium whitespace-nowrap',
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs',
        SOFT[tone],
        className,
      )}
      {...props}
    >
      {dot && (
        <span className="relative flex size-1.5 shrink-0 items-center justify-center" aria-hidden>
          <span className={cn('absolute -inset-0.5 animate-ping rounded-full opacity-50', DOT[tone])} />
          <span className={cn('relative size-1.5 rounded-full', DOT[tone])} />
        </span>
      )}
      {icon}
      {children}
    </span>
  )
}

/** Neutral, low-emphasis counter chip (e.g. "3 contacts"). */
export function CountBadge({ className, children, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'tabular inline-flex min-w-5 items-center justify-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
