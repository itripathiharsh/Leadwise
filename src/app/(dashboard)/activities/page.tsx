'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Activity,
  Phone,
  Mail,
  Linkedin,
  Calendar,
  StickyNote,
  Building2,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/dates'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function ActivitiesPage() {
  const [loading, setLoading] = React.useState(true)
  const [activities, setActivities] = React.useState<any[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [pageCount, setPageCount] = React.useState(1)
  const [typeFilter, setTypeFilter] = React.useState('')

  const fetchActivities = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter) params.set('type', typeFilter)
      params.set('page', String(page))

      const res = await fetch(`/api/activities?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setActivities(data.items ?? [])
        setTotal(data.total ?? 0)
        setPageCount(data.pageCount ?? 1)
      }
    } catch {
      toast.error('Failed to load activities.')
    } finally {
      setLoading(false)
    }
  }, [typeFilter, page])

  React.useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  const getChannelConfig = (type: string) => {
    switch (type) {
      case 'CALL':
        return {
          icon: Phone,
          color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
          badge: 'blue' as const,
        }
      case 'EMAIL':
        return {
          icon: Mail,
          color: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20',
          badge: 'indigo' as const,
        }
      case 'LINKEDIN':
        return {
          icon: Linkedin,
          color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
          badge: 'teal' as const,
        }
      case 'MEETING':
        return {
          icon: Calendar,
          color: 'text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20',
          badge: 'violet' as const,
        }
      default:
        return {
          icon: StickyNote,
          color: 'text-muted-foreground bg-surface-muted border-border',
          badge: 'slate' as const,
        }
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 p-4 sm:p-6 lg:p-8">
      {/* Precision Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-surface-muted text-foreground border border-border">
              <Activity className="size-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-sans font-bold text-xl sm:text-2xl tracking-tight text-foreground">
                  Outreach Activity Feed
                </h1>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-muted text-muted-foreground border border-border">
                  {total} Events
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Chronological ledger of partnership touchpoints, emails, phone calls, and meetings.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchActivities}
          icon={<RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />}
        >
          Refresh Feed
        </Button>
      </div>

      {/* Channel Switcher Tabs */}
      <div className="rounded-lg border border-border bg-surface p-2 flex flex-wrap gap-1">
        {[
          { key: '', label: 'All Channels' },
          { key: 'CALL', label: 'Phone Calls' },
          { key: 'EMAIL', label: 'Emails' },
          { key: 'LINKEDIN', label: 'LinkedIn' },
          { key: 'MEETING', label: 'Meetings' },
          { key: 'NOTE', label: 'Notes' },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTypeFilter(t.key)
              setPage(1)
            }}
            className={cn(
              'px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer',
              typeFilter === t.key
                ? 'bg-surface-muted text-foreground border border-border shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Activity Timeline List */}
      <div className="space-y-2.5">
        {loading && activities.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="size-5 mx-auto text-primary animate-spin" />
            <div className="font-semibold text-sm text-foreground">Syncing Activity Stream...</div>
            <p className="text-xs text-muted-foreground">Gathering chronological touchpoints from all team reps.</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="p-16 text-center space-y-4 rounded-lg border border-border bg-surface">
            <Activity className="size-8 mx-auto text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-semibold text-sm text-foreground">No activities recorded</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Log your first phone call, email, or meeting from any organization profile to begin building the timeline.
              </p>
            </div>
            <Link href="/organisations">
              <Button variant="outline" size="sm">
                Go to Organizations
              </Button>
            </Link>
          </div>
        ) : (
          activities.map((act) => {
            const config = getChannelConfig(act.type)
            const ChannelIcon = config.icon

            return (
              <div
                key={act.id}
                className="rounded-lg border border-border bg-surface p-4 hover:border-border-strong transition-[border-color] space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-md border font-bold',
                        config.color,
                      )}
                    >
                      <ChannelIcon className="size-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {act.performedBy.name}
                        </span>
                        <span className="text-muted-foreground/60">•</span>
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">
                          {act.type}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {formatDateTime(act.activityDate)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge tone={config.badge} size="sm">
                      {act.outcome}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs pt-1 border-t border-border">
                  <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                  <Link
                    href={`/organisations/${act.organisation.id}`}
                    className="font-semibold text-xs text-foreground hover:text-primary transition-colors truncate"
                  >
                    {act.organisation.name}
                  </Link>
                  {act.contact && (
                    <span className="text-muted-foreground truncate">
                      · With <strong>{act.contact.name}</strong> {act.contact.designation ? `(${act.contact.designation})` : ''}
                    </span>
                  )}
                </div>

                {act.notes && (
                  <p className="text-xs text-foreground/90 whitespace-pre-wrap bg-surface-muted/50 p-2.5 rounded border border-border leading-relaxed font-sans">
                    {act.notes}
                  </p>
                )}
              </div>
            )
          })
        )}

        {pageCount > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
            <div className="font-mono text-[11px]">
              Page <span className="text-foreground font-semibold">{page}</span> of {pageCount} ({total} activities)
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="xs"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
