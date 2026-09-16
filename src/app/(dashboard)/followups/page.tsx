'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  CalendarClock,
  Clock,
  CheckCircle2,
  Phone,
  Mail,
  RefreshCw,
  AlertTriangle,
  Check,
  Search,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LogActivityModal, type ActivityTypeTab } from '@/components/domain/log-activity-modal'
import { formatDate } from '@/lib/dates'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function getOverdueDays(dueDate: string | null | undefined): number {
  if (!dueDate) return 0
  return Math.max(1, Math.floor((Date.now() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)))
}

export default function FollowUpsPage() {
  const [loading, setLoading] = React.useState(true)
  const [bucket, setBucket] = React.useState<'TODAY' | 'OVERDUE' | 'TOMORROW' | 'UPCOMING'>('TODAY')
  const [followups, setFollowups] = React.useState<any[]>([])
  const [total, setTotal] = React.useState(0)
  const [search, setSearch] = React.useState('')

  const filteredFollowups = React.useMemo(() => {
    if (!search.trim()) return followups
    const q = search.trim().toLowerCase()
    return followups.filter((f) =>
      f.organisation?.name?.toLowerCase().includes(q) ||
      f.contact?.name?.toLowerCase().includes(q) ||
      f.note?.toLowerCase().includes(q) ||
      f.assignedTo?.name?.toLowerCase().includes(q)
    )
  }, [followups, search])

  const [logModalOpen, setLogModalOpen] = React.useState(false)
  const [activeItem, setActiveItem] = React.useState<any>(null)
  const [logType, setLogType] = React.useState<ActivityTypeTab>('CALL')

  const fetchFollowUps = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/followups?bucket=${bucket}&pageSize=50`)
      if (res.ok) {
        const data = await res.json()
        setFollowups(data.items || [])
        setTotal(data.total || 0)
      } else {
        toast.error('Failed to load follow-up queue.')
      }
    } catch {
      toast.error('Network error loading follow-ups.')
    } finally {
      setLoading(false)
    }
  }, [bucket])

  React.useEffect(() => {
    fetchFollowUps()
  }, [fetchFollowUps])

  const handleDismiss = async (id: string) => {
    try {
      const res = await fetch('/api/followups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'COMPLETE' }),
      })
      if (res.ok) {
        toast.success('Follow-up dismissed.')
        fetchFollowUps()
      } else {
        toast.error('Failed to dismiss follow-up.')
      }
    } catch {
      toast.error('Network error dismissing follow-up.')
    }
  }

  const openLog = (item: any, type: ActivityTypeTab = 'CALL') => {
    setActiveItem(item)
    setLogType(type)
    setLogModalOpen(true)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 p-4 sm:p-6 lg:p-8">
      {/* Precision Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-surface-muted text-foreground border border-border">
              <CalendarClock className="size-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-sans font-bold text-xl sm:text-2xl tracking-tight text-foreground">
                  Follow-ups & Cadence
                </h1>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-muted text-muted-foreground border border-border">
                  {total} In Queue
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Scheduled partner callbacks, touchpoint reminders, and cadence management.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchFollowUps}
          icon={<RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />}
        >
          Refresh Queue
        </Button>
      </div>

      {/* Segmented Bucket Selector Tabs & Search */}
      <div className="rounded-lg border border-border bg-surface p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 bg-surface-muted/60 p-1 rounded-md border border-border">
          <button
            type="button"
            onClick={() => setBucket('TODAY')}
            className={cn(
              'px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer',
              bucket === 'TODAY'
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Clock className="size-3.5 text-amber-500" />
            <span>Due Today</span>
          </button>

          <button
            type="button"
            onClick={() => setBucket('OVERDUE')}
            className={cn(
              'px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer',
              bucket === 'OVERDUE'
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <AlertTriangle className="size-3.5 text-rose-500" />
            <span>Overdue</span>
          </button>

          <button
            type="button"
            onClick={() => setBucket('TOMORROW')}
            className={cn(
              'px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer',
              bucket === 'TOMORROW'
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span>Tomorrow</span>
          </button>

          <button
            type="button"
            onClick={() => setBucket('UPCOMING')}
            className={cn(
              'px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer',
              bucket === 'UPCOMING'
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span>Upcoming</span>
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search cadence tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border border-border bg-surface-muted/60 pl-8 pr-7 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-border-strong"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground rounded"
              title="Clear search"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* Follow-up Cards List */}
      <div className="space-y-2.5">
        {loading && followups.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="size-5 mx-auto text-primary animate-spin" />
            <div className="font-semibold text-sm text-foreground">Syncing Cadence Tasks...</div>
            <p className="text-xs text-muted-foreground">Gathering scheduled touchpoint reminders.</p>
          </div>
        ) : filteredFollowups.length === 0 ? (
          search.trim() ? (
            <div className="p-16 text-center space-y-4 rounded-lg border border-border bg-surface">
              <div className="flex size-12 mx-auto items-center justify-center rounded-lg bg-surface-muted border border-border text-muted-foreground">
                <Search className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-sm text-foreground">No tasks match your search</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  No scheduled follow-ups matched &ldquo;{search.trim()}&rdquo; in this bucket.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearch('')}
                icon={<RefreshCw className="size-3.5" />}
              >
                Clear Search
              </Button>
            </div>
          ) : (
            <div className="p-16 text-center space-y-4 rounded-lg border border-border bg-surface">
              <div className="flex size-12 mx-auto items-center justify-center rounded-lg bg-surface-muted border border-border text-emerald-500">
                <CheckCircle2 className="size-6" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-sm text-foreground">Zero pending follow-ups in this queue</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  All scheduled outreach tasks for this timeframe have been resolved.
                </p>
              </div>
            </div>
          )
        ) : (
          filteredFollowups.map((item) => (
            <div
              key={item.id}
              className={cn(
                'rounded-lg border p-4 transition-[border-color,background-color] duration-120 space-y-2.5',
                bucket === 'OVERDUE'
                  ? 'border-rose-500/30 bg-rose-500/5 hover:border-rose-500/60'
                  : 'border-border bg-surface hover:border-border-strong hover:bg-surface-hover',
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <Link
                      href={`/organisations/${item.organisation.id}`}
                      className="font-semibold text-xs text-foreground hover:text-primary transition-colors truncate"
                    >
                      {item.organisation.name}
                    </Link>
                    <Badge tone={bucket === 'OVERDUE' ? 'rose' : 'amber'} size="sm">
                      {bucket === 'OVERDUE'
                        ? `Overdue ${getOverdueDays(item.dueDate)}d · Due ${formatDate(item.dueDate)}`
                        : `Due: ${formatDate(item.dueDate)}`}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    {item.contact && (
                      <span>Contact: <strong className="text-foreground font-semibold">{item.contact.name}</strong></span>
                    )}
                    {item.assignedTo && (
                      <span className="flex items-center gap-1.5 font-mono text-[11px]">
                        · Owner: {item.assignedTo.name}
                      </span>
                    )}
                  </div>

                  {item.note && (
                    <p className="text-xs text-foreground/90 bg-surface-muted/50 p-2.5 rounded border border-border font-sans">
                      {item.note}
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0 sm:self-center">
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="primary"
                      size="xs"
                      onClick={() => openLog(item, 'CALL')}
                      icon={<Phone className="size-3.5" />}
                      title="Log call outcome (automatically completes this follow-up)"
                    >
                      Log Call
                    </Button>

                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => openLog(item, 'EMAIL')}
                      icon={<Mail className="size-3.5 text-indigo-500" />}
                      title="Log email outcome (automatically completes this follow-up)"
                    >
                      Log Email
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => handleDismiss(item.id)}
                    className="text-muted-foreground hover:text-foreground text-xs"
                    title="Dismiss follow-up without outreach"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {activeItem && (
        <LogActivityModal
          open={logModalOpen}
          onOpenChange={setLogModalOpen}
          initialType={logType}
          initialOrganisationId={activeItem.organisation.id}
          initialContactId={activeItem.contactId || undefined}
          initialPhoneNumberUsed={activeItem.contact?.phone || undefined}
          initialEmailUsed={activeItem.contact?.email || undefined}
          completedFollowUpId={activeItem.id}
          onSuccess={fetchFollowUps}
        />
      )}
    </div>
  )
}
