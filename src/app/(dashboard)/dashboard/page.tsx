import * as React from 'react'
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
import { MetricCard } from '@/components/ui/metric-card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { DashboardClientActions } from './dashboard-actions'
import { cn } from '@/lib/utils'

export default async function DashboardPage() {
  const user = await requireUser()
  const today = todayKey()

  const isLeader = user.role === 'OWNER' || user.role === 'TL'

  // Fetch all primary dashboard metrics and pipeline distribution in parallel
  const [
    todayMetrics,
    teamMetrics,
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
    recommendTodayPriorities(user),
    prisma.organisation.groupBy({
      by: ['status'],
      _count: { id: true },
      where: {
        deletedAt: null,
        ...organisationScope(user),
      },
    }),
  ])

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
    <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Top Mission Control Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {greeting}, {user.name}
            </h1>
            <Badge tone="indigo" size="sm" dot>
              Live Mission Control
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {urgentTotal > 0 ? (
              <span className="text-amber-700 dark:text-amber-300 font-medium">
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

      {/* Action Attention Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link
          href="/followups?bucket=OVERDUE"
          className={cn(
            'group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 shadow-lg rim-highlight flex flex-col justify-between',
            overdueFollowups.total > 0
              ? 'border-rose-500/50 bg-gradient-to-br from-rose-500/20 via-surface/90 to-surface hover:border-rose-500/80 hover:shadow-[0_8px_30px_-5px_rgba(244,63,94,0.35)] hover:-translate-y-1'
              : 'border-border/80 bg-surface/80 backdrop-blur-xl hover:border-border-strong hover:-translate-y-0.5',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Overdue
            </span>
            <div
              className={cn(
                'size-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110',
                overdueFollowups.total > 0
                  ? 'bg-rose-500/25 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.45)] border border-rose-500/40'
                  : 'bg-surface-muted/80 text-muted-foreground border border-border/60',
              )}
            >
              <AlertTriangle className="size-4.5" />
            </div>
          </div>
          <div className="mt-5">
            <div className={cn(
              "font-display text-3xl sm:text-4xl font-bold tabular tracking-tight",
              overdueFollowups.total > 0 ? "text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.3)]" : "text-foreground"
            )}>
              {overdueFollowups.total}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1 group-hover:text-rose-400 transition-colors">
              <span>Immediate check-in required</span>
              <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </Link>

        <Link
          href="/followups?bucket=TODAY"
          className={cn(
            'group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 shadow-lg rim-highlight flex flex-col justify-between',
            dueTodayFollowups.total > 0
              ? 'border-amber-500/50 bg-gradient-to-br from-amber-500/20 via-surface/90 to-surface hover:border-amber-500/80 hover:shadow-[0_8px_30px_-5px_rgba(245,158,11,0.35)] hover:-translate-y-1'
              : 'border-border/80 bg-surface/80 backdrop-blur-xl hover:border-border-strong hover:-translate-y-0.5',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Due Today
            </span>
            <div
              className={cn(
                'size-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110',
                dueTodayFollowups.total > 0
                  ? 'bg-amber-500/25 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.45)] border border-amber-500/40'
                  : 'bg-surface-muted/80 text-muted-foreground border border-border/60',
              )}
            >
              <Clock className="size-4.5" />
            </div>
          </div>
          <div className="mt-5">
            <div className={cn(
              "font-display text-3xl sm:text-4xl font-bold tabular tracking-tight",
              dueTodayFollowups.total > 0 ? "text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.3)]" : "text-foreground"
            )}>
              {dueTodayFollowups.total}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1 group-hover:text-amber-400 transition-colors">
              <span>Scheduled touchpoints</span>
              <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </Link>

        <Link
          href="/calendar"
          className="group relative overflow-hidden rounded-2xl border border-border/80 bg-surface/80 backdrop-blur-xl p-5 transition-all duration-300 hover:border-violet-500/60 hover:shadow-[0_8px_30px_-5px_rgba(139,92,246,0.35)] hover:-translate-y-1 shadow-lg rim-highlight flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Meetings Today
            </span>
            <div className="size-9 rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/40 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-[0_0_15px_rgba(139,92,246,0.4)]">
              <Calendar className="size-4.5" />
            </div>
          </div>
          <div className="mt-5">
            <div className="font-display text-3xl sm:text-4xl font-bold tabular tracking-tight text-foreground group-hover:text-violet-400 transition-colors">
              {todayMetrics.meetingsScheduled + todayMetrics.meetingsCompleted}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1 group-hover:text-violet-400 transition-colors">
              <span>Discovery & partner sessions</span>
              <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </Link>

        <Link
          href="/pipeline"
          className="group relative overflow-hidden rounded-2xl border border-border/80 bg-surface/80 backdrop-blur-xl p-5 transition-all duration-300 hover:border-emerald-500/60 hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.35)] hover:-translate-y-1 shadow-lg rim-highlight flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Warm Prospects
            </span>
            <div className="size-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              <Flame className="size-4.5" />
            </div>
          </div>
          <div className="mt-5">
            <div className="font-display text-3xl sm:text-4xl font-bold tabular tracking-tight text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              {hotLeads.items.length}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1 group-hover:text-emerald-400 transition-colors">
              <span>Interested & active deals</span>
              <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </Link>
      </div>

      {/* Horizontal Pipeline Funnel Overview */}
      <div className="bento-box rounded-2xl border border-border bg-surface/90 backdrop-blur-xl p-6 shadow-sm dark:shadow-xl rim-highlight space-y-4">
        <div className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <div className="size-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center shadow-xs">
                <Target className="size-3.5" />
              </div>
              Partnership Pipeline Flow
            </h2>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                Live progression of accounts across outreach milestones.
              </p>
              {coldCount > 0 && (
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-surface-muted text-muted-foreground border border-border">
                  Disqualified / Cold: {coldCount}
                </span>
              )}
            </div>
          </div>
          <Link
            href="/pipeline"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/25 hover:bg-primary/20 transition-all"
          >
            Open Kanban Board <ArrowRight className="size-3" />
          </Link>
        </div>
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Assigned */}
            <div className="rounded-xl border border-blue-200 dark:border-border/80 bg-blue-50/70 dark:bg-surface-muted/50 p-3.5 space-y-2.5 hover:border-blue-400 transition-all">
              <div className="flex items-center justify-between text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase">
                <span>1. Assigned</span>
                <span className="tabular font-mono px-2 py-0.5 rounded bg-blue-100/80 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400 font-bold">{assignedCount}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-blue-200/60 dark:bg-border/60 overflow-hidden">
                <div
                  className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]"
                  style={{ width: totalInPipeline > 0 && assignedCount > 0 ? `${Math.max(8, (assignedCount / totalInPipeline) * 100)}%` : '0%' }}
                />
              </div>
              <div className="text-[10.5px] text-muted-foreground font-medium">Allocated to rep</div>
            </div>

            {/* 2. Contacted */}
            <div className="rounded-xl border border-indigo-200 dark:border-border/80 bg-indigo-50/70 dark:bg-surface-muted/50 p-3.5 space-y-2.5 hover:border-indigo-400 transition-all">
              <div className="flex items-center justify-between text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase">
                <span>2. Contacted</span>
                <span className="tabular font-mono px-2 py-0.5 rounded bg-indigo-100/80 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400 font-bold">{contactedCount}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-indigo-200/60 dark:bg-border/60 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(99,102,241,0.6)]"
                  style={{ width: totalInPipeline > 0 && contactedCount > 0 ? `${Math.max(8, (contactedCount / totalInPipeline) * 100)}%` : '0%' }}
                />
              </div>
              <div className="text-[10.5px] text-muted-foreground font-medium">Outreach initiated</div>
            </div>

            {/* 3. Responded */}
            <div className="rounded-xl border border-cyan-200 dark:border-border/80 bg-cyan-50/70 dark:bg-surface-muted/50 p-3.5 space-y-2.5 hover:border-cyan-400 transition-all">
              <div className="flex items-center justify-between text-[11px] font-bold text-cyan-800 dark:text-cyan-400 uppercase">
                <span>3. Responded</span>
                <span className="tabular font-mono px-2 py-0.5 rounded bg-cyan-100/80 dark:bg-cyan-500/15 border border-cyan-200 dark:border-cyan-500/30 text-cyan-800 dark:text-cyan-400 font-bold">{respondedCount}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-cyan-200/60 dark:bg-border/60 overflow-hidden">
                <div
                  className="h-full bg-cyan-600 dark:bg-cyan-500 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]"
                  style={{ width: totalInPipeline > 0 && respondedCount > 0 ? `${Math.max(8, (respondedCount / totalInPipeline) * 100)}%` : '0%' }}
                />
              </div>
              <div className="text-[10.5px] text-muted-foreground font-medium">Contact engaged</div>
            </div>

            {/* 4. Meeting Scheduled */}
            <div className="rounded-xl border border-violet-200 dark:border-border/80 bg-violet-50/70 dark:bg-surface-muted/50 p-3.5 space-y-2.5 hover:border-violet-400 transition-all">
              <div className="flex items-center justify-between text-[11px] font-bold text-violet-800 dark:text-violet-400 uppercase">
                <span>4. Meeting</span>
                <span className="tabular font-mono px-2 py-0.5 rounded bg-violet-100/80 dark:bg-violet-500/15 border border-violet-200 dark:border-violet-500/30 text-violet-800 dark:text-violet-400 font-bold">{meetingCount}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-violet-200/60 dark:bg-border/60 overflow-hidden">
                <div
                  className="h-full bg-violet-600 dark:bg-violet-500 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(139,92,246,0.6)]"
                  style={{ width: totalInPipeline > 0 && meetingCount > 0 ? `${Math.max(8, (meetingCount / totalInPipeline) * 100)}%` : '0%' }}
                />
              </div>
              <div className="text-[10.5px] text-muted-foreground font-medium">Call / Pitch booked</div>
            </div>

            {/* 5. Warm / Interested */}
            <div className="rounded-xl border border-amber-200 dark:border-border/80 bg-amber-50/70 dark:bg-surface-muted/50 p-3.5 space-y-2.5 hover:border-amber-400 transition-all">
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase">
                <span>5. Interested</span>
                <span className="tabular font-mono px-2 py-0.5 rounded bg-amber-100/80 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-400 font-bold">{interestedCount}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-amber-200/60 dark:bg-border/60 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]"
                  style={{ width: totalInPipeline > 0 && interestedCount > 0 ? `${Math.max(8, (interestedCount / totalInPipeline) * 100)}%` : '0%' }}
                />
              </div>
              <div className="text-[10.5px] text-muted-foreground font-medium">Warm momentum</div>
            </div>

            {/* 6. Partnership Signed */}
            <div className="rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/80 dark:bg-emerald-500/10 p-3.5 space-y-2.5 shadow-[0_0_20px_-3px_rgba(16,185,129,0.2)]">
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase">
                <span>6. Partnership</span>
                <span className="tabular font-mono px-2 py-0.5 rounded bg-emerald-100/90 dark:bg-emerald-500/25 border border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-300 font-bold">{partnershipCount}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-emerald-200/60 dark:bg-emerald-500/20 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                  style={{ width: totalInPipeline > 0 && partnershipCount > 0 ? `${Math.max(8, (partnershipCount / totalInPipeline) * 100)}%` : '0%' }}
                />
              </div>
              <div className="text-[10.5px] text-emerald-800 dark:text-emerald-400 font-semibold">Active Agreements</div>
            </div>
          </div>
        </div>
      </div>

      {/* Who Should I Contact Today? AI Priority Recommendation Strip */}
      {todayPriorities.length > 0 && (
        <div className="ai-intel-glow rounded-2xl border border-cyan-400/40 dark:border-cyan-500/40 bg-gradient-to-br from-cyan-50/80 via-surface to-surface dark:from-cyan-950/30 dark:via-surface/90 dark:to-surface/95 backdrop-blur-xl p-6 shadow-sm dark:shadow-2xl space-y-4 rim-highlight">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-cyan-500/20">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-400/30 dark:border-cyan-500/40 shadow-xs">
                <Sparkles className="size-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span>Who Should I Contact Today?</span>
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30">
                    AI Deterministic Top 5
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Algorithmic ranking weighted by deal momentum, clinical qualification score, and urgency.
                </p>
              </div>
            </div>
            <Link
              href="/organisations"
              className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 hover:underline flex items-center gap-1.5 transition-colors"
            >
              View All Organisations <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {todayPriorities.map((item) => (
              <Link
                key={item.orgId}
                href={`/organisations/${item.orgId}`}
                className="group relative rounded-xl border border-border/80 bg-surface/90 backdrop-blur-md p-4 space-y-2.5 hover:border-cyan-500/60 hover:shadow-md hover:-translate-y-1 transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold font-mono text-cyan-700 dark:text-cyan-400 tracking-wider uppercase">
                    #{item.rank} Target
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border',
                      item.priority === 'HIGH'
                        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-500/30'
                        : item.priority === 'MEDIUM'
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30'
                        : 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-500/30'
                    )}
                  >
                    {item.score}/100
                  </span>
                </div>

                {!item.isAssignedToCurrentUser && item.assignedToName ? (
                  <div className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-300 font-semibold truncate bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    <span>⚠️ {item.assignedToName}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold truncate bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                    <span>Your Account</span>
                  </div>
                )}

                <div className="font-bold text-xs text-foreground group-hover:text-cyan-700 dark:group-hover:text-cyan-400 transition-colors line-clamp-1">
                  {item.orgName}
                </div>
                <div className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {item.reason}
                </div>
                <div className="pt-2 text-[10px] font-semibold text-cyan-700 dark:text-cyan-400 border-t border-border/60 flex items-center justify-between">
                  <span className="truncate">{item.recommendedAction}</span>
                  <ArrowRight className="size-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Main Two-Column Layout: Outreach Activity Timeline vs Immediate Action Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Activity Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <Card variant="glass" className="shadow-xs rim-highlight">
            <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <div className="size-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center shadow-[0_0_8px_rgba(99,102,241,0.3)]">
                    <Clock className="size-3.5" />
                  </div>
                  Recent Outreach Feed
                </CardTitle>
                <CardDescription className="text-xs">
                  Latest logged communications and channel interactions.
                </CardDescription>
              </div>
              <Link
                href="/activities"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
              >
                All Activities ({recentActivities.total}) <ArrowRight className="size-3" />
              </Link>
            </CardHeader>
            <CardContent className="pt-4">
              {recentActivities.items.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground space-y-3">
                  <div className="size-12 mx-auto rounded-2xl bg-surface-muted/80 border border-border/80 flex items-center justify-center text-muted-foreground shadow-xs">
                    <Building2 className="size-6 text-primary/60" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">No recent outreach activities logged</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Your partnership communication timeline will appear here.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivities.items.map((act: any) => {
                    const isCall = act.type === 'CALL'
                    const isEmail = act.type === 'EMAIL'
                    const isMeeting = act.type === 'MEETING'

                    return (
                      <div
                        key={act.id}
                        className="flex items-start gap-3 p-3.5 rounded-xl border border-border/80 bg-surface/80 hover:border-primary/40 hover:bg-surface transition-all duration-150 shadow-2xs"
                      >
                        <div
                          className={cn(
                            'size-8.5 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs',
                            isCall
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              : isEmail
                              ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                              : isMeeting
                              ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
                          )}
                        >
                          {isCall ? (
                            <Phone className="size-4" />
                          ) : isEmail ? (
                            <Mail className="size-4" />
                          ) : isMeeting ? (
                            <Calendar className="size-4" />
                          ) : (
                            <Linkedin className="size-4" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <Link
                              href={`/organisations/${act.organisation.id}`}
                              className="font-bold text-xs text-foreground hover:text-primary transition-colors truncate"
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

          {/* Team Leaderboard (Owner & TL only) */}
          {isLeader && teamMetrics.length > 0 && (
            <Card variant="glass" className="shadow-xs rim-highlight">
              <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <div className="size-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center shadow-[0_0_8px_rgba(99,102,241,0.3)]">
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
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
                >
                  Manage Team <ArrowRight className="size-3" />
                </Link>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/60 text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="pb-2.5 font-bold">Member</th>
                        <th className="pb-2.5 text-center font-bold">Orgs</th>
                        <th className="pb-2.5 text-center font-bold">Calls</th>
                        <th className="pb-2.5 text-center font-bold">Emails</th>
                        <th className="pb-2.5 text-center font-bold">Resp</th>
                        <th className="pb-2.5 text-right font-bold">Interested</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-mono">
                      {teamMetrics.map((tm: any) => (
                        <tr key={tm.userId} className="hover:bg-muted/40 transition-colors">
                          <td className="py-2.5 flex items-center gap-2 font-sans font-semibold text-foreground">
                            <Avatar name={tm.name} color={tm.avatarColor} size="xs" />
                            <div>
                              <div>{tm.name}</div>
                              <div className="text-[10px] text-muted-foreground capitalize font-normal">{tm.role.toLowerCase()}</div>
                            </div>
                          </td>
                          <td className="py-2.5 text-center tabular text-foreground font-semibold">{tm.organisationsContacted}</td>
                          <td className="py-2.5 text-center tabular text-foreground">{tm.calls}</td>
                          <td className="py-2.5 text-center tabular text-foreground">{tm.emails}</td>
                          <td className="py-2.5 text-center tabular text-emerald-400 font-semibold">{tm.responses}</td>
                          <td className="py-2.5 text-right tabular text-amber-400 font-bold">{tm.interested}</td>
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
            <Card className="border-rose-500/40 bg-gradient-to-b from-rose-500/15 to-card/90 shadow-xs rim-highlight">
              <CardHeader className="pb-3 border-b border-rose-500/25 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shadow-[0_0_8px_rgba(244,63,94,0.3)]">
                    <AlertTriangle className="size-3.5" />
                  </div>
                  <CardTitle className="text-sm font-bold text-rose-400">
                    Overdue Queue ({overdueFollowups.total})
                  </CardTitle>
                </div>
                <Link
                  href="/followups?bucket=OVERDUE"
                  className="text-xs font-semibold text-rose-400 hover:underline"
                >
                  View All
                </Link>
              </CardHeader>
              <CardContent className="pt-3 space-y-2.5">
                {overdueFollowups.items.map((item: any) => (
                  <Link
                    key={item.id}
                    href={`/organisations/${item.organisation.id}`}
                    className="block rounded-xl border border-rose-500/30 bg-card/80 p-3 transition-colors hover:border-rose-500/60 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-xs text-foreground truncate">{item.organisation.name}</div>
                      <Badge tone="rose" size="sm">
                        Due {formatDate(item.dueDate)}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate mt-1">
                      {item.contact ? `${item.contact.name} • ` : ''}
                      {item.note || 'Overdue check-in action'}
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Due Today Card */}
          <Card variant="glass" className="shadow-xs rim-highlight">
            <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                  <Clock className="size-3.5" />
                </div>
                <CardTitle className="text-sm font-bold">Due Today ({dueTodayFollowups.total})</CardTitle>
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
                  <div className="size-10 mx-auto rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                    <CheckCircle2 className="size-5" />
                  </div>
                  <p className="font-bold text-foreground">You are all caught up!</p>
                  <p className="text-[11px] text-muted-foreground">No pending follow-ups due today.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {dueTodayFollowups.items.map((item: any) => (
                    <Link
                      key={item.id}
                      href={`/organisations/${item.organisation.id}`}
                      className="block rounded-xl border border-border/80 bg-surface/80 p-3 transition-colors hover:border-primary/40 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-xs text-foreground truncate">{item.organisation.name}</div>
                        <Badge tone="amber" size="sm">
                          Today
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate mt-1">
                        {item.contact ? `${item.contact.name} • ` : ''}
                        {item.note || 'Scheduled outreach follow-up'}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Opportunities */}
          <Card variant="glass" className="shadow-xs rim-highlight">
            <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                  <Flame className="size-3.5" />
                </div>
                <CardTitle className="text-sm font-bold">Active Opportunities</CardTitle>
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
                <div className="space-y-2">
                  {hotLeads.items.map((lead: any) => (
                    <Link
                      key={lead.id}
                      href={`/organisations/${lead.id}`}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 hover:border-primary/30 transition-colors"
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
