'use client'

import * as React from 'react'
import {
  FileSpreadsheet,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function MonthlyReportPage() {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [copied, setCopied] = React.useState(false)

  const fetchReport = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/reports')
      if (res.status === 403) {
        toast.error('Access Denied: Reports are reserved for leadership.')
        window.location.href = '/dashboard?denied=1'
        return
      }

      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {
      toast.error('Failed to load monthly report.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d?.user && d.user.role !== 'OWNER' && d.user.role !== 'TL') {
          toast.error('Access Denied: Reports are reserved for leadership.')
          window.location.href = '/dashboard?denied=1'
        }
      })
      .catch(() => {})
    fetchReport()
  }, [fetchReport])

  const copyReport = () => {
    if (!data) return
    const text = `*Leadwise — Monthly Partnership Intelligence Summary*\n` +
      `Date: ${new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}\n\n` +
      `*Overall Conversion Rate*: ${data.overallConversionRate}%\n` +
      `*Top Converting Sector*: ${data.domainPerformance?.[0]?.category || 'Healthcare'}\n\n` +
      `*Strategic Takeaway*\n${data.rejectionAnalysis?.aiInsight || 'Outreach healthy.'}`

    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Monthly report copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <TrendingUp className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Monthly Partnership Intelligence Rollup
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Long-term conversion analysis, domain rankings, and strategic partnership trends.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyReport} icon={copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}>
            {copied ? 'Copied' : 'Copy Monthly Summary'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchReport} icon={<RefreshCw className="size-3.5" />}>
            Refresh
          </Button>
        </div>
      </div>

      {data && (
        <div className="space-y-6">
          <Card className="border-border bg-surface shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Top Converting Sectors &amp; Domains</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {data.domainPerformance?.map((d: any) => (
                  <div key={d.category} className="p-3.5 rounded-xl border border-border bg-surface-muted/40 space-y-1">
                    <div className="font-bold text-xs text-foreground">{d.category}</div>
                    <div className="text-2xl font-black text-primary">{d.conversionRate}%</div>
                    <div className="text-[10px] text-muted-foreground">
                      {d.interestedCount} interested / {d.totalOrgs} organisations
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
