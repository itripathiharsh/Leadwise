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
  href?: string
  /** Raises visual weight — used for the single most important number. */
  emphasis?: boolean
  className?: string
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] leading-4.5 font-medium text-muted-foreground">{label}</p>
        {icon && <IconTile name={icon} tone={tone} size="sm" className="-mt-0.5" />}
      </div>
      <p
        className={cn(
          'tabular font-display mt-2.5 font-semibold tracking-[-0.03em] text-foreground',
          emphasis ? 'text-[30px] leading-9' : 'text-[26px] leading-8',
        )}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1.5 flex items-center gap-1 text-[11.5px] leading-4 text-muted-foreground">
          {hint}
        </p>
      )}
    </>
  )

  const shell = cn(
    'group relative flex flex-col rounded-xl border bg-card p-4 shadow-xs transition-[border-color,box-shadow] duration-150',
    emphasis ? 'border-primary-border bg-primary-soft/25' : 'border-border',
    href && 'hover:border-border-strong hover:shadow-sm',
    className,
  )

  if (!href) return <div className={shell}>{body}</div>

  return (
    <Link href={href} className={cn(shell, 'focus-visible:ring-[3px] focus-visible:ring-ring/25')}>
      {body}
      <ArrowRight
        className="absolute right-3.5 bottom-3.5 size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
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
    <div className={cn('min-w-0', className)}>
      <p className="tabular text-[15px] leading-5 font-semibold text-foreground">{value}</p>
      <p className={cn('mt-0.5 truncate text-[11px] leading-4 font-medium', TONES[tone])}>
        {label}
      </p>
    </div>
  )
}
