'use client'

import * as React from 'react'
import {
  TrendingUp,
  BarChart3,
  Users,
  RefreshCw,
  Target,
  ShieldCheck,
  Activity,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function TodayYesterdayTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const todayVal = payload.find((p: any) => p.dataKey === 'Today')?.value ?? 0
    const yesterdayVal = payload.find((p: any) => p.dataKey === 'Yesterday')?.value ?? 0
    const diff = todayVal - yesterdayVal
    return (
      <div className="rounded-lg border border-border bg-surface p-3 shadow-md text-xs space-y-1.5 min-w-[170px]">
        <div className="font-semibold text-foreground border-b border-border pb-1 flex items-center justify-between">
          <span>{label}</span>
          <span
            className={cn(
              'text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded',
              diff > 0
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : diff < 0
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  : 'bg-surface-muted text-muted-foreground',
            )}
          >
            {diff > 0 ? `+${diff}` : diff}
          </span>
        </div>
        <div className="space-y-1 pt-0.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-full bg-primary inline-block" />
              Today:
            </span>
            <span className="font-mono font-bold text-foreground tabular">{todayVal}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-full bg-muted-foreground inline-block" />
              Yesterday:
            </span>
            <span className="font-mono font-medium text-foreground tabular">{yesterdayVal}</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

function DomainCoverageTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const item = payload[0]?.payload
    if (!item) return null
    return (
      <div className="rounded-lg border border-border bg-surface p-3 shadow-md text-xs space-y-2 min-w-[210px]">
        <div className="font-semibold text-foreground border-b border-border pb-1">
          {item.domain}
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Account Coverage:</span>
            <span className="font-mono font-bold tabular text-emerald-600 dark:text-emerald-400">
              {item.coveragePercent}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Organisations:</span>
            <span className="font-mono tabular text-foreground">
              {item.contactedOrganisations} / {item.totalOrganisations}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Untapped:</span>
            <span className="font-mono tabular text-muted-foreground">
              {item.uncontactedOrganisations} accounts
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Pipeline Leads:</span>
            <span className="font-mono font-bold tabular text-amber-600 dark:text-amber-400">
              {item.pipelineLeads}
            </span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export default function AnalyticsPage() {
  const [data, setData] = React.useState<any | null>(null)
  const [targetsProgress, setTargetsProgress] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [res1, res2] = await Promise.all([
        fetch('/api/analytics'),
        fetch('/api/targets'),
      ])

      if (res1.status === 403 || res2.status === 403) {
        toast.error('Access Denied: Analytics is reserved for leadership.')
        window.location.href = '/dashboard?denied=1'
        return
      }

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
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d?.user && d.user.role !== 'OWNER' && d.user.role !== 'TL') {
          toast.error('Access Denied: Analytics is reserved for leadership.')
          window.location.href = '/dashboard?denied=1'
        }
      })
      .catch(() => {})
    fetchData()
  }, [fetchData])

  const exec = data?.executiveAnalytics
  const todayTotals = exec?.todayVsYesterday?.todayTotals
  const yesterdayTotals = exec?.todayVsYesterday?.yesterdayTotals
  const velocityGrowth = exec?.todayVsYesterday?.velocityChangePercent ?? 0

  const totalOrgsInDomains = React.useMemo(() => {
    if (!exec?.domainsCovered) return 0
    return exec.domainsCovered.reduce((acc: number, d: any) => acc + d.totalOrganisations, 0)
  }, [exec?.domainsCovered])

  const totalContactedInDomains = React.useMemo(() => {
    if (!exec?.domainsCovered) return 0
    return exec.domainsCovered.reduce((acc: number, d: any) => acc + d.contactedOrganisations, 0)
  }, [exec?.domainsCovered])

  const overallCoverageRate = totalOrgsInDomains > 0
    ? Math.round((totalContactedInDomains / totalOrgsInDomains) * 100)
    : 0

  const totalPipelineInDomains = React.useMemo(() => {
    if (!exec?.domainsCovered) return 0
    return exec.domainsCovered.reduce((acc: number, d: any) => acc + d.pipelineLeads, 0)
  }, [exec?.domainsCovered])

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Precision Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-surface-muted text-foreground border border-border">
              <TrendingUp className="size-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-sans font-bold text-xl sm:text-2xl tracking-tight text-foreground">
                  Team Performance & Analytics
                </h1>
                <Badge tone="indigo" size="sm">
                  Executive Intelligence
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Outreach trends, target quota completion, and rep productivity matrix.
              </p>
            </div>
          </div>
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
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-md bg-surface-muted text-muted-foreground border border-border flex items-center justify-center">
                <Target className="size-3.5" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Today&apos;s Daily Target vs Actual</CardTitle>
                <CardDescription className="text-xs">
                  Real-time outreach quota completion tracking for active team members.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {targetsProgress.map((rep) => (
                <div
                  key={rep.userId}
                  className="rounded-lg border border-border bg-surface-muted/30 p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar name={rep.userName} color={rep.avatarColor} size="xs" />
                      <div>
                        <div className="text-xs font-semibold text-foreground">{rep.userName}</div>
                        <div className="text-[10px] text-muted-foreground capitalize font-normal">{rep.role.toLowerCase()}</div>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] font-semibold tabular px-1.5 py-0.5 rounded bg-surface border border-border text-foreground">
                      {rep.progressPercent.overall}%
                    </span>
                  </div>

                  {/* Progress bars */}
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <div className="flex justify-between text-[10.5px] font-medium text-muted-foreground pb-0.5">
                        <span>Calls</span>
                        <span className="font-mono tabular text-foreground">
                          {rep.actuals.calls} / {rep.targets.calls}
                        </span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, rep.progressPercent.calls)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10.5px] font-medium text-muted-foreground pb-0.5">
                        <span>Emails</span>
                        <span className="font-mono tabular text-foreground">
                          {rep.actuals.emails} / {rep.targets.emails}
                        </span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, rep.progressPercent.emails)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10.5px] font-medium text-muted-foreground pb-0.5">
                        <span>LinkedIn</span>
                        <span className="font-mono tabular text-foreground">
                          {rep.actuals.linkedin} / {rep.targets.linkedin}
                        </span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full bg-sky-500 rounded-full transition-all duration-300"
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
                className="rounded-lg border border-border bg-surface p-3.5 space-y-1"
              >
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                  {item.label}
                </div>
                <div className="font-mono text-2xl font-bold tabular tracking-tight text-foreground">
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

      {/* EXECUTIVE LEADERSHIP INTELLIGENCE */}
      {data?.isLeader && exec && (
        <div className="space-y-4 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="size-6 rounded-md bg-surface-muted text-muted-foreground border border-border flex items-center justify-center">
                <ShieldCheck className="size-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground">
                    Leadership Velocity & Market Penetration
                  </h2>
                  <Badge tone="indigo" size="sm">
                    Executive
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-border bg-surface text-foreground text-[11px]">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span>Market Coverage: <strong>{overallCoverageRate}%</strong></span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-border bg-surface text-foreground text-[11px]">
                <span className="size-1.5 rounded-full bg-amber-500" />
                <span>Pipeline Deals: <strong>{totalPipelineInDomains}</strong></span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* GRAPH 1: Today vs Yesterday Velocity (5 cols) */}
            <Card className="lg:col-span-5 flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Activity className="size-4 text-primary" />
                      <CardTitle className="text-sm font-semibold">Today vs Yesterday Velocity</CardTitle>
                    </div>
                    <CardDescription className="text-xs mt-0.5">
                      Touchpoint comparison across active outreach channels.
                    </CardDescription>
                  </div>

                  <Badge
                    tone={velocityGrowth >= 0 ? 'emerald' : 'rose'}
                    size="sm"
                  >
                    {velocityGrowth >= 0 ? `+${velocityGrowth}%` : `${velocityGrowth}%`}
                  </Badge>
                </div>

                {/* Scorecard strip */}
                <div className="grid grid-cols-3 gap-2 pt-3">
                  <div className="rounded border border-border bg-surface-muted/40 p-2 text-center">
                    <div className="text-[10px] uppercase font-semibold text-muted-foreground">Today</div>
                    <div className="font-mono text-base font-bold tabular text-foreground">{todayTotals?.total ?? 0}</div>
                  </div>
                  <div className="rounded border border-border bg-surface-muted/40 p-2 text-center">
                    <div className="text-[10px] uppercase font-semibold text-muted-foreground">Yesterday</div>
                    <div className="font-mono text-base font-bold tabular text-muted-foreground">{yesterdayTotals?.total ?? 0}</div>
                  </div>
                  <div className="rounded border border-border bg-surface-muted/40 p-2 text-center">
                    <div className="text-[10px] uppercase font-semibold text-muted-foreground">Net Diff</div>
                    <div className={cn(
                      'font-mono text-base font-bold tabular',
                      (todayTotals?.total ?? 0) >= (yesterdayTotals?.total ?? 0)
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    )}>
                      {(todayTotals?.total ?? 0) - (yesterdayTotals?.total ?? 0) >= 0
                        ? `+${(todayTotals?.total ?? 0) - (yesterdayTotals?.total ?? 0)}`
                        : (todayTotals?.total ?? 0) - (yesterdayTotals?.total ?? 0)}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-2 pb-4">
                <div className="h-[220px] w-full">
                  {mounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={exec.todayVsYesterday.channelData}
                        margin={{ top: 8, right: 10, left: -24, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#263348" opacity={0.4} vertical={false} />
                        <XAxis
                          dataKey="channel"
                          stroke="currentColor"
                          className="text-muted-foreground text-[11px]"
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          stroke="currentColor"
                          className="text-muted-foreground text-[11px]"
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip content={<TodayYesterdayTooltip />} />
                        <Legend
                          wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                          formatter={(value) => <span className="text-foreground font-medium">{value}</span>}
                        />
                        <Bar
                          dataKey="Today"
                          fill="#4F46E5"
                          radius={[3, 3, 0, 0]}
                          maxBarSize={24}
                        />
                        <Bar
                          dataKey="Yesterday"
                          fill="#64748B"
                          radius={[3, 3, 0, 0]}
                          maxBarSize={24}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full rounded bg-surface-muted animate-pulse" />
                  )}
                </div>

                {/* Sub-bar velocity delta pills */}
                <div className="grid grid-cols-5 gap-1 pt-2.5 border-t border-border mt-1">
                  {exec.todayVsYesterday.channelData.map((c: any) => (
                    <div key={c.channel} className="text-center">
                      <div className="text-[10px] text-muted-foreground truncate font-medium">{c.channel}</div>
                      <div className={cn(
                        'font-mono text-[11px] font-bold tabular',
                        c.diff > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : c.diff < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-muted-foreground'
                      )}>
                        {c.diff > 0 ? `+${c.diff}` : c.diff}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* GRAPH 2: Domains Covered & Account Penetration (7 cols) */}
            <Card className="lg:col-span-7 flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Compass className="size-4 text-emerald-500" />
                      <CardTitle className="text-sm font-semibold">Domains Covered & Account Penetration</CardTitle>
                    </div>
                    <CardDescription className="text-xs mt-0.5">
                      Target healthcare & clinical domains: Contacted accounts vs untapped whitespace.
                    </CardDescription>
                  </div>

                  <Badge tone="emerald" size="sm">
                    {totalContactedInDomains} / {totalOrgsInDomains} Reached
                  </Badge>
                </div>

                <div className="flex items-center justify-between gap-4 pt-2.5 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-sm bg-emerald-500 inline-block" />
                      <span className="text-muted-foreground text-[11px]">Contacted</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-sm bg-slate-400 inline-block" />
                      <span className="text-muted-foreground text-[11px]">Untapped</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {exec.domainsCovered.length} Active Domains
                  </span>
                </div>
              </CardHeader>

              <CardContent className="pt-2 pb-4">
                {exec.domainsCovered.length === 0 ? (
                  <div className="h-[220px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground text-xs">
                    <Compass className="size-7 text-muted-foreground mb-2" />
                    <p className="font-semibold text-foreground">No domain accounts cataloged yet</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Add organisations with domains or categories to track penetration here.
                    </p>
                  </div>
                ) : (
                  <div className="h-[220px] w-full">
                    {mounted ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={exec.domainsCovered.slice(0, 7)}
                          margin={{ top: 8, right: 20, left: 12, bottom: -6 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#263348" opacity={0.4} horizontal={false} />
                          <XAxis
                            type="number"
                            allowDecimals={false}
                            stroke="currentColor"
                            className="text-muted-foreground text-[11px]"
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="domain"
                            stroke="currentColor"
                            className="text-foreground text-[11px] font-medium"
                            tickLine={false}
                            axisLine={false}
                            width={120}
                            tickFormatter={(val: string) => (val.length > 16 ? `${val.slice(0, 14)}…` : val)}
                          />
                          <Tooltip content={<DomainCoverageTooltip />} />
                          <Bar
                            dataKey="contactedOrganisations"
                            name="Contacted"
                            stackId="domainStack"
                            fill="#10B981"
                            radius={[0, 0, 0, 0]}
                            maxBarSize={16}
                          />
                          <Bar
                            dataKey="uncontactedOrganisations"
                            name="Untapped Whitespace"
                            stackId="domainStack"
                            fill="#64748B"
                            radius={[0, 3, 3, 0]}
                            maxBarSize={16}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full w-full rounded bg-surface-muted animate-pulse" />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Team Productivity Matrix */}
      {data?.teamBreakdown && (
        <Card>
          <CardHeader className="border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Users className="size-4.5 text-primary" />
              <div>
                <CardTitle className="text-sm font-semibold">Team Outreach Breakdown (Past 7 Days)</CardTitle>
                <CardDescription className="text-xs">
                  Performance metrics across all partnership outreach channels.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider bg-surface-muted/50">
                  <th className="py-2.5 px-4">Member</th>
                  <th className="py-2.5 px-3 text-center">Orgs</th>
                  <th className="py-2.5 px-3 text-center">Calls</th>
                  <th className="py-2.5 px-3 text-center">Emails</th>
                  <th className="py-2.5 px-3 text-center">LinkedIn</th>
                  <th className="py-2.5 px-3 text-center">Responses</th>
                  <th className="py-2.5 px-3 text-center">Interested</th>
                  <th className="py-2.5 px-4 text-right">Meetings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-mono">
                {data.teamBreakdown.map((row: any) => (
                  <tr key={row.userId} className="hover:bg-surface-hover transition-colors">
                    <td className="py-2.5 px-4 flex items-center gap-2 font-sans font-medium text-foreground">
                      <Avatar name={row.userName} color={row.avatarColor} size="xs" />
                      <div>
                        <div className="font-semibold">{row.userName}</div>
                        <div className="text-[10px] text-muted-foreground capitalize font-normal">{row.role.toLowerCase()}</div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center tabular text-foreground font-semibold">{row.organisations}</td>
                    <td className="py-2.5 px-3 text-center tabular text-muted-foreground">{row.calls}</td>
                    <td className="py-2.5 px-3 text-center tabular text-muted-foreground">{row.emails}</td>
                    <td className="py-2.5 px-3 text-center tabular text-muted-foreground">{row.linkedin}</td>
                    <td className="py-2.5 px-3 text-center tabular text-emerald-600 dark:text-emerald-400 font-semibold">
                      {row.responses}
                    </td>
                    <td className="py-2.5 px-3 text-center tabular text-amber-600 dark:text-amber-400 font-semibold">
                      {row.interested}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular font-bold text-violet-600 dark:text-violet-400">
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
