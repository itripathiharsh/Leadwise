'use client'

import * as React from 'react'
import {
  TrendingUp,
  BarChart3,
  Users,
  Phone,
  Mail,
  Linkedin,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Target,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function AnalyticsPage() {
  const [data, setData] = React.useState<any | null>(null)
  const [targetsProgress, setTargetsProgress] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [res1, res2] = await Promise.all([
        fetch('/api/analytics'),
        fetch('/api/targets'),
      ])

      if (res1.ok) {
        const d1 = await res1.json()
        setData(d1)
      }
      if (res2.ok) {
        const d2 = await res2.json()
        setTargetsProgress(d2.progress ?? [])
      }
    } catch {
      toast.error('Failed to load performance analytics.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <TrendingUp className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Team Performance & Analytics
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Weekly outreach growth trends, Target vs Actual progress, and team productivity breakdown.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          icon={<RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />}
        >
          Refresh Data
        </Button>
      </div>

      {/* Target vs Actual Daily Gauges */}
      {targetsProgress.length > 0 && (
        <Card className="border-border bg-surface shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Target className="size-5 text-amber-500" />
              <div>
                <CardTitle className="text-base font-bold">Today&apos;s Daily Target vs Actual</CardTitle>
                <CardDescription className="text-xs">
                  Real-time outreach quota completion for today.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {targetsProgress.map((rep) => (
                <div
                  key={rep.userId}
                  className="rounded-xl border border-border bg-surface-muted/30 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar name={rep.userName} color={rep.avatarColor} size="sm" />
                      <div>
                        <div className="text-xs font-bold text-foreground">{rep.userName}</div>
                        <div className="text-[10px] text-muted-foreground">{rep.role}</div>
                      </div>
                    </div>
                    <Badge
                      tone={
                        rep.progressPercent.overall >= 80
                          ? 'emerald'
                          : rep.progressPercent.overall >= 50
                            ? 'amber'
                            : 'slate'
                      }
                      size="sm"
                    >
                      {rep.progressPercent.overall}% Overall
                    </Badge>
                  </div>

                  {/* Progress bars */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex justify-between text-[11px] font-medium text-muted-foreground pb-1">
                        <span>Calls</span>
                        <span className="text-foreground">
                          {rep.actuals.calls} / {rep.targets.calls}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, rep.progressPercent.calls)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-medium text-muted-foreground pb-1">
                        <span>Emails</span>
                        <span className="text-foreground">
                          {rep.actuals.emails} / {rep.targets.emails}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, rep.progressPercent.emails)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-medium text-muted-foreground pb-1">
                        <span>LinkedIn</span>
                        <span className="text-foreground">
                          {rep.actuals.linkedin} / {rep.targets.linkedin}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full bg-sky-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, rep.progressPercent.linkedin)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Week-over-Week Comparison Cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              label: 'Organisations',
              value: data.currentWeek.organisationsContacted,
              prev: data.previousWeek.organisationsContacted,
              growth: data.growthPercent.organisations,
            },
            {
              label: 'Calls Placed',
              value: data.currentWeek.calls,
              prev: data.previousWeek.calls,
              growth: data.growthPercent.calls,
            },
            {
              label: 'Emails Sent',
              value: data.currentWeek.emails,
              prev: data.previousWeek.emails,
              growth: data.growthPercent.emails,
            },
            {
              label: 'LinkedIn Touches',
              value: data.currentWeek.linkedin,
              prev: data.previousWeek.linkedin,
              growth: data.growthPercent.linkedin,
            },
            {
              label: 'Responses',
              value: data.currentWeek.responses,
              prev: data.previousWeek.responses,
              growth: data.growthPercent.responses,
            },
            {
              label: 'Meetings',
              value: data.currentWeek.meetings,
              prev: data.previousWeek.meetings,
              growth: data.growthPercent.meetings,
            },
          ].map((item) => {
            const isPositive = item.growth >= 0
            return (
              <div
                key={item.label}
                className="rounded-xl border border-border bg-surface p-4 shadow-xs space-y-1.5"
              >
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                  {item.label}
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {item.value}
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold">
                  {isPositive ? (
                    <span className="flex items-center text-emerald-600 dark:text-emerald-400">
                      <ArrowUpRight className="size-3" /> +{item.growth}%
                    </span>
                  ) : (
                    <span className="flex items-center text-rose-600 dark:text-rose-400">
                      <ArrowDownRight className="size-3" /> {item.growth}%
                    </span>
                  )}
                  <span className="text-muted-foreground text-[10px]">vs prev week</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Team Productivity Comparison Matrix */}
      {data?.teamBreakdown && (
        <Card className="border-border bg-surface shadow-xs overflow-hidden">
          <CardHeader className="border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-primary" />
              <div>
                <CardTitle className="text-base font-bold">Team Outreach Breakdown (Past 7 Days)</CardTitle>
                <CardDescription className="text-xs">
                  Comparative performance across all partnership outreach channels.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-muted/60 text-muted-foreground uppercase text-[10px] font-bold border-b border-border">
                <tr>
                  <th className="p-3.5 pl-6">Team Member</th>
                  <th className="p-3.5 text-center">Orgs Reached</th>
                  <th className="p-3.5 text-center">Calls</th>
                  <th className="p-3.5 text-center">Emails</th>
                  <th className="p-3.5 text-center">LinkedIn</th>
                  <th className="p-3.5 text-center">Responses</th>
                  <th className="p-3.5 text-center">Interested</th>
                  <th className="p-3.5 text-center pr-6">Meetings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.teamBreakdown.map((row: any) => (
                  <tr key={row.userId} className="hover:bg-muted/40 transition-colors">
                    <td className="p-3.5 pl-6 flex items-center gap-2.5 font-semibold text-foreground">
                      <Avatar name={row.userName} color={row.avatarColor} size="xs" />
                      <div>
                        <div>{row.userName}</div>
                        <div className="text-[10px] text-muted-foreground font-normal">{row.role}</div>
                      </div>
                    </td>
                    <td className="p-3.5 text-center font-bold text-foreground">{row.organisations}</td>
                    <td className="p-3.5 text-center text-muted-foreground">{row.calls}</td>
                    <td className="p-3.5 text-center text-muted-foreground">{row.emails}</td>
                    <td className="p-3.5 text-center text-muted-foreground">{row.linkedin}</td>
                    <td className="p-3.5 text-center font-semibold text-teal-600 dark:text-teal-400">
                      {row.responses}
                    </td>
                    <td className="p-3.5 text-center font-bold text-amber-600 dark:text-amber-400">
                      {row.interested}
                    </td>
                    <td className="p-3.5 text-center font-bold text-violet-600 dark:text-violet-400 pr-6">
                      {row.meetings}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
