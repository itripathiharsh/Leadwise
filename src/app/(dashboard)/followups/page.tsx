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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { LogActivityModal } from '@/components/domain/log-activity-modal'
import { formatDate } from '@/lib/dates'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function FollowUpsPage() {
  const [loading, setLoading] = React.useState(true)
  const [bucket, setBucket] = React.useState<'TODAY' | 'OVERDUE' | 'TOMORROW' | 'UPCOMING'>('TODAY')
  const [followups, setFollowups] = React.useState<any[]>([])
  const [total, setTotal] = React.useState(0)

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
        toast.success('Follow-up marked as completed!')
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <CalendarClock className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Follow-ups & Reminders
            </h1>
            <Badge tone="slate" size="sm">
              {total} Tasks
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track and complete scheduled outreach follow-ups and call-backs.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchFollowUps}
          icon={<RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />}
        >
          Refresh
        </Button>
      </div>

      {/* Bucket Selector Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setBucket('TODAY')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border',
            bucket === 'TODAY'
              ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
              : 'bg-surface text-muted-foreground border-border hover:bg-muted',
          )}
        >
          Due Today
        </button>

        <button
          type="button"
          onClick={() => setBucket('OVERDUE')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border',
            bucket === 'OVERDUE'
              ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
              : 'bg-surface text-muted-foreground border-border hover:bg-muted',
          )}
        >
          Overdue
        </button>

        <button
          type="button"
          onClick={() => setBucket('TOMORROW')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border',
            bucket === 'TOMORROW'
              ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
              : 'bg-surface text-muted-foreground border-border hover:bg-muted',
          )}
        >
          Tomorrow
        </button>

        <button
          type="button"
          onClick={() => setBucket('UPCOMING')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border',
            bucket === 'UPCOMING'
              ? 'bg-slate-700 text-white border-slate-800 shadow-xs'
              : 'bg-surface text-muted-foreground border-border hover:bg-muted',
          )}
        >
          Upcoming
        </button>
      </div>

      {/* Follow-up Cards List */}
      <div className="space-y-3">
        {loading && followups.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            Loading follow-up tasks...
          </div>
        ) : followups.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="size-8 mx-auto text-emerald-500/60" />
            <p className="font-semibold text-sm">No follow-ups in this bucket</p>
            <p className="text-xs text-muted-foreground">
              You have no pending follow-ups scheduled here.
            </p>
          </div>
        ) : (
          followups.map((item) => (
            <Card
              key={item.id}
              className={cn(
                'border shadow-xs hover:border-border-strong transition-colors',
                bucket === 'OVERDUE' ? 'border-rose-500/30 bg-rose-500/5' : 'border-border bg-surface',
              )}
            >
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/organisations/${item.organisation.id}`}
                      className="font-bold text-sm text-foreground hover:text-primary transition-colors truncate"
                    >
                      {item.organisation.name}
                    </Link>
                    <Badge tone={bucket === 'OVERDUE' ? 'rose' : 'amber'} size="sm">
                      Due: {formatDate(item.dueDate)}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    {item.contact && <span>Contact: <strong>{item.contact.name}</strong></span>}
                    {item.assignedTo && (
                      <span className="flex items-center gap-1">
                        · Assigned: {item.assignedTo.name}
                      </span>
                    )}
                  </div>

                  {item.note && (
                    <p className="text-xs text-foreground/90 bg-surface-muted/60 p-2 rounded-md border border-border/50">
                      {item.note}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handleComplete(item.id)}
                    icon={<CheckCircle2 className="size-3.5 text-emerald-600" />}
                  >
                    Mark Done
                  </Button>

                  <Button
                    variant="primary"
                    size="xs"
                    onClick={() => openLog(item)}
                    icon={<Phone className="size-3.5" />}
                  >
                    Log Interaction
                  </Button>
                </div>
              </CardContent>
            </Card>
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
