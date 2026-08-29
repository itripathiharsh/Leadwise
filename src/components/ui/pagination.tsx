import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Link-based pagination — works without JavaScript and keeps the current page
 * in the URL so a filtered list can be shared or bookmarked.
 */
export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  makeHref,
  className,
}: {
  page: number
  pageCount: number
  total: number
  pageSize: number
  makeHref: (page: number) => string
  className?: string
}) {
  if (total === 0) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const pages = pageWindow(page, pageCount)

  return (
    <div
      className={cn(
        'flex flex-col-reverse items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row',
        className,
      )}
    >
      <p className="tabular text-[12.5px] text-muted-foreground">
        Showing <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> of{' '}
        <span className="font-medium text-foreground">{total}</span>
      </p>

      {pageCount > 1 && (
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <PageLink href={makeHref(page - 1)} disabled={page <= 1} ariaLabel="Previous page">
            <ChevronLeft className="size-4" />
          </PageLink>

          {pages.map((p, i) =>
            p === null ? (
              <span
                key={`gap-${i}`}
                className="px-1.5 text-[12.5px] text-muted-foreground select-none"
              >
                …
              </span>
            ) : (
              <PageLink key={p} href={makeHref(p)} active={p === page} ariaLabel={`Page ${p}`}>
                <span className="tabular">{p}</span>
              </PageLink>
            ),
          )}

          <PageLink
            href={makeHref(page + 1)}
            disabled={page >= pageCount}
            ariaLabel="Next page"
          >
            <ChevronRight className="size-4" />
          </PageLink>
        </nav>
      )}
    </div>
  )
}

function PageLink({
  href,
  active,
  disabled,
  ariaLabel,
  children,
}: {
  href: string
  active?: boolean
  disabled?: boolean
  ariaLabel: string
  children: React.ReactNode
}) {
  const classes = cn(
    'inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-[12.5px] font-medium transition-colors',
    active
      ? 'border-primary-border bg-primary-soft text-primary-soft-foreground'
      : 'border-border bg-surface text-muted-foreground hover:bg-muted hover:text-foreground',
    disabled && 'pointer-events-none opacity-40',
  )

  if (disabled) {
    return (
      <span className={classes} aria-disabled aria-label={ariaLabel}>
        {children}
      </span>
    )
  }

  return (
    <Link
      href={href}
      className={classes}
      aria-label={ariaLabel}
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </Link>
  )
}

/** [1, null, 4, 5, 6, null, 20] — window of pages around the current one. */
function pageWindow(page: number, pageCount: number): (number | null)[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)

  const result: (number | null)[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(pageCount - 1, page + 1)

  if (start > 2) result.push(null)
  for (let p = start; p <= end; p++) result.push(p)
  if (end < pageCount - 1) result.push(null)
  result.push(pageCount)

  return result
}
