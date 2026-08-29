'use client'

import * as React from 'react'
import {
  FileSpreadsheet,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Calendar,
  Users,
  Building2,
  Award,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function WeeklyReportPage() {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [copied, setCopied] = React.useState(false)

  const fetchReport = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/reports')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {
      toast.error('Failed to load weekly report.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const copyReport = () => {
    if (!data) return
    const text = `*Leadwise — Executive Weekly Partnership Report*\n` +
      `Date: ${new Date().toLocaleDateString()}\n\n` +
      `*Overall Conversion*: ${data.overallConversionRate}%\n` +
      `*Rejections Logged*: ${data.rejectionAnalysis?.totalRejections || 0}\n` +
      `*Top Cause*: ${data.rejectionAnalysis?.reasonsBreakdown?.[0]?.reason || 'N/A'}\n\n` +
      `*AI Strategic Insight*\n${data.rejectionAnalysis?.aiInsight || 'Outreach healthy.'}`

    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Weekly report copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Weekly AI Partnership Executive Report
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automated week-over-week performance aggregation, conversion metrics, and AI recommendations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyReport} icon={copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}>
            {copied ? 'Copied' : 'Copy Executive Report'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchReport} icon={<RefreshCw className="size-3.5" />}>
            Refresh
          </Button>
        </div>
      </div>

      {data && (
        <div className="space-y-6">
          <Card className="border-primary/30 bg-primary-soft/15 shadow-xs">
            <CardHeader className="pb-3 border-b border-primary/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                Executive Summary &amp; Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs leading-relaxed text-foreground/90">
              <p>
                This week, the Leadwise outreach team maintained an overall conversion rate of{' '}
                <strong>{data.overallConversionRate}%</strong> across the partnership lifecycle.
              </p>
              <div className="p-3 bg-surface rounded-xl border border-border">
                <span className="font-bold text-primary">Strategic Focus: </span>
                {data.rejectionAnalysis?.aiInsight}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-surface shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Weekly Channel Conversion Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {data.channelPerformance?.map((ch: any) => (
                  <div key={ch.channel} className="p-3 rounded-xl border border-border bg-surface-muted/40 space-y-1">
                    <div className="font-bold text-xs text-foreground">{ch.channel}</div>
                    <div className="text-xl font-extrabold text-primary">{ch.touches} touches</div>
                    <div className="text-[11px] text-muted-foreground">
                      Response Rate: <span className="font-bold text-foreground">{ch.responseRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
