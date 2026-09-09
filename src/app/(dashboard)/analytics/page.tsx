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
  ShieldCheck,
  Activity,
  Compass,
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
      <div className="rounded-xl border border-border bg-surface p-3 shadow-lg text-xs space-y-1.5 min-w-[170px]">
        <div className="font-bold text-foreground border-b border-border/60 pb-1 flex items-center justify-between">
          <span>{label}</span>
          <span
            className={cn(
              'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
              diff > 0
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : diff < 0
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  : 'bg-muted text-muted-foreground',
            )}
          >
            {diff > 0 ? `+${diff}` : diff}
          </span>
        </div>
        <div className="space-y-1 pt-0.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-full bg-indigo-500 inline-block" />
              Today:
            </span>
            <span className="font-bold text-foreground">{todayVal}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-full bg-slate-400 inline-block" />
              Yesterday:
            </span>
            <span className="font-medium text-foreground">{yesterdayVal}</span>
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
      <div className="rounded-xl border border-border bg-surface p-3.5 shadow-lg text-xs space-y-2 min-w-[210px]">
        <div className="font-bold text-foreground border-b border-border/60 pb-1.5">
          {item.domain}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Account Coverage:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {item.coveragePercent}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Organisations:</span>
            <span className="font-medium text-foreground">
              {item.contactedOrganisations} contacted / {item.totalOrganisations} total
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Untapped Whitespace:</span>
            <span className="font-medium text-muted-foreground">
              {item.uncontactedOrganisations} accounts
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Pipeline Leads:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {item.pipelineLeads} converted
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Activities Logged:</span>
            <span className="font-medium text-foreground">
              {item.activitiesCount} touches
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

  const exec = data?.executiveAnalytics
  const todayTotals = exec?.todayVsYesterday?.todayTotals
  const yesterdayTotals = exec?.todayVsYesterday?.yesterdayTotals
  const velocityGrowth = exec?.todayVsYesterday?.velocityChangePercent ?? 0

  // Aggregate stats for domain summary
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

      {/* EXECUTIVE LEADERSHIP INTELLIGENCE (LEAD & OWNER SPECIFICALLY) */}
      {data?.isLeader && exec && (
        <div className="space-y-4 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-foreground">
                    Leadership Velocity & Market Penetration
                  </h2>
                  <Badge tone="indigo" size="sm" className="font-semibold text-[10px] tracking-wide uppercase">
                    Lead & Owner Only
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Real-time day-over-day momentum tracking and healthcare & wellness domain account coverage.
                </p>
              </div>
            </div>

            {/* Quick summary badges */}
            <div className="flex items-center gap-2 text-xs">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-surface font-medium text-foreground">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span>Market Coverage: <strong className="font-bold">{overallCoverageRate}%</strong></span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-surface font-medium text-foreground">
                <span className="size-2 rounded-full bg-amber-500" />
                <span>Pipeline Leads: <strong className="font-bold">{totalPipelineInDomains}</strong></span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* GRAPH 1: Today vs Yesterday Outreach Velocity (5 cols) */}
            <Card className="lg:col-span-5 border-border bg-surface shadow-xs flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Activity className="size-4 text-indigo-500" />
                      <CardTitle className="text-sm font-bold">Today vs Yesterday Velocity</CardTitle>
                    </div>
                    <CardDescription className="text-xs mt-0.5">
                      Touchpoint comparison across active channels.
                    </CardDescription>
                  </div>

                  <div className="text-right">
                    <Badge
                      tone={velocityGrowth >= 0 ? 'emerald' : 'rose'}
                      size="sm"
                      className="font-bold whitespace-nowrap"
                    >
                      {velocityGrowth >= 0 ? `+${velocityGrowth}% ahead` : `${velocityGrowth}% behind`}
                    </Badge>
                  </div>
                </div>

                {/* Scorecard strip */}
                <div className="grid grid-cols-3 gap-2 pt-3">
                  <div className="rounded-lg border border-border bg-surface-muted/40 p-2 text-center">
                    <div className="text-[10px] uppercase font-semibold text-muted-foreground">Today</div>
                    <div className="text-base font-bold text-foreground">{todayTotals?.total ?? 0}</div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-muted/40 p-2 text-center">
                    <div className="text-[10px] uppercase font-semibold text-muted-foreground">Yesterday</div>
                    <div className="text-base font-bold text-muted-foreground">{yesterdayTotals?.total ?? 0}</div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-muted/40 p-2 text-center">
                    <div className="text-[10px] uppercase font-semibold text-muted-foreground">Net Diff</div>
                    <div className={cn(
                      'text-base font-bold',
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
                <div className="h-[250px] w-full">
                  {mounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={exec.todayVsYesterday.channelData}
                        margin={{ top: 12, right: 10, left: -24, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/60" vertical={false} />
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
                          wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                          formatter={(value) => <span className="text-foreground font-medium">{value}</span>}
                        />
                        <Bar
                          dataKey="Today"
                          fill="#6366f1"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={28}
                        />
                        <Bar
                          dataKey="Yesterday"
                          fill="#94a3b8"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={28}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full rounded-lg bg-surface-muted animate-pulse" />
                  )}
                </div>

                {/* Sub-bar velocity delta pills */}
                <div className="grid grid-cols-5 gap-1 pt-3 border-t border-border/70 mt-1">
                  {exec.todayVsYesterday.channelData.map((c: any) => (
                    <div key={c.channel} className="text-center">
                      <div className="text-[10px] text-muted-foreground truncate font-medium">{c.channel}</div>
                      <div className={cn(
                        'text-[11px] font-bold',
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
            <Card className="lg:col-span-7 border-border bg-surface shadow-xs flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Compass className="size-4 text-emerald-500" />
                      <CardTitle className="text-sm font-bold">Domains Covered & Account Penetration</CardTitle>
                    </div>
                    <CardDescription className="text-xs mt-0.5">
                      Target healthcare & wellness domains: Contacted accounts vs untapped whitespace.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge tone="emerald" size="sm" className="font-bold whitespace-nowrap">
                      {totalContactedInDomains} / {totalOrgsInDomains} Orgs Reached
                    </Badge>
                  </div>
                </div>

                {/* Legend explanation bar */}
                <div className="flex items-center justify-between gap-4 pt-3 text-xs">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-sm bg-emerald-500 inline-block" />
                      <span className="text-muted-foreground text-[11px]">Contacted Accounts</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-sm bg-slate-300 dark:bg-slate-700 inline-block" />
                      <span className="text-muted-foreground text-[11px]">Untapped Whitespace</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {exec.domainsCovered.length} Active Domains
                  </span>
                </div>
              </CardHeader>

              <CardContent className="pt-2 pb-4">
                {exec.domainsCovered.length === 0 ? (
                  <div className="h-[250px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground text-xs">
                    <Compass className="size-8 text-muted-foreground/40 mb-2" />
                    <p className="font-semibold text-foreground">No domain accounts cataloged yet</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Add organisations with domains or categories to track penetration here.
                    </p>
                  </div>
                ) : (
                  <div className="h-[250px] w-full">
                    {mounted ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={exec.domainsCovered.slice(0, 7)}
                          margin={{ top: 8, right: 24, left: 16, bottom: -6 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/60" horizontal={false} />
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
                            width={130}
                            tickFormatter={(val: string) => (val.length > 18 ? `${val.slice(0, 16)}…` : val)}
                          />
                          <Tooltip content={<DomainCoverageTooltip />} />
                          <Bar
                            dataKey="contactedOrganisations"
                            name="Contacted"
                            stackId="domainStack"
                            fill="#10b981"
                            radius={[0, 0, 0, 0]}
                            maxBarSize={18}
                          />
                          <Bar
                            dataKey="uncontactedOrganisations"
                            name="Untapped Whitespace"
                            stackId="domainStack"
                            fill="#cbd5e1"
                            className="dark:fill-slate-700"
                            radius={[0, 4, 4, 0]}
                            maxBarSize={18}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full w-full rounded-lg bg-surface-muted animate-pulse" />
                    )}
                  </div>
                )}

                {/* Domain highlights footer */}
                {exec.domainsCovered.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-border/70 mt-1 text-xs">
                    <div className="p-2 rounded-lg bg-surface-muted/40 border border-border/50">
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground truncate">
                        Top Penetration
                      </div>
                      <div className="font-bold text-foreground text-[11px] truncate mt-0.5">
                        {exec.domainsCovered[0]?.domain} ({exec.domainsCovered[0]?.coveragePercent}%)
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-surface-muted/40 border border-border/50">
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground truncate">
                        Pipeline Opportunity
                      </div>
                      <div className="font-bold text-amber-600 dark:text-amber-400 text-[11px] truncate mt-0.5">
                        {totalPipelineInDomains} Deals in Play
                      </div>
                    </div>
                    <div className="col-span-2 sm:col-span-1 p-2 rounded-lg bg-surface-muted/40 border border-border/50">
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground truncate">
                        Untapped Whitespace
                      </div>
                      <div className="font-bold text-muted-foreground text-[11px] truncate mt-0.5">
                        {Math.max(0, totalOrgsInDomains - totalContactedInDomains)} Accounts Left
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
