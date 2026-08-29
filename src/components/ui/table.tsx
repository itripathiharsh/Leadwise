import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Table shell.
 *
 * An "elegant table" per the spec: hairline dividers, a muted sticky header,
 * generous row height, and a hover state that reads as interactive without
 * shouting. Column widths are the caller's job via <col> or utility classes.
 */

export function TableWrap({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card shadow-xs',
        className,
      )}
      {...props}
    >
      <div className="scrollbar-slim overflow-x-auto">{children}</div>
    </div>
  )
}

export function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <table
      className={cn('w-full caption-bottom border-collapse text-sm', className)}
      {...props}
    />
  )
}

export function THead({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      className={cn('sticky top-0 z-10 bg-surface-muted/95 backdrop-blur-sm', className)}
      {...props}
    />
  )
}

export function TBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody className={cn('divide-y divide-border', className)} {...props} />
}

export function TR({
  className,
  interactive = false,
  selected = false,
  ...props
}: React.ComponentProps<'tr'> & { interactive?: boolean; selected?: boolean }) {
  return (
    <tr
      data-selected={selected || undefined}
      className={cn(
        'transition-colors',
        interactive && 'hover:bg-surface-muted/70',
        selected && 'bg-primary-soft/45',
        className,
      )}
      {...props}
    />
  )
}

export function TH({
  className,
  align = 'left',
  ...props
}: React.ComponentProps<'th'> & { align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      scope="col"
      className={cn(
        'border-b border-border px-4 py-2.5 text-[11px] font-semibold tracking-[0.04em] whitespace-nowrap text-muted-foreground uppercase',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        className,
      )}
      {...props}
    />
  )
}

export function TD({
  className,
  align = 'left',
  ...props
}: React.ComponentProps<'td'> & { align?: 'left' | 'right' | 'center' }) {
  return (
    <td
      className={cn(
        'px-4 py-3 align-middle text-[13px] text-foreground',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
      {...props}
    />
  )
}

/** Full-width message row (empty state inside a table body). */
export function TDEmpty({
  colSpan,
  children,
}: {
  colSpan: number
  children: React.ReactNode
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14">
        {children}
      </td>
    </tr>
  )
}

/** Sortable header button used inside <TH>. */
export function SortButton({
  active,
  direction,
  className,
  children,
  ...props
}: React.ComponentProps<'button'> & { active?: boolean; direction?: 'asc' | 'desc' }) {
  return (
    <button
      type="button"
      className={cn(
        'group inline-flex items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:ring-[2.5px] focus-visible:ring-ring/40 focus-visible:outline-none',
        active && 'text-foreground',
        className,
      )}
      {...props}
    >
      {children}
      <span
        aria-hidden
        className={cn(
          'text-[9px] transition-opacity',
          active ? 'opacity-100' : 'opacity-0 group-hover:opacity-45',
        )}
      >
        {direction === 'asc' ? '▲' : '▼'}
      </span>
    </button>
  )
}
