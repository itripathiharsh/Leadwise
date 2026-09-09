'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Building2,
  Phone,
  Mail,
  CalendarCheck,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/dates'
import { cn } from '@/lib/utils'

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = React.useState(new Date())
  const [events, setEvents] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  const fetchEvents = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/followups?limit=100')
      if (res.ok) {
        const json = await res.json()
        setEvents(json.items || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const monthName = currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  // Calculate calendar days
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const totalDays = new Date(year, month + 1, 0).getDate()

  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1)
  const blanksArray = Array.from({ length: firstDay }, (_, i) => i)

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Executive Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
              <CalendarIcon className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-display font-extrabold text-2xl tracking-tight text-foreground">
                  Meeting Schedule & Deadlines
                </h1>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-surface-elevated text-primary border border-primary/20 font-bold">
                  {events.length} Scheduled
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Time-mapped discovery calls, follow-up deadlines, and partnership alignment syncs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchEvents}
            icon={<RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />}
            className="border-border hover:bg-surface-elevated"
          >
            Refresh
          </Button>

          <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-surface/80 p-1 shadow-xs">
            <Button
              variant="ghost"
              size="xs"
              onClick={prevMonth}
              icon={<ChevronLeft className="size-3.5" />}
            />
            <span className="text-xs font-bold font-mono min-w-32 text-center text-foreground px-2">
              {monthName}
            </span>
            <Button
              variant="ghost"
              size="xs"
              onClick={nextMonth}
              icon={<ChevronRight className="size-3.5" />}
            />
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="glass-card rounded-2xl border border-border/90 bg-surface/80 shadow-md overflow-hidden rim-highlight">
        <div className="grid grid-cols-7 border-b border-border/80 text-center text-xs font-mono font-bold py-3 bg-surface-elevated/50 text-muted-foreground uppercase tracking-wider">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        <div className="grid grid-cols-7 divide-x divide-y divide-border/60 border-b border-border/60">
          {blanksArray.map((_, i) => (
            <div key={`blank-${i}`} className="min-h-32 bg-surface-elevated/20 p-2" />
          ))}

          {daysArray.map((d) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
            const dayEvents = events.filter((e) => e.dueDate?.slice(0, 10) === dateStr)
            const isToday = new Date().toISOString().slice(0, 10) === dateStr

            return (
              <div
                key={`day-${d}`}
                className={cn(
                  'min-h-32 p-2.5 transition-colors relative space-y-1.5',
                  isToday
                    ? 'bg-primary/10 ring-2 ring-inset ring-primary/60'
                    : 'bg-surface/50 hover:bg-surface-elevated/60',
                )}
              >
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={cn(
                      'font-mono font-bold text-xs',
                      isToday
                        ? 'text-primary flex items-center gap-1'
                        : 'text-muted-foreground',
                    )}
                  >
                    {isToday && <span className="size-1.5 rounded-full bg-primary animate-pulse" />}
                    {d}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-primary/20 text-primary border border-primary/30">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1 max-h-24 overflow-y-auto pr-0.5">
                  {dayEvents.map((ev) => (
                    <Link
                      key={ev.id}
                      href={`/organisations/${ev.organisationId}`}
                      className="block p-1.5 rounded-lg bg-surface-elevated/80 border border-border/70 text-[10px] hover:border-primary transition-all shadow-2xs"
                    >
                      <div className="font-bold text-foreground truncate">{ev.organisation?.name}</div>
                      <div className="text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        <Clock className="size-2.5 text-amber-400" />
                        <span>{ev.note || 'Follow-up Call'}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
