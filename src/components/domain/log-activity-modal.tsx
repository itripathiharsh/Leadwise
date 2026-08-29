'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Phone, Mail, Linkedin, Calendar, StickyNote, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export type ActivityTypeTab = 'CALL' | 'EMAIL' | 'LINKEDIN' | 'MEETING' | 'NOTE'

interface ContactOption {
  id: string
  name: string
  designation?: string | null
  phone?: string | null
  email?: string | null
  linkedinUrl?: string | null
}

interface OrganisationOption {
  id: string
  name: string
  contacts?: ContactOption[]
}

interface LogActivityModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialType?: ActivityTypeTab
  initialOrganisationId?: string
  initialContactId?: string
  organisationsList?: OrganisationOption[]
  onSuccess?: () => void
}

const OUTCOMES_BY_TYPE: Record<
  ActivityTypeTab,
  Array<{ value: string; label: string }>
> = {
  CALL: [
    { value: 'CONNECTED', label: 'Connected / Answered' },
    { value: 'INTERESTED', label: 'Interested in Partnership' },
    { value: 'CALL_BACK', label: 'Requested Call Back' },
    { value: 'NO_ANSWER', label: 'No Answer / Rang Out' },
    { value: 'BUSY', label: 'Busy / Disconnected' },
    { value: 'WRONG_NUMBER', label: 'Wrong Number' },
    { value: 'NOT_INTERESTED', label: 'Not Interested' },
    { value: 'OTHER', label: 'Other' },
  ],
  EMAIL: [
    { value: 'SENT', label: 'Email Sent' },
    { value: 'REPLIED', label: 'Replied / Responded' },
    { value: 'INTERESTED', label: 'Interested in Proposal' },
    { value: 'BOUNCED', label: 'Bounced / Bad Email' },
    { value: 'NO_RESPONSE', label: 'No Response' },
    { value: 'NOT_INTERESTED', label: 'Not Interested' },
  ],
  LINKEDIN: [
    { value: 'CONNECTION_SENT', label: 'Connection Request Sent' },
    { value: 'CONNECTION_ACCEPTED', label: 'Connection Accepted' },
    { value: 'MESSAGE_SENT', label: 'InMail / Message Sent' },
    { value: 'REPLIED', label: 'Message Replied' },
    { value: 'PROFILE_FOUND', label: 'Profile Identified' },
    { value: 'INTERESTED', label: 'Interested' },
    { value: 'NOT_INTERESTED', label: 'Not Interested' },
  ],
  MEETING: [
    { value: 'MEETING_SCHEDULED', label: 'Meeting Scheduled' },
    { value: 'MEETING_COMPLETED', label: 'Meeting Completed' },
    { value: 'INTERESTED', label: 'Interested (Post-Meeting)' },
    { value: 'RESCHEDULED', label: 'Rescheduled' },
    { value: 'NO_SHOW', label: 'No Show / Missed' },
    { value: 'NOT_INTERESTED', label: 'Not Interested' },
  ],
  NOTE: [
    { value: 'LOGGED', label: 'Note Added' },
    { value: 'COMPLETED', label: 'Task Completed' },
  ],
}

