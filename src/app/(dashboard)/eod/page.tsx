'use client'

import * as React from 'react'
import {
  FileSpreadsheet,
  Send,
  Copy,
  Sparkles,
  RefreshCw,
  Clock,
  Check,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Phone,
  Mail,
  Linkedin,
  Edit2,
  Zap,
  WifiOff,
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
  DialogFooter,
} from '@/components/ui/dialog'
import { buildWhatsAppLink, normalizeWhatsAppNumber, formatWhatsAppNumber } from '@/lib/whatsapp'
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
  const [hasAgentToken, setHasAgentToken] = React.useState(true) // assume true to avoid flash

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
      toast.success(force ? 'EOD report regenerated!' : 'EOD report generated!')
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
    toast.success(`${label} copied!`)
    setTimeout(() => setCopiedSection(null), 2500)
  }

  const handleWhatsAppSend = async () => {
    const textToSend = draftWhatsAppText || report?.whatsappText
    if (!textToSend) return

    const waLink = buildWhatsAppLink(textToSend, report.whatsappNumber)

    // Mark as handed off in DB
    fetch('/api/eod', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateKey, markSent: true }),
    }).catch(() => {})

    window.open(waLink.url, '_blank')
    setPreviewModalOpen(false)
    toast.info('Opened WhatsApp with pre-filled EOD message.')
  }

  // ── Auto-Send via Local Agent ──────────────────────────────────────────────
  const handleAutoSend = async () => {
    const textToSend = draftWhatsAppText || report?.whatsappText
    const phone = report?.whatsappNumber || process.env.EOD_WHATSAPP_NUMBER
    if (!textToSend || !phone) return

    setAutoSending(true)
    setAutoSendResult(null)

    try {
      // Get the agent token from localStorage or prompt
      const agentToken = localStorage.getItem('whatsapp_agent_token') || ''

      const res = await fetch(`${AGENT_URL}/send-eod`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${agentToken}`,
        },
        body: JSON.stringify({ phone, message: textToSend }),
        signal: AbortSignal.timeout(180000), // 3 min timeout for QR scan + send
      })

      const data = await res.json()

      if (data.success) {
        setAutoSendResult({ success: true, sentAt: data.sentAt })
        // Mark as sent in DB
        fetch('/api/eod', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dateKey, markSent: true }),
        }).catch(() => {})
        toast.success('✅ EOD sent successfully via WhatsApp!')
        loadReport(dateKey)
      } else {
        setAutoSendResult({ success: false, error: data.error || 'Unknown error' })
        if (data.needsLogin) {
          toast.error('WhatsApp Web requires login. Please scan QR in the agent browser window.')
        } else {
          toast.error(`⚠ WhatsApp automation failed: ${data.error}`)
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Agent unreachable'
      setAutoSendResult({ success: false, error: msg })
      toast.error(`⚠ WhatsApp automation failed: ${msg}`)
    } finally {
      setAutoSending(false)
      agent.refresh()
    }
  }

  const metrics = report?.metrics

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="size-6 text-emerald-600" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Daily Outreach EOD Report
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aggregated team performance, AI executive summary, and ₹0 WhatsApp dispatch flow.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={dateKey}
            onChange={(e) => setDateKey(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground shadow-xs focus:border-primary focus:outline-none"
          />

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleGenerate(Boolean(report))}
            loading={generating}
            icon={<Sparkles className="size-4" />}
          >
            {report ? 'Regenerate EOD' : 'Generate EOD'}
          </Button>
        </div>
      </div>

      {loading && !report ? (
        <div className="p-12 text-center text-xs text-muted-foreground">
          Loading EOD report...
        </div>
      ) : !report ? (
        <Card className="border-border p-12 text-center space-y-3">
          <FileSpreadsheet className="size-10 mx-auto text-muted-foreground/60" />
          <p className="font-bold text-base">No EOD Report Generated for {dateKey}</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Click &ldquo;Generate EOD&rdquo; above to aggregate today&apos;s metrics and generate an AI-powered summary.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleGenerate(false)}
            loading={generating}
            icon={<Sparkles className="size-4" />}
          >
            Generate Today&apos;s EOD
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">
                Leadwise — Daily Outreach EOD
              </span>
              <Badge tone="blue" size="sm">
                {report.dateLabel}
              </Badge>
              {report.lastSentAt && (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" /> Opened in WhatsApp
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyText(report.whatsappText, 'Full EOD')}
                icon={copiedSection === 'Full EOD' ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              >
                {copiedSection === 'Full EOD' ? 'Copied!' : 'Copy Full EOD'}
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
                Preview &amp; Edit
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setDraftWhatsAppText(report.whatsappText)
                  setPreviewModalOpen(true)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                icon={<Send className="size-3.5" />}
              >
                Send on WhatsApp
              </Button>

              {/* Auto Send via Local Agent */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setDraftWhatsAppText(report.whatsappText)
                  setAutoSendResult(null)
                  setAutoSendModalOpen(true)
                }}
                disabled={agent.status !== 'online' || agent.isSending}
                className={cn(
                  'text-white',
                  agent.status === 'online'
                    ? 'bg-violet-600 hover:bg-violet-700'
                    : 'bg-gray-400 cursor-not-allowed'
                )}
                icon={<Zap className="size-3.5" />}
              >
                Auto Send WhatsApp
              </Button>
            </div>

            {/* Agent Status Indicator */}
            <div className="flex items-center gap-1.5 text-[11px]">
              {agent.status === 'online' ? (
                <>
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-600 font-medium">WhatsApp Automation Connected</span>
                </>
              ) : agent.status === 'checking' ? (
                <>
                  <Loader2 className="size-3 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Checking agent...</span>
                </>
              ) : (
                <>
                  <span className="size-2 rounded-full bg-gray-400" />
                  <span className="text-muted-foreground">WhatsApp Automation Offline</span>
                </>
              )}
            </div>
          </div>

          {/* Section Copy Bar */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-muted/50 border border-border p-2.5 text-xs">
            <span className="font-semibold text-muted-foreground mr-1">Quick Section Copy:</span>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => copyText(report.aiSummary || report.executiveSummary || '', 'AI Summary')}
            >
              {copiedSection === 'AI Summary' ? '✓ Copied' : 'Copy Summary'}
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
              {copiedSection === 'Team Breakdown' ? '✓ Copied' : 'Copy Team Stats'}
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
              {copiedSection === 'Follow-ups' ? '✓ Copied' : 'Copy Follow-ups'}
            </Button>
          </div>

          {/* AI Executive Summary Card */}
          {report.aiSummary && (
            <Card className="border-primary/30 bg-primary-soft/20 shadow-xs">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    <CardTitle className="text-sm text-primary">AI Executive Summary</CardTitle>
                  </div>
                  <Badge tone="violet" size="sm">
                    Groq LLaMA 3.3
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {report.aiSummary}
                </p>
              </CardContent>
            </Card>
          )}

          {/* KPI Tiles */}
          {metrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <div className="rounded-lg border border-border bg-surface p-3 text-center">
                <div className="text-[11px] text-muted-foreground font-medium">Orgs Contacted</div>
                <div className="text-lg font-bold text-foreground mt-0.5">
                  {metrics.organisationsContacted}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface p-3 text-center">
                <div className="text-[11px] text-muted-foreground font-medium">Calls</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                  {metrics.calls}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface p-3 text-center">
                <div className="text-[11px] text-muted-foreground font-medium">Emails</div>
                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {metrics.emails}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface p-3 text-center">
                <div className="text-[11px] text-muted-foreground font-medium">LinkedIn</div>
                <div className="text-lg font-bold text-sky-600 dark:text-sky-400 mt-0.5">
                  {metrics.linkedin}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface p-3 text-center">
                <div className="text-[11px] text-muted-foreground font-medium">Responses</div>
                <div className="text-lg font-bold text-teal-600 dark:text-teal-400 mt-0.5">
                  {metrics.responses}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface p-3 text-center">
                <div className="text-[11px] text-muted-foreground font-medium">Interested</div>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                  {metrics.interested}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface p-3 text-center">
                <div className="text-[11px] text-muted-foreground font-medium">Meetings</div>
                <div className="text-lg font-bold text-violet-600 dark:text-violet-400 mt-0.5">
                  {metrics.meetingsScheduled + metrics.meetingsCompleted}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface p-3 text-center">
                <div className="text-[11px] text-muted-foreground font-medium">Pending Follow-ups</div>
                <div className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                  {metrics.followUpsPending}
                </div>
              </div>
            </div>
          )}

          {/* WhatsApp Text Preview */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">WhatsApp Formatted Message Preview</CardTitle>
                <Button variant="ghost" size="xs" onClick={() => copyText(report.whatsappText, 'WhatsApp Text')}>
                  Copy Message
                </Button>
              </div>
              <CardDescription>
                This exact structured text will be sent to the Owner via WhatsApp Web.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="font-mono text-xs text-foreground/90 bg-surface-muted/60 p-4 rounded-xl border border-border/80 whitespace-pre-wrap leading-relaxed max-h-[320px] overflow-y-auto">
                {report.whatsappText}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Historical Archive Table */}
      {history.length > 0 && (
        <Card className="border-border shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm">Past EOD Reports Archive</CardTitle>
            <CardDescription>Review previous daily outreach reports and historical metrics.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
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
                    <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-xs text-foreground">
                        {item.dateLabel}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs">{item.activities}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs">
                        {item.organisationsContacted}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs font-semibold text-teal-600">
                        {item.responses}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs font-bold text-amber-600">
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
            <div className="flex items-center gap-2">
              <Send className="size-5 text-emerald-600" />
              <DialogTitle>Preview &amp; Send WhatsApp EOD</DialogTitle>
            </div>
            <DialogDescription>
              Review or edit the message text before opening WhatsApp Web to dispatch to the Owner.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <textarea
              rows={12}
              value={draftWhatsAppText}
              onChange={(e) => setDraftWhatsAppText(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface p-3.5 font-mono text-xs text-foreground shadow-xs focus:border-emerald-500 focus:outline-none leading-relaxed"
            />

            <DialogFooter>
              <Button variant="ghost" type="button" onClick={() => setPreviewModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleWhatsAppSend}
                icon={<Send className="size-4" />}
              >
                Send via WhatsApp Web
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auto Send Confirmation Dialog */}
      <Dialog open={autoSendModalOpen} onOpenChange={(open) => { if (!autoSending) setAutoSendModalOpen(open) }}>
        <DialogContent size="lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Zap className="size-5 text-violet-600" />
              <DialogTitle>Auto Send EOD via WhatsApp</DialogTitle>
            </div>
            <DialogDescription>
              The local automation agent will open WhatsApp Web, find the owner&apos;s chat, insert this EOD message, and send it automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Target number */}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted/50 p-3">
              <Phone className="size-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">Send this EOD to:</span>
              <span className="text-sm font-bold text-emerald-600">
                {formatWhatsAppNumber(report?.whatsappNumber)}
              </span>
            </div>

            {/* Message preview */}
            <pre className="font-mono text-[10px] text-foreground/80 bg-surface-muted/60 p-3 rounded-xl border border-border/80 whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto">
              {draftWhatsAppText}
            </pre>

            {/* Agent token input (one-time setup) */}
            {!hasAgentToken && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground">Agent Token (from whatsapp-agent terminal)</label>
                <input
                  type="text"
                  placeholder="swa_..."
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs font-mono focus:border-violet-500 focus:outline-none"
                  onChange={(e) => {
                    if (e.target.value.startsWith('swa_')) {
                      localStorage.setItem('whatsapp_agent_token', e.target.value.trim())
                      setHasAgentToken(true)
                    }
                  }}
                />
                <p className="text-[10px] text-muted-foreground">Paste the token shown when you started the agent. This is saved locally in your browser.</p>
              </div>
            )}

            {/* Result feedback */}
            {autoSendResult && (
              <div className={cn(
                'rounded-lg border p-3 text-xs',
                autoSendResult.success
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300'
              )}>
                {autoSendResult.success ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4" />
                    <span className="font-bold">EOD sent successfully!</span>
                    <span className="text-[10px] opacity-70">at {autoSendResult.sentAt}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-4" />
                      <span className="font-bold">WhatsApp automation failed</span>
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
                <Loader2 className="size-5 animate-spin text-violet-600" />
                <span className="text-xs font-semibold text-muted-foreground">Sending via WhatsApp Web automation...</span>
              </div>
            )}

            <DialogFooter>
              <Button variant="ghost" type="button" onClick={() => setAutoSendModalOpen(false)} disabled={autoSending}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="button"
                className="bg-violet-600 hover:bg-violet-700 text-white"
                onClick={handleAutoSend}
                disabled={autoSending || autoSendResult?.success}
                icon={autoSending ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
              >
                {autoSending ? 'Sending...' : autoSendResult?.success ? 'Sent ✓' : 'Send'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
