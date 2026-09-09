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
      where: { deletedAt: null },
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

  const newCount = statusCounts['NEW'] ?? 0
  const inOutreachCount = (statusCounts['ASSIGNED'] ?? 0) + (statusCounts['CONTACTED'] ?? 0) + (statusCounts['RESPONDED'] ?? 0)
  const interestedCount = statusCounts['INTERESTED'] ?? 0
  const meetingCount = statusCounts['MEETING'] ?? 0
  const partnershipCount = statusCounts['PARTNERSHIP'] ?? 0
  const totalInPipeline = newCount + inOutreachCount + interestedCount + meetingCount + partnershipCount

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
            'group rounded-xl border p-4.5 transition-all duration-200 shadow-xs rim-highlight flex flex-col justify-between',
            overdueFollowups.total > 0
              ? 'border-rose-500/40 bg-gradient-to-b from-rose-500/15 via-card/80 to-card hover:border-rose-500/60 hover:shadow-[0_4px_25px_-5px_rgba(244,63,94,0.3)] hover:-translate-y-0.5'
              : 'border-border/80 bg-card/80 backdrop-blur-md hover:border-border-strong hover:-translate-y-0.5',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Overdue
            </span>
            <div
              className={cn(
                'size-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110',
                overdueFollowups.total > 0
                  ? 'bg-rose-500/20 text-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                  : 'bg-muted/80 text-muted-foreground',
              )}
            >
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className={cn(
              "font-display text-3xl sm:text-4xl font-bold tabular tracking-tight",
              overdueFollowups.total > 0 ? "text-rose-500" : "text-foreground"
            )}>
              {overdueFollowups.total}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 group-hover:text-primary transition-colors">
              <span>Immediate check-in required</span>
              <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </Link>

        <Link
          href="/followups?bucket=TODAY"
          className={cn(
            'group rounded-xl border p-4.5 transition-all duration-200 shadow-xs rim-highlight flex flex-col justify-between',
            dueTodayFollowups.total > 0
              ? 'border-amber-500/40 bg-gradient-to-b from-amber-500/15 via-card/80 to-card hover:border-amber-500/60 hover:shadow-[0_4px_25px_-5px_rgba(245,158,11,0.3)] hover:-translate-y-0.5'
              : 'border-border/80 bg-card/80 backdrop-blur-md hover:border-border-strong hover:-translate-y-0.5',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Due Today
            </span>
            <div
              className={cn(
                'size-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110',
                dueTodayFollowups.total > 0
                  ? 'bg-amber-500/20 text-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'bg-muted/80 text-muted-foreground',
              )}
            >
              <Clock className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className={cn(
              "font-display text-3xl sm:text-4xl font-bold tabular tracking-tight",
              dueTodayFollowups.total > 0 ? "text-amber-500" : "text-foreground"
            )}>
              {dueTodayFollowups.total}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 group-hover:text-primary transition-colors">
              <span>Scheduled touchpoints</span>
              <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </Link>

        <Link
          href="/calendar"
          className="group rounded-xl border border-border/80 bg-card/80 backdrop-blur-md p-4.5 transition-all duration-200 hover:border-violet-500/50 hover:shadow-[0_4px_25px_-5px_rgba(139,92,246,0.25)] hover:-translate-y-0.5 shadow-xs rim-highlight flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Meetings Today
            </span>
            <div className="size-8 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center transition-transform group-hover:scale-110 shadow-[0_0_12px_rgba(139,92,246,0.3)]">
              <Calendar className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-display text-3xl sm:text-4xl font-bold tabular tracking-tight text-foreground">
              {todayMetrics.meetingsScheduled + todayMetrics.meetingsCompleted}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 group-hover:text-primary transition-colors">
              <span>Discovery & partner sessions</span>
              <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </Link>

        <Link
          href="/pipeline"
          className="group rounded-xl border border-border/80 bg-card/80 backdrop-blur-md p-4.5 transition-all duration-200 hover:border-emerald-500/50 hover:shadow-[0_4px_25px_-5px_rgba(16,185,129,0.25)] hover:-translate-y-0.5 shadow-xs rim-highlight flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Warm Prospects
            </span>
            <div className="size-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center transition-transform group-hover:scale-110 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <Flame className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-display text-3xl sm:text-4xl font-bold tabular tracking-tight text-emerald-400">
              {hotLeads.items.length}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 group-hover:text-primary transition-colors">
              <span>Interested & active deals</span>
              <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </Link>
      </div>

      {/* Horizontal Pipeline Funnel Overview */}
      <Card variant="glass" className="shadow-xs rim-highlight overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <div className="size-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.4)]">
                <Target className="size-3.5" />
              </div>
              Partnership Pipeline Flow
            </CardTitle>
            <CardDescription className="text-xs">
              Live progression of accounts across outreach milestones.
            </CardDescription>
          </div>
          <Link
            href="/pipeline"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
          >
            Open Kanban Board <ArrowRight className="size-3" />
          </Link>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3.5">
            <div className="rounded-xl border border-border/80 bg-surface-muted/40 p-3.5 space-y-2 hover:border-slate-400/40 transition-colors">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                <span>1. Discovery</span>
                <span className="tabular font-mono px-1.5 py-0.5 rounded bg-surface border border-border/80 text-foreground">{newCount}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-border/60 overflow-hidden">
                <div
                  className="h-full bg-slate-400 rounded-full transition-all duration-500"
                  style={{ width: totalInPipeline > 0 && newCount > 0 ? `${Math.max(8, (newCount / totalInPipeline) * 100)}%` : '0%' }}
                />
              </div>
              <div className="text-[10.5px] text-muted-foreground font-medium">Identified targets</div>
            </div>

            <div className="rounded-xl border border-border/80 bg-surface-muted/40 p-3.5 space-y-2 hover:border-blue-500/40 transition-colors">
              <div className="flex items-center justify-between text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase">
                <span>2. In Outreach</span>
                <span className="tabular font-mono px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400">{inOutreachCount}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-border/60 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                  style={{ width: totalInPipeline > 0 && inOutreachCount > 0 ? `${Math.max(8, (inOutreachCount / totalInPipeline) * 100)}%` : '0%' }}
                />
              </div>
              <div className="text-[10.5px] text-muted-foreground font-medium">Calling & pitching</div>
            </div>

            <div className="rounded-xl border border-border/80 bg-surface-muted/40 p-3.5 space-y-2 hover:border-amber-500/40 transition-colors">
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                <span>3. Interested</span>
                <span className="tabular font-mono px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">{interestedCount}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-border/60 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                  style={{ width: totalInPipeline > 0 && interestedCount > 0 ? `${Math.max(8, (interestedCount / totalInPipeline) * 100)}%` : '0%' }}
                />
              </div>
              <div className="text-[10.5px] text-muted-foreground font-medium">Qualified momentum</div>
            </div>

            <div className="rounded-xl border border-border/80 bg-surface-muted/40 p-3.5 space-y-2 hover:border-violet-500/40 transition-colors">
              <div className="flex items-center justify-between text-[11px] font-bold text-violet-700 dark:text-violet-400 uppercase">
                <span>4. Meeting</span>
                <span className="tabular font-mono px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-700 dark:text-violet-400">{meetingCount}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-border/60 overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                  style={{ width: totalInPipeline > 0 && meetingCount > 0 ? `${Math.max(8, (meetingCount / totalInPipeline) * 100)}%` : '0%' }}
                />
              </div>
              <div className="text-[10.5px] text-muted-foreground font-medium">Clinical pitch done</div>
            </div>

            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 space-y-2 col-span-2 sm:col-span-1 shadow-[0_0_15px_-4px_rgba(16,185,129,0.25)]">
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                <span>5. Partnership</span>
                <span className="tabular font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-bold">{partnershipCount}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-emerald-500/20 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                  style={{ width: totalInPipeline > 0 && partnershipCount > 0 ? `${Math.max(8, (partnershipCount / totalInPipeline) * 100)}%` : '0%' }}
                />
              </div>
              <div className="text-[10.5px] text-emerald-700 dark:text-emerald-300 font-medium">Active Agreements</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Who Should I Contact Today? Priority Recommendation Strip */}
      {todayPriorities.length > 0 && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary-soft/20 via-card to-card shadow-xs">
          <CardHeader className="pb-3 border-b border-primary/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                  <Sparkles className="size-4.5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    Who Should I Contact Today?
                    <Badge tone="blue" size="sm">
                      Top 5 Priorities
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Deterministic ranking based on deal momentum, lead qualification, and overdue follow-ups.
                  </CardDescription>
                </div>
              </div>
              <Link
                href="/organisations"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                View All Organisations <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {todayPriorities.map((item) => (
                <Link
                  key={item.orgId}
                  href={`/organisations/${item.orgId}`}
                  className="group relative rounded-xl border border-border bg-card p-3.5 space-y-2 hover:border-primary/50 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-primary tracking-wider uppercase">
                      #{item.rank} Target
                    </span>
                    <Badge
                      tone={item.priority === 'HIGH' ? 'rose' : item.priority === 'MEDIUM' ? 'amber' : 'slate'}
                      size="sm"
                    >
                      {item.score}/100
                    </Badge>
                  </div>

                  {!item.isAssignedToCurrentUser && item.assignedToName ? (
                    <div className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-300 font-semibold truncate bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      <span>⚠️ Assigned to {item.assignedToName}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold truncate bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      <span>Your Account</span>
                    </div>
                  )}

                  <div className="font-bold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {item.orgName}
                  </div>
                  <div className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    👉 {item.reason}
                  </div>
                  <div className="pt-1.5 text-[10px] font-semibold text-primary border-t border-border/60 flex items-center justify-between">
                    <span className="truncate">{item.recommendedAction}</span>
                    <ArrowRight className="size-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
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
