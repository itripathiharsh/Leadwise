'use client'

import * as React from 'react'
import {
  FileSpreadsheet,
  Send,
  Copy,
  Sparkles,
  RefreshCw,
  Check,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Edit2,
  Zap,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { buildWhatsAppLink, formatWhatsAppNumber } from '@/lib/whatsapp'
import { todayKey } from '@/lib/dates'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ── WhatsApp Automation Agent Hook ─────────────────────────────────────────────

const AGENT_URL = process.env.NEXT_PUBLIC_WHATSAPP_AGENT_URL || 'http://localhost:7860'

type AgentStatus = 'online' | 'offline' | 'checking'

interface AgentHealth {
  status: AgentStatus
  isSending: boolean
  session: { hasProfile: boolean } | null
}

function useWhatsAppAgent() {
  const [health, setHealth] = React.useState<AgentHealth>({
    status: 'checking',
    isSending: false,
    session: null,
  })

  const checkHealth = React.useCallback(async () => {
    try {
      const res = await fetch(`${AGENT_URL}/health`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        const data = await res.json()
        setHealth({ status: 'online', isSending: data.isSending, session: data.session })
      } else {
        setHealth({ status: 'offline', isSending: false, session: null })
      }
    } catch {
      setHealth({ status: 'offline', isSending: false, session: null })
    }
  }, [])

  React.useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 10000)
    return () => clearInterval(interval)
  }, [checkHealth])

  return { ...health, refresh: checkHealth }
}