export function LogActivityModal({
  open,
  onOpenChange,
  initialType = 'CALL',
  initialOrganisationId = '',
  initialContactId = '',
  organisationsList = [],
  onSuccess,
}: LogActivityModalProps) {
  const [type, setType] = React.useState<ActivityTypeTab>(initialType)
  const [organisationId, setOrganisationId] = React.useState(initialOrganisationId)
  const [contactId, setContactId] = React.useState(initialContactId)
  const [outcome, setOutcome] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [nextFollowupDate, setNextFollowupDate] = React.useState('')
  const [reminderEnabled, setReminderEnabled] = React.useState(true)

  // Channel-specific fields
  const [phoneNumberUsed, setPhoneNumberUsed] = React.useState('')
  const [emailSubject, setEmailSubject] = React.useState('')
  const [emailUsed, setEmailUsed] = React.useState('')
  const [meetingLocation, setMeetingLocation] = React.useState('')

  const [loading, setLoading] = React.useState(false)
  const [orgs, setOrgs] = React.useState<OrganisationOption[]>(organisationsList)
  const [templates, setTemplates] = React.useState<any[]>([])

  // Reset when initial props change
  React.useEffect(() => {
    setType(initialType)
    setOrganisationId(initialOrganisationId)
    setContactId(initialContactId)
    setOutcome(OUTCOMES_BY_TYPE[initialType][0]?.value || '')
  }, [initialType, initialOrganisationId, initialContactId, open])

  // Load organisations list and templates if not provided
  React.useEffect(() => {
    if (open) {
      if (orgs.length === 0) {
        fetch('/api/search?take=50')
          .then((r) => r.json())
          .then((d) => {
            if (d.organisations) setOrgs(d.organisations)
          })
          .catch(() => {})
      }

      fetch('/api/templates')
        .then((r) => r.json())
        .then((d) => {
          if (d.templates) setTemplates(d.templates)
        })
        .catch(() => {})
    }
  }, [open, orgs.length])

  // Auto set default outcome when type tab changes
  const handleTypeChange = (newType: ActivityTypeTab) => {
    setType(newType)
    setOutcome(OUTCOMES_BY_TYPE[newType][0]?.value || '')
  }

  const selectedOrg = orgs.find((o) => o.id === organisationId)
  const contactOptions = selectedOrg?.contacts || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organisationId) {
      toast.error('Please select an organisation.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organisationId,
          contactId: contactId || undefined,
          type,
          outcome,
          notes: notes.trim() || undefined,
          nextFollowupDate: nextFollowupDate ? `${nextFollowupDate}T09:00` : undefined,
          phoneNumberUsed: phoneNumberUsed || undefined,
          emailSubject: emailSubject || undefined,
          emailUsed: emailUsed || undefined,
          meetingLocation: meetingLocation || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        toast.error(data.error || 'Failed to log activity.')
        setLoading(false)
        return
      }

      toast.success(data.message || 'Activity logged successfully!')
      onOpenChange(false)
      // Reset form
      setNotes('')
      setNextFollowupDate('')
      onSuccess?.()
    } catch {
      toast.error('Network error saving activity.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Log Outreach Activity</DialogTitle>
          <DialogDescription>
            Record interactions to update the timeline, organisation status, and next follow-up.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-3">
          {/* Channel Type Selector Tabs */}
          <div className="flex rounded-lg border border-border bg-muted/60 p-1 gap-1">
            <button
              type="button"
              onClick={() => handleTypeChange('CALL')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all',
                type === 'CALL'
                  ? 'bg-surface text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Phone className="size-3.5 text-blue-500" />
              Call
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('EMAIL')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all',
                type === 'EMAIL'
                  ? 'bg-surface text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Mail className="size-3.5 text-indigo-500" />
              Email
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('LINKEDIN')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all',
                type === 'LINKEDIN'
                  ? 'bg-surface text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Linkedin className="size-3.5 text-sky-500" />
              LinkedIn
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('MEETING')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all',
                type === 'MEETING'
                  ? 'bg-surface text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Calendar className="size-3.5 text-violet-500" />
              Meeting
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('NOTE')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all',
                type === 'NOTE'
                  ? 'bg-surface text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <StickyNote className="size-3.5 text-slate-500" />
              Note
            </button>
          </div>

          {/* Organisation & Contact Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Organisation" required>
              {initialOrganisationId && selectedOrg ? (
                <div className="font-semibold text-sm px-3 py-2 bg-surface rounded-md border border-border">
                  {selectedOrg.name}
                </div>
              ) : (
                <select
                  value={organisationId}
                  onChange={(e) => {
                    setOrganisationId(e.target.value)
                    setContactId('')
                  }}
                  required
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select Organisation...</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <Field label="Contact Person (Optional)">
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">No specific contact (General)</option>
                {contactOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.designation ? `(${c.designation})` : ''}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Outcome & Channel specifics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Interaction Outcome" required>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                required
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground shadow-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {OUTCOMES_BY_TYPE[type].map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            {type === 'CALL' && (
              <Field label="Phone Number Used">
                <Input
                  placeholder="e.g. +91 98765 43210"
                  value={phoneNumberUsed}
                  onChange={(e) => setPhoneNumberUsed(e.target.value)}
                />
              </Field>
            )}

            {type === 'EMAIL' && (
              <Field label="Email Subject">
                <Input
                  placeholder="Partnership Introduction — Leadwise"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </Field>
            )}

            {type === 'MEETING' && (
              <Field label="Meeting Link / Location">
                <Input
                  placeholder="Google Meet / Zoom / Office"
                  value={meetingLocation}
                  onChange={(e) => setMeetingLocation(e.target.value)}
                />
              </Field>
            )}
          </div>

          {/* Template Quick Insert */}
          {templates.length > 0 && (
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs font-semibold text-muted-foreground">Insert Outreach Template:</span>
              <select
                onChange={(e) => {
                  const t = templates.find((tpl) => tpl.id === e.target.value)
                  if (t) {
                    if (t.subject) setEmailSubject(t.subject)
                    let text = t.body
                    if (selectedOrg) text = text.replaceAll('{{organisation_name}}', selectedOrg.name)
                    const selContact = contactOptions.find((c) => c.id === contactId)
                    if (selContact) {
                      text = text.replaceAll('{{contact_name}}', selContact.name)
                      text = text.replaceAll('{{contact_designation}}', selContact.designation || '')
                    }
                    setNotes(text)
                    toast.info(`Inserted template "${t.title}"`)
                  }
                }}
                defaultValue=""
                className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-foreground font-medium shadow-xs focus:border-primary focus:outline-none"
              >
                <option value="">Select a template to insert...</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.title} ({tpl.category})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <Field label="Notes / Conversation Summary / Outreach Copy">
            <textarea
              rows={4}
              placeholder="What was discussed? Next requirements, objections, or commitments..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-border bg-surface p-3 text-sm text-foreground shadow-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs"
            />
          </Field>

          {/* Next Follow-up & Reminder */}
          <div className="rounded-lg border border-border/80 bg-surface-muted/40 p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <label className="text-xs font-semibold text-foreground">Next Follow-up Date</label>
                <p className="text-[11px] text-muted-foreground">
                  Schedule when the next outreach or call-back is due.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={nextFollowupDate}
                  onChange={(e) => setNextFollowupDate(e.target.value)}
                  className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-foreground shadow-xs focus:border-primary focus:outline-none"
                />

                {nextFollowupDate && (
                  <label className="flex items-center gap-1.5 text-xs font-medium text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={reminderEnabled}
                      onChange={(e) => setReminderEnabled(e.target.checked)}
                      className="size-3.5 rounded border-border text-primary focus:ring-primary"
                    />
                    Reminder
                  </label>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={loading}
              icon={<Check className="size-4" />}
            >
              Save Activity
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
