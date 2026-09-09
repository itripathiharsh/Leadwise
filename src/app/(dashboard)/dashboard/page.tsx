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
} from 'lucide-react'
import { requireUser } from '@/lib/auth/current-user'
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

export default async function DashboardPage() {
  const user = await requireUser()
  const today = todayKey()

  const isLeader = user.role === 'OWNER' || user.role === 'TL'

  // Fetch all primary dashboard metrics in parallel
  const [
    todayMetrics,
    teamMetrics,
    dueTodayFollowups,
    overdueFollowups,
    recentActivities,
    hotLeads,
    todayPriorities,
  ] = await Promise.all([
    getDayMetrics(today, user),
    isLeader ? getUserDayMetrics(today, user) : Promise.resolve([]),
    listFollowUps(user, { bucket: 'TODAY', pageSize: 6 }),
    listFollowUps(user, { bucket: 'OVERDUE', pageSize: 6 }),
    listActivities(user, { pageSize: 7 }),
    listOrganisations(user, { status: ['INTERESTED', 'MEETING', 'PARTNERSHIP'], pageSize: 5 }),
    recommendTodayPriorities(user),
  ])

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Outreach Overview
            </h1>
            <Badge tone="blue" size="sm">
              Today · {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isLeader
              ? `Real-time team performance & daily outreach aggregation for Leadwise.`
              : `Your assigned outreach pipeline, active follow-ups, and today's logged interactions.`}
          </p>
        </div>

        {/* Client triggers for quick actions and EOD */}
        <DashboardClientActions isLeader={isLeader} />
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <MetricCard
          label="Organisations"
          value={todayMetrics.organisationsContacted}
          tone="indigo"
        />
        <MetricCard
          label="Calls"
          value={todayMetrics.calls}
          tone="blue"
        />
        <MetricCard
          label="Emails"
          value={todayMetrics.emails}
          tone="indigo"
        />
        <MetricCard
          label="LinkedIn"
          value={todayMetrics.linkedin}
          tone="sky"
        />
        <MetricCard
          label="Responses"
          value={todayMetrics.responses}
          tone="teal"
        />
        <MetricCard
          label="Interested"
          value={todayMetrics.interested}
          tone="amber"
        />
        <MetricCard
          label="Meetings"
          value={todayMetrics.meetingsScheduled + todayMetrics.meetingsCompleted}
          tone="violet"
        />
        <MetricCard
          label="Follow-ups Due"
          value={todayMetrics.followUpsPending}
          tone="rose"
        />
      </div>

      {/* AI Intelligence: Who Should I Contact Today? */}
      {todayPriorities.length > 0 && (
        <Card className="border-primary/30 bg-primary-soft/10 shadow-xs">
          <CardHeader className="pb-3 border-b border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    Who Should I Contact Today?
                    <Badge tone="blue" size="sm">
                      Top 5 Priorities
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Deterministic ranking based on qualification score, overdue follow-ups, and engagement momentum.
                  </CardDescription>
                </div>
              </div>
              <Link
                href="/analytics/advanced"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Advanced Funnel &amp; AI Analytics <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {todayPriorities.map((item) => (
                <Link
                  key={item.orgId}
                  href={`/organisations/${item.orgId}`}
                  className="rounded-xl border border-border bg-surface p-3 space-y-2 hover:border-primary transition-all shadow-xs group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-primary">#{item.rank} TARGET</span>
                    <Badge
                      tone={item.priority === 'HIGH' ? 'rose' : item.priority === 'MEDIUM' ? 'amber' : 'slate'}
                      size="sm"
                    >
                      {item.score}/100
                    </Badge>
                  </div>

                  {!item.isAssignedToCurrentUser && item.assignedToName ? (
                    <div className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-300 font-semibold truncate bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      <span>⚠️ Assigned to {item.assignedToName}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate">
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
                  <div className="pt-1 text-[10px] font-semibold text-primary/90 border-t border-border/50 line-clamp-1">
                    {item.recommendedAction}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Middle Section: Team Breakdown (Owner/TL) OR My Pipeline (Intern) */}
      {isLeader && teamMetrics.length > 0 && (
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="size-4 text-primary" />
                <CardTitle className="text-base">Today&apos;s Team Performance</CardTitle>
              </div>
              <Link
                href="/team"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                View Full Team Analytics <ArrowRight className="size-3" />
              </Link>
            </div>
            <CardDescription>
              Outreach activity breakdown logged across all team members today.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-2.5 px-3">Team Member</th>
                    <th className="py-2.5 px-3 text-right">Orgs</th>
                    <th className="py-2.5 px-3 text-right">Calls</th>
                    <th className="py-2.5 px-3 text-right">Emails</th>
                    <th className="py-2.5 px-3 text-right">LinkedIn</th>
                    <th className="py-2.5 px-3 text-right">Responses</th>
                    <th className="py-2.5 px-3 text-right">Interested</th>
                    <th className="py-2.5 px-3 text-right">Meetings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {teamMetrics.map((tm: any) => (
                    <tr key={tm.userId} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={tm.name} color={tm.avatarColor} size="sm" />
                          <div>
                            <div className="font-semibold text-xs text-foreground">{tm.name}</div>
                            <div className="text-[10px] text-muted-foreground capitalize">
                              {tm.role.toLowerCase()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-xs">
                        {tm.organisationsContacted}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs">{tm.calls}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs">{tm.emails}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs">{tm.linkedin}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs font-semibold text-teal-600 dark:text-teal-400">
                        {tm.responses}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {tm.interested}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs font-semibold text-violet-600 dark:text-violet-400">
                        {tm.meetingsScheduled + tm.meetingsCompleted}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two Column Layout: Follow-ups + Hot Leads & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Follow-ups Due Today & Overdue */}
        <div className="space-y-6">
          {/* Overdue Card */}
          {overdueFollowups.items.length > 0 && (
            <Card className="border-rose-500/30 bg-rose-500/5 shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-rose-600 dark:text-rose-400" />
                    <CardTitle className="text-base text-rose-700 dark:text-rose-300">
                      Overdue Follow-ups ({overdueFollowups.total})
                    </CardTitle>
                  </div>
                  <Link
                    href="/followups?bucket=OVERDUE"
                    className="text-xs font-semibold text-rose-600 hover:underline"
                  >
                    View All
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {overdueFollowups.items.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/80 bg-surface p-3 transition-colors hover:border-rose-500/40"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/organisations/${item.organisation.id}`}
                        className="font-semibold text-xs text-foreground hover:text-primary truncate block"
                      >
                        {item.organisation.name}
                      </Link>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {item.contact ? `${item.contact.name} • ` : ''}
                        {item.note || 'Overdue action required'}
                      </div>
                    </div>
                    <Badge tone="rose" size="sm">
                      Due {formatDate(item.dueDate)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Due Today Card */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-amber-500" />
                  <CardTitle className="text-base">Follow-ups Due Today</CardTitle>
                </div>
                <Link
                  href="/followups?bucket=TODAY"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  View All ({dueTodayFollowups.total})
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {dueTodayFollowups.items.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="size-8 mx-auto text-emerald-500/60 mb-2" />
                  <p className="font-semibold text-foreground">No follow-ups due today</p>
                  <p className="mt-0.5">You are all caught up for today.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dueTodayFollowups.items.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-primary/40"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/organisations/${item.organisation.id}`}
                          className="font-semibold text-xs text-foreground hover:text-primary truncate block"
                        >
                          {item.organisation.name}
                        </Link>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {item.contact ? `${item.contact.name} • ` : ''}
                          {item.note || 'Scheduled follow-up'}
                        </div>
                      </div>
                      <Badge tone="amber" size="sm">
                        Today
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Recent Activity Feed & Hot Leads */}
        <div className="space-y-6">
          {/* Hot Leads / Pipeline Highlights */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="size-4 text-amber-500" />
                  <CardTitle className="text-base">Hot Leads & Key Progress</CardTitle>
                </div>
                <Link
                  href="/organisations?status=INTERESTED,MEETING,PARTNERSHIP"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  View Pipeline
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {hotLeads.items.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No active hot leads yet. Log outreach outcomes to advance organisations.
                </div>
              ) : (
                <div className="space-y-2">
                  {hotLeads.items.map((org: any) => (
                    <div
                      key={org.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-primary/40"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/organisations/${org.id}`}
                          className="font-semibold text-xs text-foreground hover:text-primary truncate block"
                        >
                          {org.name}
                        </Link>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {org.category || org.location || 'Organisation'} · {org._count.contacts} contact(s)
                        </div>
                      </div>
                      <Badge
                        tone={
                          org.status === 'PARTNERSHIP'
                            ? 'emerald'
                            : org.status === 'MEETING'
                              ? 'violet'
                              : 'amber'
                        }
                        size="sm"
                      >
                        {org.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity Timeline Stream */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <CardTitle className="text-base">Recent Outreach Stream</CardTitle>
                </div>
                <Link
                  href="/activities"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Full Activity Log
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentActivities.items.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No activities logged yet. Click &ldquo;Log Activity&rdquo; to record your first interaction.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {recentActivities.items.map((act: any) => (
                    <div key={act.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-3">
                      <Avatar
                        name={act.performedBy.name}
                        color={act.performedBy.avatarColor}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {act.performedBy.name} · <span className="font-normal text-muted-foreground">{act.type}</span>
                          </span>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatDateTime(act.activityDate)}
                          </span>
                        </div>
                        <Link
                          href={`/organisations/${act.organisation.id}`}
                          className="text-xs text-primary hover:underline font-medium block truncate"
                        >
                          {act.organisation.name}
                        </Link>
                        {act.notes && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {act.notes}
                          </p>
                        )}
                      </div>
                    </div>
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