export default function EodReportsPage() {
  const [dateKey, setDateKey] = React.useState(todayKey())
  const [loading, setLoading] = React.useState(true)
  const [generating, setGenerating] = React.useState(false)
  const [copiedSection, setCopiedSection] = React.useState<string | null>(null)

  const [report, setReport] = React.useState<any>(null)
  const [history, setHistory] = React.useState<any[]>([])

  // WhatsApp Preview & Edit Dialog
  const [previewModalOpen, setPreviewModalOpen] = React.useState(false)
  const [draftWhatsAppText, setDraftWhatsAppText] = React.useState('')

  // WhatsApp Automation Agent
  const agent = useWhatsAppAgent()
  const [autoSendModalOpen, setAutoSendModalOpen] = React.useState(false)
  const [autoSending, setAutoSending] = React.useState(false)
  const [autoSendResult, setAutoSendResult] = React.useState<{ success: boolean; error?: string; sentAt?: string } | null>(null)
  const [hasAgentToken, setHasAgentToken] = React.useState(true)

  React.useEffect(() => {
    setHasAgentToken(!!localStorage.getItem('whatsapp_agent_token'))
  }, [autoSendModalOpen])

  const loadReport = React.useCallback(async (targetDate: string) => {
    setLoading(true)
    try {
      const [reportRes, histRes] = await Promise.all([
        fetch(`/api/eod?dateKey=${targetDate}`),
        fetch(`/api/eod?history=true`),
      ])

      if (reportRes.status === 403 || histRes.status === 403) {
        toast.error('Access Denied: EOD reports are reserved for Owner and Team Lead.')
        window.location.href = '/dashboard?denied=1'
        return
      }

      if (reportRes.ok) {
        const d = await reportRes.json()
        setReport(d.report)
        if (d.report?.whatsappText) setDraftWhatsAppText(d.report.whatsappText)
      }
      if (histRes.ok) {
        const hd = await histRes.json()
        setHistory(hd.history ?? [])
      }
    } catch {
      toast.error('Failed to load EOD report.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user && d.user.role !== 'OWNER' && d.user.role !== 'TL') {
          toast.error('Access Denied: EOD reports are reserved for Owner and Team Lead.')
          window.location.href = '/dashboard?denied=1'
        }
      })
      .catch(() => {})
    loadReport(dateKey)
  }, [dateKey, loadReport])

  const handleGenerate = async (force = false) => {
    setGenerating(true)
    try {
      const res = await fetch('/api/eod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateKey, forceRegenerate: force }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        toast.error(data.error || 'Failed to generate EOD report.')
        setGenerating(false)
        return
      }

      setReport(data.report)
      if (data.report?.whatsappText) setDraftWhatsAppText(data.report.whatsappText)
      toast.success(force ? 'EOD report regenerated' : 'EOD report generated')
      loadReport(dateKey)
    } catch {
      toast.error('Network error generating EOD.')
    } finally {
      setGenerating(false)
    }
  }

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedSection(label)
    toast.success(`${label} copied to clipboard`)
    setTimeout(() => setCopiedSection(null), 2500)
  }

  const handleWhatsAppSend = async () => {
    const textToSend = draftWhatsAppText || report?.whatsappText
    if (!textToSend) return

    const waLink = buildWhatsAppLink(textToSend, report.whatsappNumber)

    fetch('/api/eod', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateKey, markSent: true }),
    }).catch(() => {})

    window.open(waLink.url, '_blank')
    setPreviewModalOpen(false)
    toast.info('Opened WhatsApp with formatted EOD dispatch.')
  }

  const handleAutoSend = async () => {
    const textToSend = draftWhatsAppText || report?.whatsappText
    const phone = report?.whatsappNumber || process.env.EOD_WHATSAPP_NUMBER
    if (!textToSend || !phone) return

    setAutoSending(true)
    setAutoSendResult(null)

    try {
      const agentToken = localStorage.getItem('whatsapp_agent_token') || ''

      const res = await fetch(`${AGENT_URL}/send-eod`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${agentToken}`,
        },
        body: JSON.stringify({ phone, message: textToSend }),
        signal: AbortSignal.timeout(180000),
      })

      const data = await res.json()

      if (data.success) {
        setAutoSendResult({ success: true, sentAt: data.sentAt })
        fetch('/api/eod', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dateKey, markSent: true }),
        }).catch(() => {})
        toast.success('EOD sent successfully via WhatsApp automation')
        loadReport(dateKey)
      } else {
        setAutoSendResult({ success: false, error: data.error || 'Unknown error' })
        if (data.needsLogin) {
          toast.error('WhatsApp Web requires login. Scan QR in agent browser window.')
        } else {
          toast.error(`WhatsApp automation failed: ${data.error}`)
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Agent unreachable'
      setAutoSendResult({ success: false, error: msg })
      toast.error(`WhatsApp automation error: ${msg}`)
    } finally {
      setAutoSending(false)
      agent.refresh()
    }
  }

  const metrics = report?.metrics

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Precision Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-surface-muted text-foreground border border-border">
              <FileSpreadsheet className="size-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-sans font-bold text-xl sm:text-2xl tracking-tight text-foreground">
                  Daily Outreach EOD Report
                </h1>
                <Badge tone="emerald" size="sm">
                  Executive Dispatch
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Aggregated outreach metrics, AI summary synthesis, and WhatsApp dispatch automation.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="date"
            value={dateKey}
            onChange={(e) => setDateKey(e.target.value)}
            className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-foreground focus:border-border-strong focus:outline-none cursor-pointer"
          />

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleGenerate(Boolean(report))}
            loading={generating}
            icon={<Sparkles className="size-3.5" />}
          >
            {report ? 'Regenerate EOD' : 'Generate EOD'}
          </Button>
        </div>
      </div>

      {loading && !report ? (
        <div className="p-16 text-center text-xs text-muted-foreground">
          <RefreshCw className="size-5 mx-auto text-primary animate-spin mb-2" />
          Loading EOD report...
        </div>
      ) : !report ? (
        <Card className="p-12 text-center space-y-3">
          <FileSpreadsheet className="size-8 mx-auto text-muted-foreground" />
          <p className="font-semibold text-base">No EOD Report Generated for {dateKey}</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Click &ldquo;Generate EOD&rdquo; above to aggregate today&apos;s team metrics and produce an executive intelligence dispatch.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleGenerate(false)}
            loading={generating}
            icon={<Sparkles className="size-3.5" />}
          >
            Generate Today&apos;s EOD
          </Button>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-foreground">
                Leadwise Daily Outreach EOD
              </span>
              <Badge tone="blue" size="sm">
                {report.dateLabel}
              </Badge>
              {report.lastSentAt && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" /> Handed off
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyText(report.whatsappText, 'Full EOD')}
                icon={copiedSection === 'Full EOD' ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              >
                {copiedSection === 'Full EOD' ? 'Copied' : 'Copy Full EOD'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDraftWhatsAppText(report.whatsappText)
                  setPreviewModalOpen(true)
                }}
                icon={<Edit2 className="size-3.5 text-muted-foreground" />}
              >
                Preview & Edit
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setDraftWhatsAppText(report.whatsappText)
                  setPreviewModalOpen(true)
                }}
                icon={<Send className="size-3.5" />}
              >
                Send via WhatsApp
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDraftWhatsAppText(report.whatsappText)
                  setAutoSendResult(null)
                  setAutoSendModalOpen(true)
                }}
                disabled={agent.status !== 'online' || agent.isSending}
                icon={<Zap className="size-3.5 text-primary" />}
              >
                Auto Send
              </Button>
            </div>

            {/* Agent Status */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              {agent.status === 'online' ? (
                <>
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Agent Connected</span>
                </>
              ) : agent.status === 'checking' ? (
                <>
                  <Loader2 className="size-3 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Checking agent...</span>
                </>
              ) : (
                <>
                  <span className="size-1.5 rounded-full bg-slate-400" />
                  <span className="text-muted-foreground">Agent Offline</span>
                </>
              )}
            </div>
          </div>

          {/* Section Copy Bar */}
          <div className="flex flex-wrap items-center gap-2 rounded-md bg-surface-muted/40 border border-border p-2 text-xs">
            <span className="font-semibold text-muted-foreground mr-1">Copy Snippets:</span>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => copyText(report.aiSummary || report.executiveSummary || '', 'AI Summary')}
            >
              {copiedSection === 'AI Summary' ? 'Copied' : 'Summary'}
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                const teamText = (report.teamBreakdown ?? [])
                  .map(
                    (t: any) =>
                      `• ${t.name} (${t.role}): ${t.calls} calls, ${t.emails} emails, ${t.linkedin} linkedin, ${t.responses} responses, ${t.interested} interested`,
                  )
                  .join('\n')
                copyText(teamText, 'Team Breakdown')
              }}
            >
              {copiedSection === 'Team Breakdown' ? 'Copied' : 'Team Stats'}
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                const followupsText = (report.followUpsDueTomorrow ?? [])
                  .map((f: any) => `• ${f.organisationName} (${f.contactName || 'General'}): ${f.notes || 'Scheduled follow-up'}`)
                  .join('\n')
                copyText(followupsText, 'Follow-ups')
              }}
            >
              {copiedSection === 'Follow-ups' ? 'Copied' : 'Tomorrow Cadence'}
            </Button>
          </div>

          {/* AI Executive Summary Card */}
          {report.aiSummary && (
            <Card className="border-border">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <CardTitle className="text-sm">Executive Summary</CardTitle>
                </div>
                <Badge tone="slate" size="sm">
                  Deterministic AI
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap font-sans">
                  {report.aiSummary}
                </p>
              </CardContent>
            </Card>
          )}

          {/* KPI Tiles */}
          {metrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              <div className="rounded-md border border-border bg-surface p-2.5 text-center">
                <div className="text-[10.5px] text-muted-foreground font-medium uppercase tracking-wider">Orgs</div>
                <div className="font-mono text-xl font-bold tabular text-foreground mt-0.5">
                  {metrics.organisationsContacted}
                </div>
              </div>

              <div className="rounded-md border border-border bg-surface p-2.5 text-center">
                <div className="text-[10.5px] text-muted-foreground font-medium uppercase tracking-wider">Calls</div>
                <div className="font-mono text-xl font-bold tabular text-foreground mt-0.5">
                  {metrics.calls}
                </div>
              </div>

              <div className="rounded-md border border-border bg-surface p-2.5 text-center">
                <div className="text-[10.5px] text-muted-foreground font-medium uppercase tracking-wider">Emails</div>
                <div className="font-mono text-xl font-bold tabular text-foreground mt-0.5">
                  {metrics.emails}
                </div>
              </div>

              <div className="rounded-md border border-border bg-surface p-2.5 text-center">
                <div className="text-[10.5px] text-muted-foreground font-medium uppercase tracking-wider">LinkedIn</div>
                <div className="font-mono text-xl font-bold tabular text-foreground mt-0.5">
                  {metrics.linkedin}
                </div>
              </div>

              <div className="rounded-md border border-border bg-surface p-2.5 text-center">
                <div className="text-[10.5px] text-muted-foreground font-medium uppercase tracking-wider">Responses</div>
                <div className="font-mono text-xl font-bold tabular text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {metrics.responses}
                </div>
              </div>

              <div className="rounded-md border border-border bg-surface p-2.5 text-center">
                <div className="text-[10.5px] text-muted-foreground font-medium uppercase tracking-wider">Interested</div>
                <div className="font-mono text-xl font-bold tabular text-amber-600 dark:text-amber-400 mt-0.5">
                  {metrics.interested}
                </div>
              </div>

              <div className="rounded-md border border-border bg-surface p-2.5 text-center">
                <div className="text-[10.5px] text-muted-foreground font-medium uppercase tracking-wider">Meetings</div>
                <div className="font-mono text-xl font-bold tabular text-violet-600 dark:text-violet-400 mt-0.5">
                  {metrics.meetingsScheduled + metrics.meetingsCompleted}
                </div>
              </div>

              <div className="rounded-md border border-border bg-surface p-2.5 text-center">
                <div className="text-[10.5px] text-muted-foreground font-medium uppercase tracking-wider">Pending Cadence</div>
                <div className="font-mono text-xl font-bold tabular text-rose-600 dark:text-rose-400 mt-0.5">
                  {metrics.followUpsPending}
                </div>
              </div>
            </div>
          )}

          {/* WhatsApp Message Preview: Mobile Chat Bubble Simulation */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">WhatsApp Dispatch Preview</CardTitle>
                <CardDescription className="text-xs">
                  Authentic simulation of message delivered to Owner on WhatsApp.
                </CardDescription>
              </div>
              <Button variant="ghost" size="xs" onClick={() => copyText(report.whatsappText, 'WhatsApp Text')}>
                Copy Message
              </Button>
            </CardHeader>
            <CardContent>
              {/* WhatsApp Bubble Container */}
              <div className="rounded-lg border border-border bg-[#0B141A] p-4 max-w-xl mx-auto shadow-inner">
                {/* Header Simulation */}
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3 text-xs text-white/70">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-full bg-emerald-700 flex items-center justify-center text-[10px] text-white font-bold">
                      LW
                    </div>
                    <span className="font-semibold text-white">Leadwise Bot</span>
                  </div>
                  <span className="text-[10px] text-white/50">Today</span>
                </div>

                {/* Chat Bubble */}
                <div className="bg-[#005C4B] text-[#E9EDEF] rounded-lg p-3 text-xs font-mono whitespace-pre-wrap leading-relaxed shadow-sm">
                  {report.whatsappText}
                  <div className="text-[9px] text-right text-white/60 mt-2 flex items-center justify-end gap-1">
                    <span>9:00 PM</span>
                    <span className="text-sky-300 font-bold">✓✓</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Historical Archive Table */}
      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Past EOD Reports Archive</CardTitle>
            <CardDescription className="text-xs">Review previous daily outreach reports and historical metrics.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Activities</th>
                    <th className="py-2.5 px-3 text-right">Orgs</th>
                    <th className="py-2.5 px-3 text-right">Responses</th>
                    <th className="py-2.5 px-3 text-right">Interested</th>
                    <th className="py-2.5 px-3">Generated By</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-hover transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-xs text-foreground">
                        {item.dateLabel}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs tabular">{item.activities}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs tabular">
                        {item.organisationsContacted}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs tabular font-semibold text-emerald-600 dark:text-emerald-400">
                        {item.responses}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs tabular font-semibold text-amber-600 dark:text-amber-400">
                        {item.interested}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-muted-foreground">
                        {item.generatedBy?.name || 'Harsh'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setDateKey(item.dateKey)}
                        >
                          View Report →
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* WhatsApp Message Preview & Edit Modal */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
                <Send className="size-4" />
              </div>
              <div>
                <DialogTitle>Preview & Send WhatsApp EOD</DialogTitle>
                <DialogDescription>
                  Review or edit the message text before opening WhatsApp Web to dispatch to the Owner.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <textarea
              rows={12}
              value={draftWhatsAppText}
              onChange={(e) => setDraftWhatsAppText(e.target.value)}
              className="w-full rounded border border-border bg-surface p-3 font-mono text-xs text-foreground focus:border-border-strong focus:outline-none leading-relaxed resize-y"
            />
          </DialogBody>

          <DialogFooter>
            <Button variant="ghost" type="button" onClick={() => setPreviewModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={handleWhatsAppSend}
              icon={<Send className="size-3.5" />}
            >
              Send via WhatsApp Web
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto Send Confirmation Dialog */}
      <Dialog open={autoSendModalOpen} onOpenChange={(open) => { if (!autoSending) setAutoSendModalOpen(open) }}>
        <DialogContent size="lg">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Zap className="size-4" />
              </div>
              <div>
                <DialogTitle>Auto Send EOD via WhatsApp</DialogTitle>
                <DialogDescription>
                  The local automation agent will open WhatsApp Web, locate the owner&apos;s chat, and send this EOD report.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {/* Target number */}
            <div className="flex items-center gap-2.5 rounded border border-border bg-surface-muted/50 p-3">
              <Phone className="size-4 text-muted-foreground shrink-0" />
              <span className="text-xs font-semibold text-foreground">Send this EOD to:</span>
              <span className="text-xs font-mono font-bold text-foreground">
                {formatWhatsAppNumber(report?.whatsappNumber)}
              </span>
            </div>

            {/* Message preview */}
            <pre className="font-mono text-[10px] text-foreground/80 bg-surface-muted/60 p-3 rounded border border-border whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto">
              {draftWhatsAppText}
            </pre>

            {/* Agent token input (one-time setup) */}
            {!hasAgentToken && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Agent Token</label>
                <input
                  type="text"
                  placeholder="swa_..."
                  className="h-9 w-full rounded border border-border bg-surface px-3 py-1 text-xs font-mono focus:border-border-strong focus:outline-none"
                  onChange={(e) => {
                    if (e.target.value.startsWith('swa_')) {
                      localStorage.setItem('whatsapp_agent_token', e.target.value.trim())
                      setHasAgentToken(true)
                    }
                  }}
                />
                <p className="text-[10px] text-muted-foreground">Paste the token shown when starting the agent.</p>
              </div>
            )}

            {/* Result feedback */}
            {autoSendResult && (
              <div className={cn(
                'rounded border p-3 text-xs',
                autoSendResult.success
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300'
              )}>
                {autoSendResult.success ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4" />
                    <span className="font-semibold">EOD sent successfully</span>
                    <span className="text-[10px] opacity-70">at {autoSendResult.sentAt}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-4" />
                      <span className="font-semibold">WhatsApp automation failed</span>
                    </div>
                    <p>{autoSendResult.error}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <Button variant="outline" size="xs" onClick={handleWhatsAppSend} icon={<ExternalLink className="size-3" />}>
                        Open WhatsApp Manually
                      </Button>
                      <Button variant="outline" size="xs" onClick={() => copyText(report?.whatsappText || '', 'Full EOD')} icon={<Copy className="size-3" />}>
                        Copy EOD
                      </Button>
                      <Button variant="outline" size="xs" onClick={handleAutoSend} icon={<RefreshCw className="size-3" />}>
                        Retry
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sending spinner */}
            {autoSending && (
              <div className="flex items-center justify-center gap-3 py-4">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Sending via WhatsApp Web automation...</span>
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            <Button variant="ghost" type="button" onClick={() => setAutoSendModalOpen(false)} disabled={autoSending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={handleAutoSend}
              disabled={autoSending || autoSendResult?.success}
              icon={autoSending ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
            >
              {autoSending ? 'Sending...' : autoSendResult?.success ? 'Sent' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
