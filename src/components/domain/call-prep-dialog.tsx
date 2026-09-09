'use client'

import * as React from 'react'
import {
  Phone,
  Target,
  Sparkles,
  MessageSquare,
  ShieldAlert,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { CallPrepData } from '@/server/services/ai/assistant'

interface CallPrepDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  contactId?: string
  onStartCall?: () => void
}

export function CallPrepDialog({
  open,
  onOpenChange,
  orgId,
  contactId,
  onStartCall,
}: CallPrepDialogProps) {
  const [data, setData] = React.useState<CallPrepData | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [copiedOpener, setCopiedOpener] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setLoading(true)
      fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CALL_PREP', orgId, contactId }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.callPrep) setData(d.callPrep)
        })
        .catch(() => toast.error('Failed to load call prep.'))
        .finally(() => setLoading(false))
    }
  }, [open, orgId, contactId])

  const copyOpener = () => {
    if (!data?.suggestedOpening) return
    navigator.clipboard.writeText(data.suggestedOpening)
    setCopiedOpener(true)
    toast.success('Opening line copied!')
    setTimeout(() => setCopiedOpener(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500 text-white shadow-xs">
              <Phone className="size-4" />
            </div>
            <DialogTitle>AI Call Preparation Brief</DialogTitle>
          </div>
          <DialogDescription>
            Tactical talking points, objective, and objection handling for your call with{' '}
            <strong>{data?.contactName || 'the decision maker'}</strong> at{' '}
            <strong>{data?.organisationName}</strong>.
          </DialogDescription>
        </DialogHeader>

        {loading || !data ? (
          <DialogBody>
            <div className="p-12 text-center text-xs text-muted-foreground animate-pulse">
              <Sparkles className="size-5 mx-auto mb-2 text-primary animate-spin" />
              Generating personalized call brief...
            </div>
          </DialogBody>
        ) : (
          <>
            <DialogBody className="space-y-4">
              {/* Header summary & Objective */}
              <div className="rounded-xl border border-primary/30 bg-primary-soft/20 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">
                    {data.contactName} ({data.contactDesignation || 'Contact'})
                  </span>
                  <Badge tone="blue" size="sm">
                    Stage: {data.currentStage}
                  </Badge>
                </div>

                <div className="pt-1 text-xs">
                  <span className="font-semibold text-primary">🎯 Primary Call Objective: </span>
                  <span className="text-foreground">{data.recommendedObjective}</span>
                </div>
              </div>

              {/* Suggested Opening */}
              <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Suggested Opener
                  </span>
                  <Button variant="ghost" size="xs" onClick={copyOpener}>
                    {copiedOpener ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                    {copiedOpener ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <p className="text-xs font-mono text-foreground/90 bg-surface-muted/60 p-3 rounded-lg border border-border/50 leading-relaxed">
                  &ldquo;{data.suggestedOpening}&rdquo;
                </p>
              </div>

              {/* Talking Points */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Key Value Points
                </span>
                <div className="space-y-2">
                  {data.talkingPoints.map((tp, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 text-xs p-3 rounded-xl bg-surface border border-border"
                    >
                      <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-foreground/90 leading-relaxed">{tp}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Objections */}
              {data.objections?.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Objection Handling
                  </span>
                  <div className="space-y-2">
                    {data.objections.map((obj, i) => (
                      <div key={i} className="rounded-xl bg-surface border border-border p-3 text-xs space-y-1.5">
                        <div className="font-semibold text-rose-600 dark:text-rose-400">
                          If they say: &ldquo;{obj.objection}&rdquo;
                        </div>
                        <div className="text-muted-foreground pl-2.5 border-l-2 border-primary/50 leading-relaxed">
                          👉 Response: {obj.response}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </DialogBody>

            <DialogFooter>
              <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
                Close Brief
              </Button>
              <Button
                variant="primary"
                type="button"
                onClick={() => {
                  onOpenChange(false)
                  onStartCall?.()
                }}
                icon={<Phone className="size-4" />}
              >
                Log Call Now
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
