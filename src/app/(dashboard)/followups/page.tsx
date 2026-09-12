'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  CalendarClock,
  Clock,
  CheckCircle2,
  Phone,
  Mail,
  Building2,
  RefreshCw,
  AlertTriangle,
  Flame,
  Check,
  Search,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { LogActivityModal } from '@/components/domain/log-activity-modal'
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

  const fetchFollowUps = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/followups?bucket=${bucket}&pageSize=50`)
      if (res.ok) {
        const data = await res.json()
        setFollowups(data.items ?? [])
        setTotal(data.total ?? 0)
      }
    } catch {
      toast.error('Failed to load follow-ups.')
    } finally {
      setLoading(false)
    }
  }, [bucket])

  React.useEffect(() => {
    fetchFollowUps()
  }, [fetchFollowUps])

  const handleComplete = async (id: string) => {
    try {
      const res = await fetch('/api/followups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'COMPLETE' }),
      })
      if (res.ok) {
        toast.success('Follow-up marked as completed! ✓')
        fetchFollowUps()
      } else {
        toast.error('Failed to complete follow-up.')
      }
    } catch {
      toast.error('Network error completing follow-up.')
    }
  }

  const openLog = (item: any) => {
    setActiveItem(item)
    setLogModalOpen(true)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Executive Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
              <CalendarClock className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-display font-extrabold text-2xl tracking-tight text-foreground">
                  Follow-ups & Cadence Tasks
                </h1>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-surface-elevated text-primary border border-primary/20 font-bold">
                  {total} In Queue
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ensure zero lead cooling with scheduled partner callbacks, outreach reminders, and task completion.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchFollowUps}
          icon={<RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />}
          className="border-border hover:bg-surface-elevated"
        >
          Refresh Queue
        </Button>
      </div>

      {/* Segmented Bucket Selector Tabs & Search */}
      <div className="glass-panel rounded-2xl border border-border/80 bg-surface/70 backdrop-blur-xl p-2.5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setBucket('TODAY')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border flex items-center gap-2',
              bucket === 'TODAY'
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/40 shadow-xs font-bold ring-1 ring-amber-500/20'
                : 'bg-surface-elevated/60 text-muted-foreground border-border/70 hover:bg-surface-elevated hover:text-foreground',
            )}
          >
            <Clock className="size-3.5 text-amber-400" />
            <span>Due Today</span>
          </button>

          <button
            type="button"
            onClick={() => setBucket('OVERDUE')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border flex items-center gap-2',
              bucket === 'OVERDUE'
                ? 'bg-rose-500/15 text-rose-400 border-rose-500/40 shadow-xs font-bold ring-1 ring-rose-500/20'
                : 'bg-surface-elevated/60 text-muted-foreground border-border/70 hover:bg-surface-elevated hover:text-foreground',
            )}
          >
            <AlertTriangle className="size-3.5 text-rose-400" />
            <span>Overdue Tasks</span>
          </button>

          <button
            type="button"
            onClick={() => setBucket('TOMORROW')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border flex items-center gap-2',
              bucket === 'TOMORROW'
                ? 'bg-blue-500/15 text-blue-400 border-blue-500/40 shadow-xs font-bold ring-1 ring-blue-500/20'
                : 'bg-surface-elevated/60 text-muted-foreground border-border/70 hover:bg-surface-elevated hover:text-foreground',
            )}
          >
            <span>Tomorrow</span>
          </button>

          <button
            type="button"
            onClick={() => setBucket('UPCOMING')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border flex items-center gap-2',
              bucket === 'UPCOMING'
                ? 'bg-primary/15 text-primary border-primary/40 shadow-xs font-bold ring-1 ring-primary/20'
                : 'bg-surface-elevated/60 text-muted-foreground border-border/70 hover:bg-surface-elevated hover:text-foreground',
            )}
          >
            <span>Upcoming Pipeline</span>
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
            className="w-full rounded-xl border border-border bg-surface-elevated/60 pl-9 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:bg-surface transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground rounded transition-colors"
              title="Clear search"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* Follow-up Cards List */}
      <div className="space-y-3">
        {loading && followups.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="size-6 mx-auto text-primary animate-spin" />
            <div className="font-semibold text-sm text-foreground">Syncing Cadence Tasks...</div>
            <p className="text-xs text-muted-foreground">Gathering scheduled touchpoint reminders.</p>
          </div>
        ) : filteredFollowups.length === 0 ? (
          search.trim() ? (
            <div className="p-16 text-center space-y-4 rounded-2xl border border-border/80 bg-surface/60">
              <div className="flex size-14 mx-auto items-center justify-center rounded-2xl bg-surface-elevated border border-border/80 text-muted-foreground">
                <Search className="size-7 text-primary/70" />
              </div>
              <div className="space-y-1">
                <p className="font-display font-bold text-base text-foreground">No tasks match your search</p>
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
            <div className="p-16 text-center space-y-4 rounded-2xl border border-border/80 bg-surface/60">
              <div className="flex size-14 mx-auto items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="size-7" />
              </div>
              <div className="space-y-1">
                <p className="font-display font-bold text-base text-foreground">Zero pending follow-ups in this queue</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  All scheduled outreach tasks for this timeframe have been resolved. Your lead velocity is on track!
                </p>
              </div>
            </div>
          )
        ) : (
          filteredFollowups.map((item) => (
            <div
              key={item.id}
              className={cn(
                'glass-card rounded-2xl border p-4.5 shadow-sm transition-all duration-200 space-y-3 rim-highlight',
                bucket === 'OVERDUE'
                  ? 'border-rose-500/40 bg-rose-500/5 hover:border-rose-500/60'
                  : 'border-border/80 bg-surface/75 hover:border-primary/40',
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <Link
                      href={`/organisations/${item.organisation.id}`}
                      className="font-bold text-sm text-foreground hover:text-primary transition-colors truncate"
                    >
                      {item.organisation.name}
                    </Link>
                    <Badge tone={bucket === 'OVERDUE' ? 'rose' : 'amber'} size="sm" dot>
                      {bucket === 'OVERDUE'
                        ? `Overdue ${getOverdueDays(item.dueDate)}d · Due ${formatDate(item.dueDate)}`
                        : `Due: ${formatDate(item.dueDate)}`}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    {item.contact && (
                      <span>Stakeholder: <strong className="text-foreground font-semibold">{item.contact.name}</strong></span>
                    )}
                    {item.assignedTo && (
                      <span className="flex items-center gap-1.5 font-mono text-[11px]">
                        · Owner: {item.assignedTo.name}
                      </span>
                    )}
                  </div>

                  {item.note && (
                    <p className="text-xs text-foreground/90 bg-surface-elevated/60 p-3 rounded-xl border border-border/50 font-sans">
                      {item.note}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 sm:self-center">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handleComplete(item.id)}
                    icon={<Check className="size-3.5 text-emerald-400" />}
                    className="border-border hover:bg-emerald-500/10 hover:border-emerald-500/40 font-semibold"
                  >
                    Mark Done
                  </Button>

                  <Button
                    variant="primary"
                    size="xs"
                    onClick={() => openLog(item)}
                    icon={<Phone className="size-3.5" />}
                    className="shadow-sm font-semibold"
                  >
                    Log Touchpoint
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
          initialOrganisationId={activeItem.organisation.id}
          initialContactId={activeItem.contactId || undefined}
          onSuccess={fetchFollowUps}
        />
      )}
    </div>
  )
}
