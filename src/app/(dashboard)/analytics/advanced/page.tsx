'use client'

import * as React from 'react'
import {
  TrendingUp,
  Sparkles,
  BarChart3,
  Filter,
  Users,
  Target,
  ArrowRight,
  ArrowUpRight,
  RefreshCw,
  Phone,
  Mail,
  Linkedin,
  Calendar,
  AlertTriangle,
  Flame,
  Snowflake,
  Award,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { AdvancedOutreachAnalytics } from '@/server/services/ai/analytics-intelligence'

export default function AdvancedAnalyticsPage() {
  const [data, setData] = React.useState<AdvancedOutreachAnalytics | null>(null)
  const [insightsData, setInsightsData] = React.useState<any | null>(null)
  const [loading, setLoading] = React.useState(true)

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [res1, res2] = await Promise.all([
        fetch('/api/ai/reports'),
        fetch('/api/ai/reports?mode=insights'),
      ])

      if (res1.status === 403 || res2.status === 403) {
        toast.error('Access Denied: AI Funnel intelligence is reserved for Owner and Team Lead.')
        window.location.href = '/dashboard?denied=1'
        return
      }

      if (res1.ok) {
        const d1 = await res1.json()
        setData(d1)
      }
      if (res2.ok) {
        const d2 = await res2.json()
        setInsightsData(d2)
      }
    } catch {
      toast.error('Failed to load advanced analytics.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user && d.user.role !== 'OWNER' && d.user.role !== 'TL') {
          toast.error('Access Denied: AI Funnel intelligence is reserved for Owner and Team Lead.')
          window.location.href = '/dashboard?denied=1'
        }
      })
      .catch(() => {})
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
              Partnership Funnel &amp; AI Intelligence
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Deterministic stage conversion funnels, channel response rates, rejection analysis, and AI insights.
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

      {/* Owner Executive Insights Banner */}
      {insightsData && (
        <Card className="border-primary/30 bg-primary-soft/15 shadow-xs">
          <CardHeader className="pb-3 border-b border-primary/20 bg-surface/50">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <CardTitle className="text-sm font-bold text-foreground">
                AI Executive Outreach Insights
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-3.5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {insightsData.insights?.map((ins: string, idx: number) => (
                <div
                  key={idx}
                  className="rounded-xl bg-surface p-3.5 border border-border text-xs text-foreground/90 leading-relaxed space-y-1 shadow-xs"
                >
                  <div className="font-bold text-primary flex items-center gap-1">
                    <Target className="size-3 text-primary" /> Key Strategic Focus #{idx + 1}
                  </div>
                  <p>{ins}</p>
                </div>
              ))}
            </div>

            {/* What Needs Attention Today Bar */}
            {insightsData.whatNeedsAttentionToday && (
              <div className="pt-2 border-t border-primary/20 flex flex-wrap items-center gap-2.5 text-xs">
                <span className="font-bold text-foreground mr-1">What Needs Attention Today:</span>
                {insightsData.whatNeedsAttentionToday.map((w: any, i: number) => (
                  <Badge key={i} tone={w.tone} size="md">
                    {w.label}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Outreach Conversion Funnel */}
      {data?.funnel && (
        <Card className="border-border bg-surface shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">End-to-End Partnership Conversion Funnel</CardTitle>
                <CardDescription className="text-xs">
                  Progression rates from target identification to active signed partnership.
                </CardDescription>
              </div>
              <Badge tone="emerald" size="sm">
                Overall Conversion: {data.overallConversionRate}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {data.funnel.map((stage, idx) => (
                <div
                  key={stage.stage}
                  className="rounded-xl border border-border bg-surface-muted/30 p-4 space-y-2 relative"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Step {idx + 1}
                  </div>
                  <div className="text-xs font-bold text-foreground line-clamp-1">
                    {stage.stage}
                  </div>
                  <div className="text-2xl font-black text-primary">
                    {stage.count}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                    <span className="font-semibold text-foreground">{stage.conversionFromPrev}%</span>
                    <span>from prev step</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Channel Performance & Rejections Grid */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Channel Response & Meeting Conversion */}
          <Card className="border-border bg-surface shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Outreach Channel Efficiency</CardTitle>
              <CardDescription className="text-xs">
                Response and meeting conversion by channel (Calls, Emails, LinkedIn).
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-muted/60 text-muted-foreground uppercase text-[10px] font-bold border-b border-border">
                  <tr>
                    <th className="p-3 pl-4">Channel</th>
                    <th className="p-3 text-center">Touches</th>
                    <th className="p-3 text-center">Responses</th>
                    <th className="p-3 text-center">Response Rate</th>
                    <th className="p-3 text-center pr-4">Meeting Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.channelPerformance.map((ch) => (
                    <tr key={ch.channel} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3 pl-4 font-semibold text-foreground flex items-center gap-2">
                        {ch.channel === 'Phone Calls' && <Phone className="size-3.5 text-blue-500" />}
                        {ch.channel === 'Emails' && <Mail className="size-3.5 text-indigo-500" />}
                        {ch.channel === 'LinkedIn' && <Linkedin className="size-3.5 text-sky-500" />}
                        {ch.channel === 'Meetings' && <Calendar className="size-3.5 text-violet-500" />}
                        <span>{ch.channel}</span>
                      </td>
                      <td className="p-3 text-center font-bold">{ch.touches}</td>
                      <td className="p-3 text-center text-teal-600 dark:text-teal-400 font-semibold">
                        {ch.responses}
                      </td>
                      <td className="p-3 text-center font-bold text-foreground">
                        {ch.responseRate}%
                      </td>
                      <td className="p-3 text-center font-bold text-violet-600 dark:text-violet-400 pr-4">
                        {ch.meetingRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Rejection Analysis */}
          <Card className="border-border bg-surface shadow-xs flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Rejection &amp; Loss Analysis</CardTitle>
                  <CardDescription className="text-xs">
                    Root causes of pipeline drop-offs with AI interpretation.
                  </CardDescription>
                </div>
                <Badge tone="rose" size="sm">
                  {data.rejectionAnalysis.totalRejections} Total Losses
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="space-y-2">
                {data.rejectionAnalysis.reasonsBreakdown.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No rejection records logged.
                  </div>
                ) : (
                  data.rejectionAnalysis.reasonsBreakdown.map((r) => (
                    <div key={r.reason} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-foreground">{r.reason}</span>
                        <span className="text-muted-foreground">{r.count} ({r.percent}%)</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full"
                          style={{ width: `${r.percent}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {data.rejectionAnalysis.aiInsight && (
                <div className="rounded-xl bg-surface-muted/50 p-3 border border-border text-xs text-foreground/90 space-y-1">
                  <div className="font-bold text-primary flex items-center gap-1">
                    <Sparkles className="size-3 text-primary" /> AI Strategic Rejection Takeaway:
                  </div>
                  <p>{data.rejectionAnalysis.aiInsight}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
