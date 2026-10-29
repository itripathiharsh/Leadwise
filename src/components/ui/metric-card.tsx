import * as React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IconTile } from '@/components/ui/enum-icon'
import type { Tone } from '@/lib/constants'

/**
 * Dashboard metric tile.
 *
 * Deliberately restrained: one number at large size, one label, one optional
 * supporting line. No sparkline clutter, no gradient fills — the whole point is
 * that the Owner reads eight of these in two seconds (spec §17, §35).
 */
export function MetricCard({
  label,
  value,
  icon,
  tone = 'slate',
  hint,
  trend,
  href,
  emphasis = false,
  className,
}: {
  label: string
  value: number | string
  /** lucide icon name from @/lib/constants metadata */
  icon?: string
  tone?: Tone
  hint?: React.ReactNode
  trend?: { value: string; positive?: boolean }
  href?: string
  /** Raises visual weight — used for the single most important number. */
  emphasis?: boolean
  className?: string
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] leading-4.5 font-medium text-muted-foreground">{label}</p>
        {icon && <IconTile name={icon} tone={tone} size="sm" className="-mt-0.5 group-hover:scale-105 transition-transform duration-150" />}
      </div>
      <div className="mt-2.5 flex items-baseline gap-2">
        <p
          className={cn(
            'tabular font-display font-semibold tracking-[-0.03em] text-foreground transition-colors duration-150 group-hover:text-primary',
            emphasis ? 'text-[32px] leading-9' : 'text-[26px] leading-8',
          )}
        >
          {value}
        </p>
        {trend && (
          <span
            className={cn(
              'text-[11px] font-semibold tabular px-1.5 py-0.5 rounded-md transition-transform duration-150 group-hover:scale-105',
              trend.positive
                ? 'text-emerald-700 bg-emerald-500/10 dark:text-emerald-300'
                : 'text-rose-700 bg-rose-500/10 dark:text-rose-300',
            )}
          >
            {trend.value}
          </span>
        )}
      </div>
      {hint && (
        <p className="mt-1.5 flex items-center gap-1 text-[11.5px] leading-4 text-muted-foreground">
          {hint}
        </p>
      )}
    </>
  )

  const toneGlows: Partial<Record<Tone, string>> = {
    slate: 'hover:border-border-strong hover:shadow-md hover:-translate-y-0.5',
    indigo: 'hover:border-primary/60 hover:shadow-[0_0_20px_rgba(79,70,229,0.15)] hover:-translate-y-0.5',
    blue: 'hover:border-blue-500/60 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:-translate-y-0.5',
    cyan: 'hover:border-cyan-500/60 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:-translate-y-0.5',
    emerald: 'hover:border-emerald-500/60 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:-translate-y-0.5',
    amber: 'hover:border-amber-500/60 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:-translate-y-0.5',
    rose: 'hover:border-rose-500/60 hover:shadow-[0_0_20px_rgba(244,63,94,0.15)] hover:-translate-y-0.5',
  }

  const shell = cn(
    'group relative flex flex-col rounded-lg border bg-card p-4 shadow-xs transition-all duration-200 ease-out',
    emphasis
      ? 'border-primary/50 bg-primary-soft/10 hover:border-primary/70'
      : 'border-border',
    href && 'cursor-pointer active:translate-y-0 active:scale-[0.99]',
    href && toneGlows[tone],
    className,
  )

  if (!href) return <div className={shell}>{body}</div>

  return (
    <Link href={href} className={cn(shell, 'focus-visible:ring-[3px] focus-visible:ring-ring/25')}>
      {body}
      <ArrowRight
        className="absolute right-3.5 bottom-3.5 size-3.5 text-muted-foreground opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-primary"
        aria-hidden
      />
    </Link>
  )
}

/**
 * Compact stat row used inside cards (team performance, EOD preview) where a
 * full metric tile would be too heavy.
 */
export function StatPill({
  label,
  value,
  tone = 'slate',
  className,
}: {
  label: string
  value: number | string
  tone?: Tone
  className?: string
}) {
  const TONES: Record<Tone, string> = {
    slate: 'text-slate-600 dark:text-slate-300',
    blue: 'text-blue-600 dark:text-blue-300',
    indigo: 'text-indigo-600 dark:text-indigo-300',
    violet: 'text-violet-600 dark:text-violet-300',
    cyan: 'text-cyan-600 dark:text-cyan-300',
    sky: 'text-sky-600 dark:text-sky-300',
    teal: 'text-teal-600 dark:text-teal-300',
    emerald: 'text-emerald-600 dark:text-emerald-300',
    amber: 'text-amber-700 dark:text-amber-300',
    orange: 'text-orange-600 dark:text-orange-300',
    rose: 'text-rose-600 dark:text-rose-300',
  }
  return (
    <div className={cn('min-w-0 transition-transform duration-150 hover:translate-x-0.5', className)}>
      <p className="tabular text-[15px] leading-5 font-semibold text-foreground">{value}</p>
      <p className={cn('mt-0.5 truncate text-[11px] leading-4 font-medium', TONES[tone])}>
        {label}
      </p>
    </div>
  )
}
