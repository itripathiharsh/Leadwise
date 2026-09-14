'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = React.useState(new Date())
  const [events, setEvents] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  const fetchEvents = React.useCallback(async (date: Date) => {
    setLoading(true)
    try {
      const year = date.getFullYear()
      const month = date.getMonth()
      const from = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10)
      const to = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10)
      const res = await fetch(`/api/followups?pageSize=100&from=${from}&to=${to}`)
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
    fetchEvents(currentMonth)
  }, [fetchEvents, currentMonth])

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
    <div className="max-w-7xl mx-auto space-y-5 p-4 sm:p-6 lg:p-8">
      {/* Precision Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-surface-muted text-foreground border border-border">
              <CalendarIcon className="size-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-sans font-bold text-xl sm:text-2xl tracking-tight text-foreground">
                  Meeting Schedule & Deadlines
                </h1>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-muted text-muted-foreground border border-border">
                  {events.length} Scheduled
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Calendar view of discovery calls, follow-up deadlines, and partnership touchpoints.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchEvents(currentMonth)}
            icon={<RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />}
          >
            Refresh
          </Button>

          <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-0.5">
            <Button
              variant="ghost"
              size="xs"
              onClick={prevMonth}
              icon={<ChevronLeft className="size-3.5" />}
            />
            <span className="text-xs font-semibold min-w-32 text-center text-foreground px-2">
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
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-7 border-b border-border text-center text-xs font-semibold py-2.5 bg-surface-muted/40 text-muted-foreground uppercase tracking-wider">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            <div className="grid grid-cols-7 divide-x divide-y divide-border border-b border-border">
              {blanksArray.map((_, i) => (
                <div key={`blank-${i}`} className="min-h-28 bg-surface-muted/20 p-2" />
              ))}

              {daysArray.map((d) => {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                const dayEvents = events.filter((e) => e.dueDate?.slice(0, 10) === dateStr)
                const isToday = new Date().toISOString().slice(0, 10) === dateStr

                return (
                  <div
                    key={`day-${d}`}
                    className={cn(
                      'min-h-28 p-2 transition-colors relative space-y-1',
                      isToday
                        ? 'bg-primary/5 ring-1 ring-inset ring-primary'
                        : 'bg-surface hover:bg-surface-hover',
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
                        {isToday && <span className="size-1.5 rounded-full bg-primary" />}
                        {d}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="font-mono text-[10px] font-semibold tabular px-1.5 py-0.2 rounded bg-surface-muted text-foreground border border-border">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 max-h-24 overflow-y-auto pr-0.5">
                      {dayEvents.map((ev) => (
                        <Link
                          key={ev.id}
                          href={`/organisations/${ev.organisationId}`}
                          className="block p-1.5 rounded border border-border bg-surface-muted/50 text-[10px] hover:border-border-strong hover:bg-surface transition-colors"
                        >
                          <div className="font-semibold text-foreground truncate">{ev.organisation?.name}</div>
                          <div className="text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                            <Clock className="size-2.5 text-amber-500" />
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
      </div>
    </div>
  )
}
