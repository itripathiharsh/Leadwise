'use client'

import * as React from 'react'
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
import { Field, Input } from '@/components/ui/field'
import { Phone, Mail, Linkedin, Calendar, StickyNote, Check, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export type ActivityTypeTab = 'CALL' | 'EMAIL' | 'LINKEDIN' | 'MEETING' | 'NOTE'

interface ContactOption {
  id: string
  name: string
  designation?: string | null
  department?: string | null
  phone?: string | null
  email?: string | null
  linkedinUrl?: string | null
  isDecisionMaker?: boolean
}

interface OrganisationOption {
  id: string
  name: string
  category?: string | null
  domain?: string | null
  assignedTo?: { id: string; name: string; avatarColor?: string } | null
  assignedToId?: string | null
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
  const [meetingDate, setMeetingDate] = React.useState('')
  const [meetingLocation, setMeetingLocation] = React.useState('')

  const [loading, setLoading] = React.useState(false)
  const [orgs, setOrgs] = React.useState<OrganisationOption[]>(organisationsList)
  const [loadingOrgs, setLoadingOrgs] = React.useState(false)
  const [contacts, setContacts] = React.useState<ContactOption[]>([])
  const [loadingContacts, setLoadingContacts] = React.useState(false)

  // Reset when initial props change
  React.useEffect(() => {
    setType(initialType)
    setOrganisationId(initialOrganisationId)
    setContactId(initialContactId)
    setOutcome(OUTCOMES_BY_TYPE[initialType][0]?.value || '')
  }, [initialType, initialOrganisationId, initialContactId, open])

  // Load existing organisations whenever modal opens
  React.useEffect(() => {
    if (!open) return

    setLoadingOrgs(true)
    fetch('/api/organisations?pageSize=100&sort=name')
      .then((r) => r.json())
      .then((d) => {
        if (d.items && Array.isArray(d.items)) {
          setOrgs(d.items)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingOrgs(false))
  }, [open])

  // If initialOrganisationId is given, ensure it exists in orgs
  React.useEffect(() => {
    if (!open || !initialOrganisationId) return
    if (!orgs.some((o) => o.id === initialOrganisationId)) {
      fetch(`/api/organisations/${initialOrganisationId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.organisation) {
            setOrgs((prev) =>
              prev.some((o) => o.id === d.organisation.id) ? prev : [d.organisation, ...prev],
            )
          }
        })
        .catch(() => {})
    }
  }, [open, initialOrganisationId, orgs])

  // Fetch all people/contacts associated with the selected organisation
  React.useEffect(() => {
    if (!open || !organisationId) {
      setContacts([])
      setLoadingContacts(false)
      return
    }

    setLoadingContacts(true)
    fetch(`/api/contacts?organisationId=${encodeURIComponent(organisationId)}&pageSize=100&sort=name`)
      .then((r) => r.json())
      .then((d) => {
        const items: ContactOption[] = Array.isArray(d.items) ? d.items : []
        setContacts(items)

        // If an initialContactId was given or already selected, match contact
        if (initialContactId && items.some((c) => c.id === initialContactId)) {
          setContactId(initialContactId)
          const matched = items.find((c) => c.id === initialContactId)
          if (matched) {
            if (matched.phone && !phoneNumberUsed) setPhoneNumberUsed(matched.phone)
            if (matched.email && !emailUsed) setEmailUsed(matched.email)
          }
        }
      })
      .catch(() => {
        setContacts([])
      })
      .finally(() => {
        setLoadingContacts(false)
      })
  }, [open, organisationId, initialContactId])

  // Handle contact selection & auto-populate details
  const handleContactSelect = (newContactId: string) => {
    setContactId(newContactId)
    const selected = contacts.find((c) => c.id === newContactId)
    if (selected) {
      if (selected.phone) setPhoneNumberUsed(selected.phone)
      if (selected.email) setEmailUsed(selected.email)
    }
  }

  // Auto set default outcome when type tab changes
  const handleTypeChange = (newType: ActivityTypeTab) => {
    setType(newType)
    setOutcome(OUTCOMES_BY_TYPE[newType][0]?.value || '')
    const selected = contacts.find((c) => c.id === contactId)
    if (selected) {
      if (newType === 'CALL' && selected.phone && !phoneNumberUsed) {
        setPhoneNumberUsed(selected.phone)
      }
      if (newType === 'EMAIL' && selected.email && !emailUsed) {
        setEmailUsed(selected.email)
      }
    }
  }

  const [currentUser, setCurrentUser] = React.useState<{ id: string; name: string } | null>(null)

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setCurrentUser(d.user)
      })
      .catch(() => {})
  }, [])

  const selectedOrg = orgs.find((o) => o.id === organisationId)
  const selectedContact = contacts.find((c) => c.id === contactId)
  const isAssignedToOther = Boolean(
    selectedOrg?.assignedTo &&
    currentUser &&
    selectedOrg.assignedTo.id !== currentUser.id
  )

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
          meetingDate: type === 'MEETING' ? (meetingDate || new Date().toISOString().slice(0, 16)) : undefined,
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
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Phone className="size-5" />
            </div>
            <div>
              <DialogTitle>Log Outreach Activity</DialogTitle>
              <DialogDescription>
                Record interactions to update the timeline, organisation status, and next follow-up.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <DialogBody className="space-y-4">
            {/* Warning if organisation is assigned to another team member */}
            {isAssignedToOther && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <span>Assigned to {selectedOrg?.assignedTo?.name}</span>
                    <span className="text-[10px] uppercase font-semibold bg-amber-500/20 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded">
                      Another Member&apos;s Account
                    </span>
                  </div>
                  <div className="text-[11px] mt-0.5 leading-relaxed text-muted-foreground">
                    This organisation is actively assigned to <strong className="text-foreground">{selectedOrg?.assignedTo?.name}</strong>. Your outreach will be logged under your name, but please coordinate to avoid duplicate communication.
                  </div>
                </div>
              </div>
            )}

            {/* Channel Type Selector Tabs */}
            <div className="flex rounded-xl border border-border bg-muted/60 p-1 gap-1">
              <button
                type="button"
                onClick={() => handleTypeChange('CALL')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all',
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
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all',
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
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all',
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
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all',
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
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all',
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
                  <div className="flex h-10 items-center justify-between font-semibold text-sm px-3 bg-muted/40 rounded-lg border border-border">
                    <span className="truncate">{selectedOrg.name}</span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground ml-2 shrink-0 bg-background px-1.5 py-0.5 rounded border border-border">
                      Selected
                    </span>
                  </div>
                ) : (
                  <select
                    value={organisationId}
                    onChange={(e) => {
                      setOrganisationId(e.target.value)
                      setContactId('')
                    }}
                    required
                    disabled={loadingOrgs && orgs.length === 0}
                    className="h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">
                      {loadingOrgs ? 'Loading organisations...' : 'Select Organisation...'}
                    </option>
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
                  onChange={(e) => handleContactSelect(e.target.value)}
                  disabled={!organisationId || loadingContacts}
                  className="h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {!organisationId ? (
                    <option value="">Select an organisation first</option>
                  ) : loadingContacts ? (
                    <option value="">Loading associated contacts...</option>
                  ) : contacts.length === 0 ? (
                    <option value="">No contacts found (General outreach)</option>
                  ) : (
                    <>
                      <option value="">General outreach (No specific person)</option>
                      {contacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                          {c.designation ? ` — ${c.designation}` : ''}
                          {c.isDecisionMaker ? ' ⭐ (Decision Maker)' : ''}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </Field>
            </div>

            {/* Selected Contact Quick Badges */}
            {selectedContact && (
              <div className="flex flex-wrap items-center gap-2 -mt-2 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50">
                <span className="font-medium text-foreground">{selectedContact.name}</span>
                {selectedContact.designation && (
                  <span className="text-muted-foreground">({selectedContact.designation})</span>
                )}
                {selectedContact.isDecisionMaker && (
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    ⭐ Decision Maker
                  </span>
                )}
                {selectedContact.phone && (
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] ml-auto">
                    <Phone className="size-3 text-blue-500" /> {selectedContact.phone}
                  </span>
                )}
                {selectedContact.email && (
                  <span className="inline-flex items-center gap-1 text-[11px]">
                    <Mail className="size-3 text-indigo-500" /> {selectedContact.email}
                  </span>
                )}
              </div>
            )}

            {/* Outcome & Channel specifics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Interaction Outcome" required>
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  required
                  className="h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                    className="h-10"
                  />
                </Field>
              )}

              {type === 'EMAIL' && (
                <Field label="Email Subject">
                  <Input
                    placeholder="Partnership Introduction — Leadwise"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="h-10"
                  />
                </Field>
              )}

              {type === 'MEETING' && (
                <>
                  <Field label="Meeting Date & Time" required>
                    <Input
                      type="datetime-local"
                      value={meetingDate || new Date().toISOString().slice(0, 16)}
                      onChange={(e) => setMeetingDate(e.target.value)}
                      required
                      className="h-10"
                    />
                  </Field>
                  <Field label="Meeting Link / Location">
                    <Input
                      placeholder="Google Meet / Zoom / Office"
                      value={meetingLocation}
                      onChange={(e) => setMeetingLocation(e.target.value)}
                      className="h-10"
                    />
                  </Field>
                </>
              )}
            </div>

            {/* Notes */}
            <Field label="Notes / Conversation Summary / Outreach Copy">
              <textarea
                rows={4}
                placeholder="What was discussed? Next requirements, objections, or commitments..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface p-3 text-sm text-foreground shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono text-xs resize-y min-h-[80px]"
              />
            </Field>

            {/* Next Follow-up & Reminder */}
            <div className="rounded-xl border border-border/80 bg-surface-muted/40 p-3.5 space-y-3">
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
                    className="h-9 rounded-lg border border-border bg-surface px-3 py-1 text-xs text-foreground shadow-xs focus:border-primary focus:outline-none"
                  />

                  {nextFollowupDate && (
                    <label className="flex items-center gap-1.5 text-xs font-medium text-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={reminderEnabled}
                        onChange={(e) => setReminderEnabled(e.target.checked)}
                        className="size-4 rounded border-border text-primary focus:ring-primary"
                      />
                      Reminder
                    </label>
                  )}
                </div>
              </div>
            </div>
          </DialogBody>

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
