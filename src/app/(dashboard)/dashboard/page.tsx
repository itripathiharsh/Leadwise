import * as React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Building2,
  Phone,
  Mail,
  Linkedin,
  Calendar,
  Sparkles,
  Flame,
  Clock,
  ArrowRight,
  TrendingUp,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Target,
  Award,
} from 'lucide-react'
import { requireUser } from '@/lib/auth/current-user'
import { organisationScope } from '@/lib/rbac'
import { prisma } from '@/lib/db'
import { getDayMetrics, getUserDayMetrics } from '@/server/services/metrics'
import { listFollowUps } from '@/server/services/followups'
import { listActivities } from '@/server/services/activities'
import { listOrganisations } from '@/server/services/organisations'
import { recommendTodayPriorities } from '@/server/services/ai/intelligence'
import { todayKey, formatDateTime, formatDate } from '@/lib/dates'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { DashboardClientActions } from './dashboard-actions'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Command Center',
  description: 'Partnership intelligence and outreach operations',
}

export default async function DashboardPage() {
  const user = await requireUser()
  const today = todayKey()

  const isOwner = user.role === 'OWNER'
  const isLeader = user.role === 'OWNER' || user.role === 'TL'

  // Fetch all primary dashboard metrics and pipeline distribution in parallel
  const [
    todayMetrics,
    teamMetricsRaw,
    dueTodayFollowups,
    overdueFollowups,
    recentActivities,
    hotLeads,
    todayPriorities,
    pipelineGroupCounts,
  ] = await Promise.all([
    getDayMetrics(today, user),
    isLeader ? getUserDayMetrics(today, user) : Promise.resolve([]),
    listFollowUps(user, { bucket: 'TODAY', pageSize: 6 }),
    listFollowUps(user, { bucket: 'OVERDUE', pageSize: 6 }),
    listActivities(user, { pageSize: 8 }),
    listOrganisations(user, { status: ['INTERESTED', 'MEETING', 'PARTNERSHIP'], pageSize: 5 }),
    !isOwner ? recommendTodayPriorities(user) : Promise.resolve([]),
    prisma.organisation.groupBy({
      by: ['status'],
      _count: { id: true },
      where: {
        deletedAt: null,
        ...organisationScope(user),
      },
    }),
  ])

  // Owner only overviews; only reps and outreach team members are shown in outreach velocity
  const teamMetrics = teamMetricsRaw.filter((tm) => tm.role !== 'OWNER')

  // Greeting based on time of day
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Pipeline distribution map
  const statusCounts: Record<string, number> = {}
  pipelineGroupCounts.forEach((g) => {
    statusCounts[g.status] = g._count.id
  })

  const assignedCount = (statusCounts['ASSIGNED'] ?? 0) + (statusCounts['NEW'] ?? 0)
  const contactedCount = statusCounts['CONTACTED'] ?? 0
  const respondedCount = statusCounts['RESPONDED'] ?? 0
  const meetingCount = statusCounts['MEETING'] ?? 0
  const interestedCount = statusCounts['INTERESTED'] ?? 0
  const partnershipCount = statusCounts['PARTNERSHIP'] ?? 0
  const coldCount = statusCounts['REJECTED'] ?? 0
  const totalInPipeline = assignedCount + contactedCount + respondedCount + meetingCount + interestedCount + partnershipCount

  const urgentTotal = overdueFollowups.total + dueTodayFollowups.total

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Precision Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {greeting}, {user.name}
            </h1>
            <Badge tone="indigo" size="sm">
              {isOwner ? 'Executive Overview' : 'Live Operations'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isOwner ? (
              urgentTotal > 0 ? (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {urgentTotal} team outreach action{urgentTotal === 1 ? '' : 's'} require follow-up across reps today.
                </span>
              ) : (
                <span>All team follow-up pipelines are currently up to date. Overviewing active outreach velocity.</span>
              )
            ) : urgentTotal > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                {urgentTotal} outreach action{urgentTotal === 1 ? '' : 's'} require attention today.
              </span>
            ) : (
              <span>Your outreach follow-up schedule is caught up. Ready to engage new partnership targets.</span>
            )}
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <DashboardClientActions isLeader={isLeader} />
        </div>
      </div>

      {/* Urgent Attention Alert Banner (Restrained & High Contrast) */}
      {overdueFollowups.total > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30">
              <AlertTriangle className="size-4" />
            </div>
            <div>
              <span className="font-semibold text-foreground">
                Urgent Cadence Action Required:
              </span>{' '}
              <span className="text-muted-foreground">
                {isOwner
                  ? `${overdueFollowups.total} follow-up task${overdueFollowups.total === 1 ? '' : 's'} are past due across team reps.`
                  : `You have ${overdueFollowups.total} overdue outreach follow-up${overdueFollowups.total === 1 ? '' : 's'} requiring contact.`}
              </span>
            </div>
          </div>

          <Link
            href="/followups?bucket=OVERDUE"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors self-start sm:self-auto"
          >
            <span>Resolve Overdue Queue</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>
      )}

      {/* Primary KPI Command Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link
          href="/followups?bucket=OVERDUE"
          className={cn(
            'group rounded-lg border p-4.5 transition-[border-color,background-color] duration-150 flex flex-col justify-between',
            overdueFollowups.total > 0
              ? 'border-rose-500/40 bg-rose-500/5 hover:border-rose-500/70 hover:bg-rose-500/10'
              : 'border-border bg-surface hover:border-border-strong hover:bg-surface-hover',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {isOwner ? 'Team Overdue' : 'Overdue'}
            </span>
            <div
              className={cn(
                'size-8 rounded-md flex items-center justify-center',
                overdueFollowups.total > 0
                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  : 'bg-surface-muted text-muted-foreground border border-border',
              )}
            >
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className={cn(
              "font-mono text-3xl font-bold tabular tracking-tight",
              overdueFollowups.total > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"
            )}>
              {overdueFollowups.total}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span>{isOwner ? 'Pending across team reps' : 'Immediate check-in required'}</span>
              <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </Link>

        <Link
          href="/followups?bucket=TODAY"
          className={cn(
            'group rounded-lg border p-4.5 transition-[border-color,background-color] duration-150 flex flex-col justify-between',
            dueTodayFollowups.total > 0
              ? 'border-amber-500/40 bg-amber-500/5 hover:border-amber-500/70 hover:bg-amber-500/10'
              : 'border-border bg-surface hover:border-border-strong hover:bg-surface-hover',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {isOwner ? 'Team Due Today' : 'Due Today'}
            </span>
            <div
              className={cn(
                'size-8 rounded-md flex items-center justify-center',
                dueTodayFollowups.total > 0
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'bg-surface-muted text-muted-foreground border border-border',
              )}
            >
              <Clock className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className={cn(
              "font-mono text-3xl font-bold tabular tracking-tight",
              dueTodayFollowups.total > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
            )}>
              {dueTodayFollowups.total}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span>{isOwner ? 'Scheduled team touchpoints' : 'Scheduled touchpoints'}</span>
              <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </Link>

        <Link
          href="/calendar"
          className="group rounded-lg border border-border bg-surface p-4.5 transition-[border-color,background-color] duration-150 hover:border-border-strong hover:bg-surface-hover flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {isOwner ? 'Team Meetings' : 'Meetings Today'}
            </span>
            <div className="size-8 rounded-md bg-surface-muted text-muted-foreground border border-border flex items-center justify-center">
              <Calendar className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-mono text-3xl font-bold tabular tracking-tight text-foreground">
              {todayMetrics.meetingsScheduled + todayMetrics.meetingsCompleted}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span>Discovery & partner sessions</span>
              <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </Link>

        <Link
          href="/pipeline"
          className="group rounded-lg border border-border bg-surface p-4.5 transition-[border-color,background-color] duration-150 hover:border-border-strong hover:bg-surface-hover flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {isOwner ? 'Active Pipeline Deals' : 'Warm Prospects'}
            </span>
            <div className="size-8 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Flame className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-mono text-3xl font-bold tabular tracking-tight text-emerald-600 dark:text-emerald-400">
              {hotLeads.items.length}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span>Interested & active deals</span>
              <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </Link>
      </div>

      {/* Horizontal Pipeline Funnel Track */}
      <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
        <div className="flex flex-row items-center justify-between pb-3 border-b border-border">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <div className="size-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <Target className="size-3.5" />
              </div>
              Partnership Pipeline Distribution
            </h2>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                Active distribution of accounts across outreach progression stages.
              </p>
              {coldCount > 0 && (
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-surface-muted text-muted-foreground border border-border">
                  Disqualified: {coldCount}
                </span>
              )}
            </div>
          </div>
          <Link
            href="/pipeline"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
          >
            Kanban Board <ArrowRight className="size-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Assigned */}
          <div className="rounded-md border border-border bg-surface-muted/40 p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase">
              <span>1. Assigned</span>
              <span className="tabular font-mono px-1.5 py-0.5 rounded bg-surface border border-border text-foreground font-semibold text-[11px]">{assignedCount}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: totalInPipeline > 0 && assignedCount > 0 ? `${Math.max(8, (assignedCount / totalInPipeline) * 100)}%` : '0%' }}
              />
            </div>
            <div className="text-[10.5px] text-muted-foreground">Allocated to rep</div>
          </div>

          {/* 2. Contacted */}
          <div className="rounded-md border border-border bg-surface-muted/40 p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase">
              <span>2. Contacted</span>
              <span className="tabular font-mono px-1.5 py-0.5 rounded bg-surface border border-border text-foreground font-semibold text-[11px]">{contactedCount}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: totalInPipeline > 0 && contactedCount > 0 ? `${Math.max(8, (contactedCount / totalInPipeline) * 100)}%` : '0%' }}
              />
            </div>
            <div className="text-[10.5px] text-muted-foreground">Outreach initiated</div>
          </div>

          {/* 3. Responded */}
          <div className="rounded-md border border-border bg-surface-muted/40 p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase">
              <span>3. Responded</span>
              <span className="tabular font-mono px-1.5 py-0.5 rounded bg-surface border border-border text-foreground font-semibold text-[11px]">{respondedCount}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                style={{ width: totalInPipeline > 0 && respondedCount > 0 ? `${Math.max(8, (respondedCount / totalInPipeline) * 100)}%` : '0%' }}
              />
            </div>
            <div className="text-[10.5px] text-muted-foreground">Contact engaged</div>
          </div>

          {/* 4. Meeting Scheduled */}
          <div className="rounded-md border border-border bg-surface-muted/40 p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase">
              <span>4. Meeting</span>
              <span className="tabular font-mono px-1.5 py-0.5 rounded bg-surface border border-border text-foreground font-semibold text-[11px]">{meetingCount}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-300"
                style={{ width: totalInPipeline > 0 && meetingCount > 0 ? `${Math.max(8, (meetingCount / totalInPipeline) * 100)}%` : '0%' }}
              />
            </div>
            <div className="text-[10.5px] text-muted-foreground">Pitch / Call booked</div>
          </div>

          {/* 5. Warm / Interested */}
          <div className="rounded-md border border-border bg-surface-muted/40 p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase">
              <span>5. Interested</span>
              <span className="tabular font-mono px-1.5 py-0.5 rounded bg-surface border border-border text-foreground font-semibold text-[11px]">{interestedCount}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: totalInPipeline > 0 && interestedCount > 0 ? `${Math.max(8, (interestedCount / totalInPipeline) * 100)}%` : '0%' }}
              />
            </div>
            <div className="text-[10.5px] text-muted-foreground">Warm momentum</div>
          </div>

          {/* 6. Partnership Signed */}
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
              <span>6. Signed</span>
              <span className="tabular font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">{partnershipCount}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-emerald-500/20 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: totalInPipeline > 0 && partnershipCount > 0 ? `${Math.max(8, (partnershipCount / totalInPipeline) * 100)}%` : '0%' }}
              />
            </div>
            <div className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-medium">Active Partners</div>
          </div>
        </div>
      </div>

      {/* Target Priority Spotlight Strip (Clean Precision, No Neon AI Slop) */}
      {!isOwner && todayPriorities.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="size-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span>Priority Outreach Targets</span>
                  <span className="text-[10px] font-mono font-medium uppercase px-2 py-0.5 rounded bg-surface-muted text-muted-foreground border border-border">
                    Top 5 Ranked
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Algorithmic ranking based on account qualification, stage momentum, and follow-up recency.
                </p>
              </div>
            </div>
            <Link
              href="/organisations"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 transition-colors"
            >
              All Organisations <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {todayPriorities.map((item) => (
              <Link
                key={item.orgId}
                href={`/organisations/${item.orgId}`}
                className="group rounded-md border border-border bg-surface-muted/40 p-3.5 space-y-2.5 hover:border-border-strong hover:bg-surface-hover transition-[border-color,background-color] duration-150"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-semibold text-muted-foreground tracking-wider uppercase">
                    #{item.rank}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border',
                      item.priority === 'HIGH'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        : item.priority === 'MEDIUM'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        : 'bg-surface text-muted-foreground border-border'
                    )}
                  >
                    {item.score}/100
                  </span>
                </div>

                {!item.isAssignedToCurrentUser && item.assignedToName ? (
                  <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium truncate bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    <span>{item.assignedToName}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    <span>Your Account</span>
                  </div>
                )}

                <div className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {item.orgName}
                </div>
                <div className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {item.reason}
                </div>
                <div className="pt-2 text-[10px] font-medium text-primary border-t border-border flex items-center justify-between">
                  <span className="truncate">{item.recommendedAction}</span>
                  <ArrowRight className="size-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Main Two-Column Operational Section: Outreach Feed vs Follow-up Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Activity Feed & Team Leaderboard */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="size-6 rounded-md bg-surface-muted text-muted-foreground border border-border flex items-center justify-center">
                    <Clock className="size-3.5" />
                  </div>
                  Recent Outreach Feed
                </CardTitle>
                <CardDescription className="text-xs">
                  Latest logged communications and interactions across channels.
                </CardDescription>
              </div>
              <Link
                href="/activities"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
              >
                All Activities ({recentActivities.total}) <ArrowRight className="size-3" />
              </Link>
            </CardHeader>
            <CardContent className="pt-4">
              {recentActivities.items.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground space-y-3">
                  <div className="size-10 mx-auto rounded-lg bg-surface-muted border border-border flex items-center justify-center text-muted-foreground">
                    <Building2 className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">No recent outreach activities logged</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Your partnership communication timeline will appear here.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentActivities.items.map((act: any) => {
                    const isCall = act.type === 'CALL'
                    const isEmail = act.type === 'EMAIL'
                    const isMeeting = act.type === 'MEETING'

                    return (
                      <div
                        key={act.id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-border bg-surface hover:border-border-strong hover:bg-surface-hover transition-[border-color,background-color] duration-120"
                      >
                        <div
                          className={cn(
                            'size-8 rounded-md flex items-center justify-center shrink-0 mt-0.5 border',
                            isCall
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                              : isEmail
                              ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                              : isMeeting
                              ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                          )}
                        >
                          {isCall ? (
                            <Phone className="size-3.5" />
                          ) : isEmail ? (
                            <Mail className="size-3.5" />
                          ) : isMeeting ? (
                            <Calendar className="size-3.5" />
                          ) : (
                            <Linkedin className="size-3.5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <Link
                              href={`/organisations/${act.organisation.id}`}
                              className="font-semibold text-xs text-foreground hover:text-primary transition-colors truncate"
                            >
                              {act.organisation.name}
                            </Link>
                            <span className="text-[10px] text-muted-foreground tabular font-mono whitespace-nowrap">
                              {formatDateTime(act.activityDate)}
                            </span>
                          </div>

                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {act.notes || `${act.type} logged with ${act.contact?.name || 'organisation contact'}.`}
                          </p>

                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="text-[10px] font-medium text-foreground/80">
                              By {act.performedBy.name}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <Badge tone="slate" size="sm">
                              {act.outcome}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Velocity Leaderboard (Owner & TL only) */}
          {isLeader && teamMetrics.length > 0 && (
            <Card>
              <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="size-6 rounded-md bg-surface-muted text-muted-foreground border border-border flex items-center justify-center">
                      <Award className="size-3.5" />
                    </div>
                    Today&apos;s Team Outreach Velocity
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Real-time aggregation across team members today.
                  </CardDescription>
                </div>
                <Link
                  href="/team"
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
                >
                  Manage Team <ArrowRight className="size-3" />
                </Link>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">
                        <th className="pb-2.5">Member</th>
                        <th className="pb-2.5 text-center">Orgs</th>
                        <th className="pb-2.5 text-center">Calls</th>
                        <th className="pb-2.5 text-center">Emails</th>
                        <th className="pb-2.5 text-center">Resp</th>
                        <th className="pb-2.5 text-center">Interested</th>
                        <th className="pb-2.5 text-center">Due Today</th>
                        <th className="pb-2.5 text-right">Overdue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 font-mono">
                      {teamMetrics.map((tm: any) => (
                        <tr key={tm.userId} className="hover:bg-surface-hover transition-colors">
                          <td className="py-2.5 flex items-center gap-2 font-sans font-medium text-foreground">
                            <Avatar name={tm.name} color={tm.avatarColor} size="xs" />
                            <div>
                              <div className="font-semibold">{tm.name}</div>
                              <div className="text-[10px] text-muted-foreground capitalize font-normal">{tm.role.toLowerCase()}</div>
                            </div>
                          </td>
                          <td className="py-2.5 text-center tabular text-foreground font-semibold">{tm.organisationsContacted}</td>
                          <td className="py-2.5 text-center tabular text-foreground">{tm.calls}</td>
                          <td className="py-2.5 text-center tabular text-foreground">{tm.emails}</td>
                          <td className="py-2.5 text-center tabular text-emerald-600 dark:text-emerald-400 font-semibold">{tm.responses}</td>
                          <td className="py-2.5 text-center tabular text-amber-600 dark:text-amber-400 font-semibold">{tm.interested}</td>
                          <td className="py-2.5 text-center tabular">
                            {tm.followUpsDueToday > 0 ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20 text-[11px]">
                                {tm.followUpsDueToday}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60 text-[11px]">0</span>
                            )}
                          </td>
                          <td className="py-2.5 text-right tabular">
                            {tm.followUpsOverdue > 0 ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold border border-rose-500/20 text-[11px]">
                                {tm.followUpsOverdue}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60 text-[11px]">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right 1 Col: Immediate Action Queue (Follow-ups Due + Overdue) */}
        <div className="space-y-6">
          {/* Overdue Alert Card */}
          {overdueFollowups.items.length > 0 && (
            <Card className="border-rose-500/30 bg-rose-500/5">
              <CardHeader className="pb-3 border-b border-rose-500/20 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-md bg-rose-500/20 text-rose-500 dark:text-rose-400 flex items-center justify-center">
                    <AlertTriangle className="size-3.5" />
                  </div>
                  <CardTitle className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                    {isOwner ? 'Team Overdue Queue' : 'Overdue Queue'} ({overdueFollowups.total})
                  </CardTitle>
                </div>
                <Link
                  href="/followups?bucket=OVERDUE"
                  className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                >
                  View All
                </Link>
              </CardHeader>
              <CardContent className="pt-3 space-y-2">
                {overdueFollowups.items.map((item: any) => (
                  <Link
                    key={item.id}
                    href={`/organisations/${item.organisation.id}`}
                    className="block rounded-md border border-rose-500/20 bg-surface p-3 transition-[border-color,background-color] hover:border-rose-500/50 hover:bg-surface-hover"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-xs text-foreground truncate">{item.organisation.name}</div>
                      <Badge tone="rose" size="sm">
                        Due {formatDate(item.dueDate)}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate mt-1">
                      {item.contact ? `${item.contact.name} • ` : ''}
                      {item.note || 'Overdue check-in action'}
                    </div>
                    {item.assignedTo && (
                      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border text-[10.5px]">
                        <span className="text-muted-foreground">Assignee:</span>
                        <Avatar name={item.assignedTo.name} color={item.assignedTo.avatarColor} size="xs" />
                        <span className="font-semibold text-foreground truncate">{item.assignedTo.name}</span>
                      </div>
                    )}
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Due Today Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Clock className="size-3.5" />
                </div>
                <CardTitle className="text-sm font-semibold">
                  {isOwner ? 'Team Due Today' : 'Due Today'} ({dueTodayFollowups.total})
                </CardTitle>
              </div>
              <Link
                href="/followups?bucket=TODAY"
                className="text-xs font-semibold text-primary hover:underline"
              >
                View All
              </Link>
            </CardHeader>
            <CardContent className="pt-3">
              {dueTodayFollowups.items.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                  <div className="size-9 mx-auto rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <CheckCircle2 className="size-4.5" />
                  </div>
                  <p className="font-semibold text-foreground">
                    {isOwner ? 'All team follow-ups caught up!' : 'You are all caught up!'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isOwner ? 'No pending follow-ups due across the team today.' : 'No pending follow-ups due today.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dueTodayFollowups.items.map((item: any) => (
                    <Link
                      key={item.id}
                      href={`/organisations/${item.organisation.id}`}
                      className="block rounded-md border border-border bg-surface p-3 transition-[border-color,background-color] hover:border-border-strong hover:bg-surface-hover"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-xs text-foreground truncate">{item.organisation.name}</div>
                        <Badge tone="amber" size="sm">
                          Today
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate mt-1">
                        {item.contact ? `${item.contact.name} • ` : ''}
                        {item.note || 'Scheduled outreach follow-up'}
                      </div>
                      {item.assignedTo && (
                        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border text-[10.5px]">
                          <span className="text-muted-foreground">Assignee:</span>
                          <Avatar name={item.assignedTo.name} color={item.assignedTo.avatarColor} size="xs" />
                          <span className="font-semibold text-foreground truncate">{item.assignedTo.name}</span>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Opportunities */}
          <Card>
            <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Flame className="size-3.5" />
                </div>
                <CardTitle className="text-sm font-semibold">Active Opportunities</CardTitle>
              </div>
              <Link
                href="/pipeline"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Pipeline
              </Link>
            </CardHeader>
            <CardContent className="pt-3">
              {hotLeads.items.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  <p>No warm leads yet.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {hotLeads.items.map((lead: any) => (
                    <Link
                      key={lead.id}
                      href={`/organisations/${lead.id}`}
                      className="flex items-center justify-between p-2.5 rounded-md border border-border bg-surface hover:border-border-strong hover:bg-surface-hover transition-[border-color,background-color]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs text-foreground truncate">{lead.name}</div>
                        <div className="text-[10px] text-muted-foreground capitalize">{lead.category || 'Clinical Partner'}</div>
                      </div>
                      <Badge
                        tone={lead.status === 'PARTNERSHIP' ? 'emerald' : lead.status === 'MEETING' ? 'violet' : 'amber'}
                        size="sm"
                      >
                        {lead.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
