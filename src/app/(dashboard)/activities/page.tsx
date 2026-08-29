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
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
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

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'CALL':
        return <Phone className="size-4 text-blue-500" />
      case 'EMAIL':
        return <Mail className="size-4 text-indigo-500" />
      case 'LINKEDIN':
        return <Linkedin className="size-4 text-sky-500" />
      case 'MEETING':
        return <Calendar className="size-4 text-violet-500" />
      default:
        return <StickyNote className="size-4 text-slate-500" />
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Activity className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Activity Timeline & Log
            </h1>
            <Badge tone="slate" size="sm">
              {total} Total
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time chronological feed of all outreach calls, emails, LinkedIn interactions, and meetings.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchActivities}
          icon={<RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />}
        >
          Refresh
        </Button>
      </div>

      {/* Channel Filters */}
      <div className="flex flex-wrap gap-2">
        {['', 'CALL', 'EMAIL', 'LINKEDIN', 'MEETING', 'NOTE'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTypeFilter(t)
              setPage(1)
            }}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border',
              typeFilter === t
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-surface text-muted-foreground border-border hover:bg-muted hover:text-foreground',
            )}
          >
            {t === '' ? 'All Channels' : t}
          </button>
        ))}
      </div>

      {/* Activity Cards List */}
      <div className="space-y-3">
        {loading && activities.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            Loading activity stream...
          </div>
        ) : activities.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            No activities recorded matching this filter.
          </div>
        ) : (
          activities.map((act) => (
            <div
              key={act.id}
              className="rounded-xl border border-border bg-surface p-4 shadow-xs hover:border-border-strong transition-colors space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-surface-muted/80 border border-border">
                    {getChannelIcon(act.type)}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground">
                        {act.performedBy.name}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs font-semibold text-primary">{act.type}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {formatDateTime(act.activityDate)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge tone="blue" size="sm">
                    {act.outcome}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Building2 className="size-3.5 text-muted-foreground" />
                <Link
                  href={`/organisations/${act.organisation.id}`}
                  className="font-semibold text-primary hover:underline"
                >
                  {act.organisation.name}
                </Link>
                {act.contact && (
                  <span className="text-muted-foreground">
                    · With {act.contact.name} ({act.contact.designation || 'Contact'})
                  </span>
                )}
              </div>

              {act.notes && (
                <p className="text-xs text-foreground/90 whitespace-pre-wrap bg-surface-muted/40 p-2.5 rounded-lg border border-border/50">
                  {act.notes}
                </p>
              )}
            </div>
          ))
        )}

        {pageCount > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <div>
              Page {page} of {pageCount}
            </div>
            <div className="flex items-center gap-1">
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
