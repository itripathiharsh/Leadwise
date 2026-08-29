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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <CalendarIcon className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Outreach &amp; Follow-up Calendar
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Scheduled follow-ups, discovery meetings, and outreach deadlines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth} icon={<ChevronLeft className="size-4" />} />
          <span className="text-sm font-bold min-w-36 text-center">{monthName}</span>
          <Button variant="outline" size="sm" onClick={nextMonth} icon={<ChevronRight className="size-4" />} />
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="border-border bg-surface shadow-xs overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border text-center text-xs font-bold py-2.5 bg-surface-muted/50 text-muted-foreground uppercase">
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
                  isToday ? 'bg-primary-soft/20 ring-1 ring-inset ring-primary' : 'bg-surface hover:bg-muted/30',
                )}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className={cn('font-bold', isToday ? 'text-primary' : 'text-muted-foreground')}>
                    {d}
                  </span>
                  {dayEvents.length > 0 && (
                    <Badge tone="blue" size="sm">
                      {dayEvents.length}
                    </Badge>
                  )}
                </div>

                <div className="space-y-1 max-h-20 overflow-y-auto pr-0.5">
                  {dayEvents.map((ev) => (
                    <Link
                      key={ev.id}
                      href={`/organisations/${ev.organisationId}`}
                      className="block p-1 rounded-md bg-surface-muted/90 border border-border text-[10px] hover:border-primary transition-colors"
                    >
                      <div className="font-bold text-foreground truncate">{ev.organisation?.name}</div>
                      <div className="text-muted-foreground truncate">{ev.notes || 'Follow-up Call'}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
