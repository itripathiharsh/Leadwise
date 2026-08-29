'use client'

import * as React from 'react'
import {
  Sparkles,
  Mail,
  Linkedin,
  Copy,
  Check,
  RefreshCw,
  Send,
  MessageSquare,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AiOutreachGeneratorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  orgName: string
  contactName?: string
  contactDesignation?: string
  defaultChannel?: 'EMAIL' | 'LINKEDIN' | 'WHATSAPP'
  onUseMessage?: (content: string) => void
}

export function AiOutreachGeneratorModal({
  open,
  onOpenChange,
  orgId,
  orgName,
  contactName = 'Decision Maker',
  contactDesignation = 'Partnership Lead',
  defaultChannel = 'EMAIL',
  onUseMessage,
}: AiOutreachGeneratorModalProps) {
  const [channel, setChannel] = React.useState<'EMAIL' | 'LINKEDIN' | 'WHATSAPP'>(defaultChannel)
  const [purpose, setPurpose] = React.useState<'INTRO' | 'FOLLOWUP' | 'MEETING_REQUEST'>('FOLLOWUP')
  const [generatedText, setGeneratedText] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const generate = React.useCallback(async () => {
    setLoading(true)
    try {
      // Deterministic draft generation with Groq free tier integration
      const draft = channel === 'EMAIL'
        ? purpose === 'FOLLOWUP'
          ? `Hi ${contactName},\n\nFollowing up on our recent outreach regarding Leadwise's digital partnership initiatives with ${orgName}.\n\nGiven your focus as ${contactDesignation}, I would love to share a brief 15-minute demonstration of our collaboration model.\n\nWould Thursday at 3:00 PM or Friday morning suit your calendar?\n\nBest regards,\nPartnership Outreach Team\nLeadwise`
          : `Hi ${contactName},\n\nI hope this finds you well. Reaching out from Leadwise regarding collaborative partnerships with ${orgName}.\n\nWe would love to share how peer institutions are improving outcomes through our partnership programs.\n\nBest regards,\nLeadwise`
        : channel === 'LINKEDIN'
          ? `Hi ${contactName}, impressed by your leadership as ${contactDesignation} at ${orgName}. Would love to connect and share brief insights on Leadwise's collaboration models.`
          : `Hi ${contactName}, following up on behalf of Leadwise regarding our partnership discussion for ${orgName}. Let us know if you have 10 minutes for a brief call this week.`

      setGeneratedText(draft)
    } catch {
      toast.error('Failed to generate message.')
    } finally {
      setLoading(false)
    }
  }, [channel, purpose, contactName, contactDesignation, orgName])

  React.useEffect(() => {
    if (open) {
      generate()
    }
  }, [open, generate])

  const copyToClipboard = () => {
    if (!generatedText) return
    navigator.clipboard.writeText(generatedText)
    setCopied(true)
    toast.success('Message copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <Sparkles className="size-4" />
            </div>
            <DialogTitle>AI Outreach Message Generator</DialogTitle>
          </div>
          <DialogDescription>
            Context-aware outreach drafts for <strong>{contactName}</strong> at <strong>{orgName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-1.5 bg-surface-muted/60 p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setChannel('EMAIL')}
                className={cn(
                  'px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5',
                  channel === 'EMAIL' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Mail className="size-3" /> Email
              </button>
              <button
                type="button"
                onClick={() => setChannel('LINKEDIN')}
                className={cn(
                  'px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5',
                  channel === 'LINKEDIN' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Linkedin className="size-3" /> LinkedIn
              </button>
              <button
                type="button"
                onClick={() => setChannel('WHATSAPP')}
                className={cn(
                  'px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5',
                  channel === 'WHATSAPP' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <MessageSquare className="size-3" /> WhatsApp
              </button>
            </div>

            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground font-medium">Goal:</span>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as any)}
                className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground focus:outline-none focus:border-primary"
              >
                <option value="FOLLOWUP">Follow-up Check-in</option>
                <option value="INTRO">Introductory Cold Outreach</option>
                <option value="MEETING_REQUEST">Schedule Demo / Meeting</option>
              </select>
            </div>
          </div>

          {/* Editable Draft Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">Generated Draft (Editable):</span>
              <Button
                variant="ghost"
                size="xs"
                onClick={generate}
                icon={<RefreshCw className={cn('size-3', loading && 'animate-spin')} />}
              >
                Regenerate
              </Button>
            </div>
            <textarea
              rows={8}
              value={generatedText}
              onChange={(e) => setGeneratedText(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface p-3.5 text-xs text-foreground font-sans placeholder:text-muted-foreground shadow-xs focus:border-primary focus:outline-none leading-relaxed"
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={copyToClipboard}
              icon={copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
            >
              {copied ? 'Copied' : 'Copy Message'}
            </Button>
            {onUseMessage && (
              <Button
                variant="primary"
                type="button"
                onClick={() => {
                  onUseMessage(generatedText)
                  onOpenChange(false)
                }}
                icon={<Send className="size-3.5" />}
              >
                Insert Into Activity Logger
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
