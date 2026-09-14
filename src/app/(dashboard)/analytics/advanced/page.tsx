'use client'

import * as React from 'react'
import {
  TrendingUp,
  Sparkles,
  Target,
  RefreshCw,
  Phone,
  Mail,
  Linkedin,
  Calendar,
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
                  Partnership Funnel & AI Intelligence
                </h1>
                <Badge tone="indigo" size="sm">
                  Executive Modeling
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Stage conversion rates, channel response velocity, and loss analysis.
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

      {/* Executive Insights Banner */}
      {insightsData && (
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <CardTitle className="text-sm font-semibold text-foreground">
                Executive Outreach Insights
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-3.5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {insightsData.insights?.map((ins: string, idx: number) => (
                <div
                  key={idx}
                  className="rounded-lg bg-surface-muted/40 p-3.5 border border-border text-xs text-foreground/90 leading-relaxed space-y-1"
                >
                  <div className="font-semibold text-primary flex items-center gap-1">
                    <Target className="size-3" /> Focus Area #{idx + 1}
                  </div>
                  <p>{ins}</p>
                </div>
              ))}
            </div>

            {/* What Needs Attention Today Bar */}
            {insightsData.whatNeedsAttentionToday && (
              <div className="pt-2 border-t border-border flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-foreground mr-1">Immediate Focus:</span>
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
        <Card>
          <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">End-to-End Partnership Conversion Funnel</CardTitle>
              <CardDescription className="text-xs">
                Stage progression from identification to active agreement.
              </CardDescription>
            </div>
            <Badge tone="emerald" size="sm">
              Overall: {data.overallConversionRate}%
            </Badge>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {data.funnel.map((stage, idx) => (
                <div
                  key={stage.stage}
                  className="rounded-lg border border-border bg-surface-muted/30 p-3.5 space-y-1.5"
                >
                  <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                    Step {idx + 1}
                  </div>
                  <div className="text-xs font-semibold text-foreground line-clamp-1">
                    {stage.stage}
                  </div>
                  <div className="font-mono text-2xl font-bold tabular tracking-tight text-foreground">
                    {stage.count}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-1 border-t border-border">
                    <span className="font-mono font-semibold tabular text-foreground">{stage.conversionFromPrev}%</span>
                    <span>from prev</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Channel Performance & Loss Grid */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Channel Response & Meeting Conversion */}
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-semibold">Outreach Channel Efficiency</CardTitle>
              <CardDescription className="text-xs">
                Response and meeting conversion by communication medium.
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-muted/50 text-muted-foreground uppercase text-[10px] font-semibold border-b border-border">
                  <tr>
                    <th className="py-2.5 px-4">Channel</th>
                    <th className="py-2.5 px-3 text-center">Touches</th>
                    <th className="py-2.5 px-3 text-center">Responses</th>
                    <th className="py-2.5 px-3 text-center">Response Rate</th>
                    <th className="py-2.5 px-4 text-right">Meeting Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono">
                  {data.channelPerformance.map((ch) => (
                    <tr key={ch.channel} className="hover:bg-surface-hover transition-colors">
                      <td className="py-2.5 px-4 font-sans font-medium text-foreground flex items-center gap-2">
                        {ch.channel === 'Phone Calls' && <Phone className="size-3.5 text-muted-foreground" />}
                        {ch.channel === 'Emails' && <Mail className="size-3.5 text-muted-foreground" />}
                        {ch.channel === 'LinkedIn' && <Linkedin className="size-3.5 text-muted-foreground" />}
                        {ch.channel === 'Meetings' && <Calendar className="size-3.5 text-muted-foreground" />}
                        <span>{ch.channel}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center tabular text-foreground">{ch.touches}</td>
                      <td className="py-2.5 px-3 text-center tabular text-emerald-600 dark:text-emerald-400 font-semibold">
                        {ch.responses}
                      </td>
                      <td className="py-2.5 px-3 text-center tabular font-semibold text-foreground">
                        {ch.responseRate}%
                      </td>
                      <td className="py-2.5 px-4 text-right tabular font-bold text-violet-600 dark:text-violet-400">
                        {ch.meetingRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Rejection Analysis */}
          <Card className="flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Disqualification & Loss Analysis</CardTitle>
                <CardDescription className="text-xs">
                  Root causes of pipeline drop-offs with AI takeaway.
                </CardDescription>
              </div>
              <Badge tone="rose" size="sm">
                {data.rejectionAnalysis.totalRejections} Losses
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="space-y-2">
                {data.rejectionAnalysis.reasonsBreakdown.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No rejection records logged.
                  </div>
                ) : (
                  data.rejectionAnalysis.reasonsBreakdown.map((r) => (
                    <div key={r.reason} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-foreground font-medium">{r.reason}</span>
                        <span className="font-mono text-muted-foreground tabular">{r.count} ({r.percent}%)</span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full transition-all duration-300"
                          style={{ width: `${r.percent}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {data.rejectionAnalysis.aiInsight && (
                <div className="rounded-md bg-surface-muted/40 p-3 border border-border text-xs text-foreground/90 space-y-1">
                  <div className="font-semibold text-primary flex items-center gap-1">
                    <Sparkles className="size-3 text-primary" /> Key Takeaway
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
