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
import { Phone, Mail, Linkedin, Calendar, StickyNote, Check, AlertTriangle, Clock, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { suggestFollowupDate, QUICK_NOTE_CHIPS } from '@/lib/outreach-cadence'

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

export interface LogActivityModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialType?: ActivityTypeTab
  initialOutcome?: string
  initialOrganisationId?: string
  initialContactId?: string
  initialNotes?: string
  initialEmailSubject?: string
  initialEmailUsed?: string
  initialPhoneNumberUsed?: string
  completedFollowUpId?: string
  startCallTimer?: boolean
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
  initialOutcome = '',
  initialOrganisationId = '',
  initialContactId = '',
  initialNotes = '',
  initialEmailSubject = '',
  initialEmailUsed = '',
  initialPhoneNumberUsed = '',
  completedFollowUpId,
  startCallTimer = false,
  organisationsList = [],
  onSuccess,
}: LogActivityModalProps) {
  const [type, setType] = React.useState<ActivityTypeTab>(initialType)
  const [organisationId, setOrganisationId] = React.useState(initialOrganisationId)
  const [contactId, setContactId] = React.useState(initialContactId)
  const [outcome, setOutcome] = React.useState(initialOutcome)
  const [notes, setNotes] = React.useState(initialNotes)
  const [nextFollowupDate, setNextFollowupDate] = React.useState('')
  const [followupTouched, setFollowupTouched] = React.useState(false)
  const [reminderEnabled, setReminderEnabled] = React.useState(true)

  // Channel-specific fields
  const [phoneNumberUsed, setPhoneNumberUsed] = React.useState(initialPhoneNumberUsed)
  const [emailSubject, setEmailSubject] = React.useState(initialEmailSubject)
  const [emailUsed, setEmailUsed] = React.useState(initialEmailUsed)
  const [meetingDate, setMeetingDate] = React.useState('')
  const [meetingLocation, setMeetingLocation] = React.useState('')

  // W4: Approximate Call Session Timer
  const [callDurationSeconds, setCallDurationSeconds] = React.useState(0)
  const [callTimerRunning, setCallTimerRunning] = React.useState(false)

  const [loading, setLoading] = React.useState(false)
  const [orgs, setOrgs] = React.useState<OrganisationOption[]>(organisationsList)
  const [loadingOrgs, setLoadingOrgs] = React.useState(false)
  const [contacts, setContacts] = React.useState<ContactOption[]>([])
  const [loadingContacts, setLoadingContacts] = React.useState(false)

  const outcomeSelectRef = React.useRef<HTMLSelectElement>(null)

  // Format timer into MM:SS
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Live timer tick for CALL activities
  React.useEffect(() => {
    if (!open || type !== 'CALL' || !callTimerRunning) return
    const interval = setInterval(() => {
      setCallDurationSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [open, type, callTimerRunning])

  // Reset & initialize when modal opens or initial props change
  React.useEffect(() => {
    if (!open) {
      setCallTimerRunning(false)
      setCallDurationSeconds(0)
      return
    }

    setType(initialType)
    setOrganisationId(initialOrganisationId)
    setContactId(initialContactId)
    const startingOutcome =
      initialOutcome || OUTCOMES_BY_TYPE[initialType]?.[0]?.value || ''
    setOutcome(startingOutcome)
    setNotes(initialNotes || '')
    setEmailSubject(initialEmailSubject || '')
    setEmailUsed(initialEmailUsed || '')
    setPhoneNumberUsed(initialPhoneNumberUsed || '')
    setFollowupTouched(false)
    setNextFollowupDate(suggestFollowupDate(startingOutcome))
    setCallDurationSeconds(0)
    setCallTimerRunning(Boolean(startCallTimer || initialType === 'CALL'))
  }, [
    open,
    initialType,
    initialOutcome,
    initialOrganisationId,
    initialContactId,
    initialNotes,
    initialEmailSubject,
    initialEmailUsed,
    initialPhoneNumberUsed,
    startCallTimer,
  ])

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
  }, [open, organisationId, initialContactId, phoneNumberUsed, emailUsed])

  // Handle contact selection & auto-populate details
  const handleContactSelect = (newContactId: string) => {
    setContactId(newContactId)
    const selected = contacts.find((c) => c.id === newContactId)
    if (selected) {
      if (selected.phone) setPhoneNumberUsed(selected.phone)
      if (selected.email) setEmailUsed(selected.email)
    }
  }

  // Auto set default outcome & suggestion when type tab changes
  const handleTypeChange = (newType: ActivityTypeTab) => {
    setType(newType)
    const defaultOutcome = OUTCOMES_BY_TYPE[newType][0]?.value || ''
    setOutcome(defaultOutcome)

    // W1: Re-suggest follow-up if user hasn't manually edited date
    if (!followupTouched) {
      setNextFollowupDate(suggestFollowupDate(defaultOutcome))
    }

    const selected = contacts.find((c) => c.id === contactId)
    if (selected) {
      if (newType === 'CALL' && selected.phone && !phoneNumberUsed) {
        setPhoneNumberUsed(selected.phone)
      }
      if (newType === 'EMAIL' && selected.email && !emailUsed) {
        setEmailUsed(selected.email)
      }
    }

    if (newType === 'CALL') {
      setCallTimerRunning(true)
    } else {
      setCallTimerRunning(false)
    }
  }

  // W1: Auto follow-up suggestion on outcome change
  const handleOutcomeChange = (newOutcome: string) => {
    setOutcome(newOutcome)
    if (!followupTouched) {
      setNextFollowupDate(suggestFollowupDate(newOutcome))
    }
  }

  // W1: Reset to suggested cadence
  const handleResetToSuggestion = () => {
    setFollowupTouched(false)
    setNextFollowupDate(suggestFollowupDate(outcome))
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

  // Core execution handler supporting both Save Activity and Log & Next
  const executeSubmit = async (keepOpen: boolean) => {
    if (!organisationId) {
      toast.error('Please select an organisation.')
      return
    }

    setLoading(true)
    try {
      let finalNotes = notes.trim()

      // W4: If timer ran >= 5 seconds, append approximate duration
      if (type === 'CALL' && callDurationSeconds >= 5) {
        const timerSnippet = `Approximate call session duration: ~${formatTimer(callDurationSeconds)}`
        if (!finalNotes.includes('Approximate call session duration')) {
          finalNotes = finalNotes ? `${finalNotes}\n${timerSnippet}` : timerSnippet
        }
      }

      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organisationId,
          contactId: contactId || undefined,
          type,
          outcome,
          notes: finalNotes || undefined,
          nextFollowupDate: nextFollowupDate || undefined, // Clean YYYY-MM-DD
          phoneNumberUsed: phoneNumberUsed || undefined,
          emailSubject: emailSubject || undefined,
          emailUsed: emailUsed || undefined,
          meetingDate: type === 'MEETING' ? (meetingDate || new Date().toISOString().slice(0, 16)) : undefined,
          meetingLocation: meetingLocation || undefined,
          completedFollowUpId: completedFollowUpId || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        toast.error(data.error || 'Failed to log activity.')
        setLoading(false)
        return
      }

      toast.success(data.message || 'Activity logged successfully!')
      onSuccess?.()

      if (!keepOpen) {
        // Close modal and reset
        onOpenChange(false)
        setNotes('')
        setNextFollowupDate('')
        setFollowupTouched(false)
        setCallDurationSeconds(0)
        setCallTimerRunning(false)
      } else {
        // W2: Log & Next — preserve organisationId, contactId, and type
        const defaultOutcome = OUTCOMES_BY_TYPE[type][0]?.value || ''
        setOutcome(defaultOutcome)
        setNotes('')
        setMeetingLocation('')
        setFollowupTouched(false)
        setNextFollowupDate(suggestFollowupDate(defaultOutcome))
        setCallDurationSeconds(0)
        setCallTimerRunning(type === 'CALL')
        setTimeout(() => {
          outcomeSelectRef.current?.focus()
        }, 50)
      }
    } catch {
      toast.error('Network error saving activity.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    executeSubmit(false)
  }

  // Keyboard navigation: Ctrl/Cmd+Enter for Save, Shift+Enter for Log & Next
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      executeSubmit(false)
      return
    }
    if (e.key === 'Enter' && e.shiftKey && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      e.preventDefault()
      executeSubmit(true)
      return
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 w-full">
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

            {/* W4: Live approximate call session timer badge */}
            {type === 'CALL' && callDurationSeconds > 0 && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-mono font-medium text-blue-600 dark:text-blue-400 shrink-0">
                <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span>Approx call: ~{formatTimer(callDurationSeconds)}</span>
              </div>
            )}
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
                  <p className="mt-0.5 opacity-90">
                    Coordinate internally before performing outreach to avoid duplicated work or conflicting communication.
                  </p>
                </div>
              </div>
            )}

            {/* Channel Tabs */}
            <div className="flex rounded-xl bg-surface-muted/60 p-1 border border-border">
              <button
                type="button"
                onClick={() => handleTypeChange('CALL')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer',
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
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer',
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
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer',
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
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer',
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
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer',
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
                          {c.isDecisionMaker ? ' ★ (Decision Maker)' : ''}
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
                    ★ Decision Maker
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
                  ref={outcomeSelectRef}
                  value={outcome}
                  onChange={(e) => handleOutcomeChange(e.target.value)}
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

            {/* Notes & Quick Note Chips */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Notes / Conversation Summary / Outreach Copy
                </label>
              </div>

              {/* W1: Quick Note Chips */}
              {QUICK_NOTE_CHIPS[type] && QUICK_NOTE_CHIPS[type].length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mr-0.5">
                    Quick Chips:
                  </span>
                  {QUICK_NOTE_CHIPS[type].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() =>
                        setNotes((prev) => (prev.trim() ? `${prev.trim()}\n${chip}` : chip))
                      }
                      className="inline-flex items-center rounded-md border border-border/70 bg-surface-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:border-primary/50 hover:bg-surface-muted hover:text-foreground transition-colors cursor-pointer"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              )}

              <textarea
                rows={4}
                placeholder="What was discussed? Next requirements, objections, or commitments..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface p-3 text-sm text-foreground shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono text-xs resize-y min-h-[80px]"
              />
            </div>

            {/* Next Follow-up & Reminder (W1 Auto Suggestions) */}
            <div className="rounded-xl border border-border/80 bg-surface-muted/40 p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-foreground">Next Follow-up Date</label>
                    {followupTouched ? (
                      <button
                        type="button"
                        onClick={handleResetToSuggestion}
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium cursor-pointer"
                      >
                        <RotateCcw className="size-2.5" /> Reset to suggestion
                      </button>
                    ) : nextFollowupDate ? (
                      <span className="text-[10px] font-mono text-muted-foreground bg-surface px-1.5 py-0.2 rounded border border-border">
                        Auto-cadence
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">
                        No follow-up suggested
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Schedule when the next outreach or call-back is due.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={nextFollowupDate}
                    onChange={(e) => {
                      setNextFollowupDate(e.target.value)
                      setFollowupTouched(true)
                    }}
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

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-[11px] text-muted-foreground hidden sm:flex items-center gap-2">
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">
                  Ctrl+Enter
                </kbd>{' '}
                Save
              </span>
              <span>&bull;</span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">
                  Shift+Enter
                </kbd>{' '}
                Log &amp; Next
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
              <Button
                variant="ghost"
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              {/* W2: Log & Next button */}
              <Button
                variant="outline"
                type="button"
                disabled={loading}
                onClick={() => executeSubmit(true)}
                title="Save this activity and immediately log another for the same contact (Shift+Enter)"
              >
                Log &amp; Next
              </Button>
              {/* Primary: Save Activity */}
              <Button
                variant="primary"
                type="submit"
                loading={loading}
                icon={<Check className="size-4" />}
                title="Save activity and close (Ctrl+Enter)"
              >
                Save Activity
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
