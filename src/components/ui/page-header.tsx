import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Page header: title, supporting line, and right-aligned actions.
 * Consistent use of this is most of what makes the app feel like one product.
 */
export function PageHeader({
  title,
  description,
  actions,
  meta,
  eyebrow,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  /** Small chips rendered under the title (counts, date, filters applied). */
  meta?: React.ReactNode
  eyebrow?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold tracking-[0.06em] text-primary uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display truncate text-[22px] leading-7 font-semibold tracking-[-0.022em] sm:text-2xl sm:leading-8">
          {title}
        </h1>
        {description && (
          <p className="text-pretty mt-1.5 max-w-2xl text-[13px] leading-5.5 text-muted-foreground">
            {description}
          </p>
        )}
        {meta && <div className="mt-2.5 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  )
}

/** Section heading used inside pages and tabs. */
export function SectionHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="font-display text-[15px] leading-6 font-semibold tracking-[-0.012em]">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

/** Small label/value pair used on detail pages. */
export function DetailItem({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-[13px] leading-5 break-words text-foreground">{children}</dd>
    </div>
  )
}
