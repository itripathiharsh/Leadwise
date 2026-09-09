'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building2,
  Phone,
  Mail,
  Linkedin,
  Calendar,
  StickyNote,
  User,
  Plus,
  Clock,
  ExternalLink,
  Globe,
  MapPin,
  ShieldAlert,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { LogActivityModal, type ActivityTypeTab } from '@/components/domain/log-activity-modal'
import { CreateContactModal } from '@/components/domain/create-contact-modal'
import { MergeOrganisationDialog } from '@/components/domain/merge-dialog'
import { AiLeadIntelligenceCard } from '@/components/domain/ai-lead-intelligence-card'
import { CallPrepDialog } from '@/components/domain/call-prep-dialog'
import { CommentsFeed } from '@/components/domain/comments-feed'
import { formatDateTime, formatDate } from '@/lib/dates'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function OrganisationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params.id as string

  const [loading, setLoading] = React.useState(true)
  const [data, setData] = React.useState<any>(null)
  const [activeTab, setActiveTab] = React.useState<'timeline' | 'contacts' | 'followups' | 'notes' | 'overview'>('timeline')

  // Modals
  const [logModalOpen, setLogModalOpen] = React.useState(false)
  const [logType, setLogType] = React.useState<ActivityTypeTab>('CALL')
  const [selectedContactId, setSelectedContactId] = React.useState<string>('')
  const [createContactOpen, setCreateContactOpen] = React.useState(false)
  const [mergeModalOpen, setMergeModalOpen] = React.useState(false)
  const [callPrepOpen, setCallPrepOpen] = React.useState(false)

  const fetchDetails = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/organisations/${orgId}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      } else {
        toast.error('Failed to load organisation details.')
      }
    } catch {
      toast.error('Network error loading organisation.')
    } finally {
      setLoading(false)
    }
  }, [orgId])

  React.useEffect(() => {
    if (orgId) fetchDetails()
  }, [orgId, fetchDetails])

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/organisations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        toast.success(`Status updated to ${newStatus}`)
        fetchDetails()
      } else {
        toast.error('Failed to update status.')
      }
    } catch {
      toast.error('Network error updating status.')
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

  const openLog = (type: ActivityTypeTab, contactId?: string) => {
    if (data?.organisation?.assignedTo && currentUser && data.organisation.assignedTo.id !== currentUser.id) {
      toast.warning(`Note: ${data.organisation.name} is assigned to ${data.organisation.assignedTo.name}. Coordinate before outreach.`)
    }
    setLogType(type)
    if (contactId) setSelectedContactId(contactId)
    setLogModalOpen(true)
  }

  if (loading && !data) {
    return (
      <div className="flex h-96 items-center justify-center p-8 text-xs text-muted-foreground">
        Loading organisation profile...
      </div>
    )
  }

  if (!data?.organisation) {
    return (
      <div className="p-12 text-center space-y-3">
        <Building2 className="size-8 mx-auto text-muted-foreground/60" />
        <p className="font-semibold text-sm">Organisation not found</p>
        <Link href="/organisations">
          <Button variant="outline" size="sm">
            Back to Organisations
          </Button>
        </Link>
      </div>
    )
  }

  const org = data.organisation
  const activities = data.activities || []
  const followups = data.followups || []
  const contacts = org.contacts || []

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Top Breadcrumb & Back */}
      <div className="flex items-center justify-between">
        <Link
          href="/organisations"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to Organisations
        </Link>

        <Button
          variant="outline"
          size="xs"
          onClick={fetchDetails}
          icon={<RefreshCw className={cn('size-3', loading && 'animate-spin')} />}
        >
          Refresh
        </Button>
      </div>

      {/* Warning when viewing an organisation assigned to someone else */}
      {currentUser && org.assignedTo && org.assignedTo.id !== currentUser.id && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-sm text-amber-800 dark:text-amber-300">
                Assigned Account Warning:
              </span>{' '}
              <span className="text-muted-foreground">
                This organisation is actively assigned to <strong className="text-foreground">{org.assignedTo.name}</strong>. Please coordinate with them before placing outreach calls or sending emails.
              </span>
            </div>
          </div>
          <Badge tone="amber" size="sm" className="shrink-0 font-semibold">
            Managed by {org.assignedTo.name}
          </Badge>
        </div>
      )}

      {/* Organisation Profile Header Card */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{org.name}</h1>
              <Badge
                tone={
                  org.priority === 'HIGH'
                    ? 'rose'
                    : org.priority === 'MEDIUM'
                      ? 'amber'
                      : 'slate'
                }
                size="sm"
              >
                {org.priority} Priority
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {org.category && <span>{org.category}</span>}
              {org.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" /> {org.location}
                </span>
              )}
              {org.website && (
                <a
                  href={org.website.startsWith('http') ? org.website : `https://${org.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Globe className="size-3" /> {org.domain || org.website}
                  <ExternalLink className="size-2.5" />
                </a>
              )}
            </div>
          </div>

          {/* Status Progression Selector & Assignee */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1 text-right">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Pipeline Stage
              </label>
              <select
                value={org.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs focus:border-primary focus:outline-none"
              >
                <option value="NEW">New</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="CONTACTED">Contacted</option>
                <option value="RESPONDED">Responded</option>
                <option value="INTERESTED">Interested</option>
                <option value="MEETING">Meeting</option>
                <option value="PARTNERSHIP">Partnership</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Assignee
              </label>
              {org.assignedTo ? (
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-muted/60 px-2.5 py-1 text-xs font-medium">
                  <Avatar name={org.assignedTo.name} color={org.assignedTo.avatarColor} size="xs" />
                  <span>{org.assignedTo.name}</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">Unassigned</span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Outreach Action Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
          <span className="text-xs font-semibold text-muted-foreground mr-1">Log Action:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openLog('CALL')}
            icon={<Phone className="size-3.5 text-blue-500" />}
          >
            + Call
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCallPrepOpen(true)}
            icon={<Sparkles className="size-3.5 text-amber-500" />}
          >
            AI Call Prep
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => openLog('EMAIL')}
            icon={<Mail className="size-3.5 text-indigo-500" />}
          >
            + Email
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => openLog('LINKEDIN')}
            icon={<Linkedin className="size-3.5 text-sky-500" />}
          >
            + LinkedIn
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => openLog('MEETING')}
            icon={<Calendar className="size-3.5 text-violet-500" />}
          >
            + Meeting
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => openLog('NOTE')}
            icon={<StickyNote className="size-3.5 text-slate-500" />}
          >
            + Note
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMergeModalOpen(true)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Merge Org...
          </Button>

          <div className="ml-auto">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCreateContactOpen(true)}
              icon={<Plus className="size-4" />}
            >
              Add Contact Person
            </Button>
          </div>
        </div>
      </div>

      {/* AI Lead Intelligence Card */}
      <AiLeadIntelligenceCard orgId={org.id} />

      {/* Tabs Navigation */}
      <div className="flex border-b border-border gap-6 text-sm font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          className={cn(
            'pb-3 -mb-px transition-colors border-b-2 font-semibold',
            activeTab === 'timeline'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          Activity Timeline ({activities.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('contacts')}
          className={cn(
            'pb-3 -mb-px transition-colors border-b-2 font-semibold',
            activeTab === 'contacts'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          Key Contacts ({contacts.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('followups')}
          className={cn(
            'pb-3 -mb-px transition-colors border-b-2 font-semibold',
            activeTab === 'followups'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          Follow-ups ({followups.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notes')}
          className={cn(
            'pb-3 -mb-px transition-colors border-b-2 font-semibold',
            activeTab === 'notes'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          Team Notes &amp; Discussion
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={cn(
            'pb-3 -mb-px transition-colors border-b-2 font-semibold',
            activeTab === 'overview'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          Overview
        </button>
      </div>

      {/* Tab 1: Chronological Activity Timeline */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          {activities.length === 0 ? (
            <Card className="border-border p-12 text-center">
              <Phone className="size-8 mx-auto text-muted-foreground/60 mb-2" />
              <p className="font-semibold text-sm">No outreach activity recorded yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Use the buttons above (+ Call, + Email, + LinkedIn) to record the first interaction.
              </p>
            </Card>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {activities.map((act: any) => (
                <div key={act.id} className="relative group">
                  {/* Timeline bullet icon */}
                  <div className="absolute -left-6 top-1 flex size-5 items-center justify-center rounded-full bg-surface border-2 border-primary text-[10px] text-primary">
                    <div className="size-1.5 rounded-full bg-primary" />
                  </div>

                  <Card className="border-border shadow-xs hover:border-border-strong transition-colors">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Avatar
                            name={act.performedBy.name}
                            color={act.performedBy.avatarColor}
                            size="xs"
                          />
                          <span className="text-xs font-semibold text-foreground">
                            {act.performedBy.name}
                          </span>
                          <span className="text-xs font-semibold uppercase text-primary tracking-wider text-[11px]">
                            • {act.type}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDateTime(act.activityDate)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge tone="blue" size="sm">
                          Outcome: {act.outcome}
                        </Badge>
                        {act.contact && (
                          <span className="text-xs text-muted-foreground font-medium">
                            Contact: <strong>{act.contact.name}</strong> {act.contact.designation ? `(${act.contact.designation})` : ''}
                          </span>
                        )}
                      </div>

                      {act.notes && (
                        <p className="text-xs text-foreground/90 whitespace-pre-wrap bg-surface-muted/50 p-2.5 rounded-lg border border-border/50">
                          {act.notes}
                        </p>
                      )}

                      {act.nextFollowupDate && (
                        <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 pt-1">
                          <Clock className="size-3" />
                          Follow-up scheduled for {formatDate(act.nextFollowupDate)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Contacts Directory */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Key Stakeholders & Decision Makers</h3>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setCreateContactOpen(true)}
              icon={<Plus className="size-3.5" />}
            >
              Add Contact
            </Button>
          </div>

          {contacts.length === 0 ? (
            <Card className="border-border p-8 text-center text-xs text-muted-foreground">
              No contacts added for this organisation yet. Click &ldquo;Add Contact&rdquo; to add a stakeholder.
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {contacts.map((contact: any) => (
                <Card key={contact.id} className="border-border shadow-xs">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-foreground">{contact.name}</span>
                          {contact.isDecisionMaker && (
                            <Badge tone="amber" size="sm">
                              Decision Maker
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {contact.designation || 'Staff / Member'} {contact.department ? `· ${contact.department}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground pt-1 border-t border-border/60">
                      {contact.email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="size-3.5 text-muted-foreground" />
                          <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                            {contact.email}
                          </a>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Phone className="size-3.5 text-muted-foreground" />
                          <a href={`tel:${contact.phone}`} className="text-primary hover:underline">
                            {contact.phone}
                          </a>
                        </div>
                      )}
                      {contact.linkedinUrl && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Linkedin className="size-3.5 text-sky-600" />
                          <a
                            href={contact.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            LinkedIn Profile
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => openLog('CALL', contact.id)}
                        icon={<Phone className="size-3" />}
                      >
                        Call
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => openLog('EMAIL', contact.id)}
                        icon={<Mail className="size-3" />}
                      >
                        Email
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Follow-ups */}
      {activeTab === 'followups' && (
        <div className="space-y-3">
          {followups.length === 0 ? (
            <Card className="border-border p-8 text-center text-xs text-muted-foreground">
              No pending follow-ups for this organisation.
            </Card>
          ) : (
            followups.map((f: any) => (
              <Card key={f.id} className="border-border shadow-xs">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-amber-500" />
                      <span className="font-semibold text-xs text-foreground">
                        Due: {formatDate(f.dueDate)}
                      </span>
                      <Badge tone={f.status === 'PENDING' ? 'amber' : 'emerald'} size="sm">
                        {f.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {f.note || 'Action scheduled'}
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    size="xs"
                    onClick={() => openLog('CALL', f.contactId)}
                  >
                    Log Follow-up Call
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Team Notes & Discussion */}
      {activeTab === 'notes' && (
        <Card className="border-border shadow-xs p-6">
          <CommentsFeed organisationId={org.id} />
        </Card>
      )}

      {/* Tab 5: Overview */}
      {activeTab === 'overview' && (
        <Card className="border-border shadow-xs">
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground font-medium">General Email:</span>
                <p className="font-semibold text-foreground mt-0.5">{org.generalEmail || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">General Phone:</span>
                <p className="font-semibold text-foreground mt-0.5">{org.generalPhone || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Domain:</span>
                <p className="font-semibold text-foreground mt-0.5">{org.domain || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Organization Type:</span>
                <p className="font-semibold text-foreground mt-0.5">{org.customFields?.organisationType || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Number of Professionals:</span>
                <p className="font-semibold text-foreground mt-0.5">{org.customFields?.numberOfProfessionals !== undefined && org.customFields?.numberOfProfessionals !== null ? org.customFields.numberOfProfessionals : '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Total Activities Logged:</span>
                <p className="font-semibold text-foreground mt-0.5">{org.activityCount}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Internal Notes:</span>
              <p className="text-xs text-foreground whitespace-pre-wrap bg-surface-muted/40 p-3 rounded-lg border border-border">
                {org.notes || 'No general notes recorded for this organisation.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <LogActivityModal
        open={logModalOpen}
        onOpenChange={setLogModalOpen}
        initialType={logType}
        initialOrganisationId={org.id}
        initialContactId={selectedContactId}
        onSuccess={fetchDetails}
      />

      <CallPrepDialog
        open={callPrepOpen}
        onOpenChange={setCallPrepOpen}
        orgId={org.id}
        contactId={selectedContactId || contacts[0]?.id}
        onStartCall={() => openLog('CALL')}
      />

      <CreateContactModal
        open={createContactOpen}
        onOpenChange={setCreateContactOpen}
        organisationId={org.id}
        organisationName={org.name}
        onSuccess={fetchDetails}
      />

      <MergeOrganisationDialog
        open={mergeModalOpen}
        onOpenChange={setMergeModalOpen}
        sourceId={org.id}
        sourceName={org.name}
        onSuccess={() => {
          router.push('/organisations')
        }}
      />
    </div>
  )
}
