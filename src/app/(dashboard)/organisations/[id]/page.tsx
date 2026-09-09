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
  Award,
  Zap,
  CheckCircle,
  ArrowUpRight,
  Send,
  MessageSquare,
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

const STAGES = [
  { key: 'NEW', label: 'Target' },
  { key: 'CONTACTED', label: 'Contacted' },
  { key: 'INTERESTED', label: 'Warm / Interested' },
  { key: 'MEETING', label: 'Meeting' },
  { key: 'PARTNERSHIP', label: 'Partnered' },
]

export default function OrganisationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params.id as string

  const [loading, setLoading] = React.useState(true)
  const [data, setData] = React.useState<any>(null)
  const [activeTab, setActiveTab] = React.useState<'overview' | 'contacts' | 'timeline' | 'followups' | 'notes'>('overview')

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
        toast.success(`Partnership stage advanced to ${newStatus}`)
        fetchDetails()
      } else {
        toast.error('Failed to update stage.')
      }
    } catch {
      toast.error('Network error updating stage.')
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
      <div className="flex h-96 flex-col items-center justify-center gap-3 p-8 text-xs text-muted-foreground">
        <RefreshCw className="size-6 text-primary animate-spin" />
        <span>Loading relationship intelligence dossier...</span>
      </div>
    )
  }

  if (!data?.organisation) {
    return (
      <div className="p-16 text-center space-y-4">
        <Building2 className="size-10 mx-auto text-muted-foreground/60" />
        <p className="font-display font-bold text-base text-foreground">Organisation not found</p>
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

  // Compute Next Recommended Action
  const nextPendingFollowup = followups.find((f: any) => f.status === 'PENDING')
  const primaryContact = contacts.find((c: any) => c.isDecisionMaker) || contacts[0]

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Top Breadcrumb & Control Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/organisations"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back to Organizations
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="xs"
            onClick={fetchDetails}
            icon={<RefreshCw className={cn('size-3', loading && 'animate-spin')} />}
            className="border-border/80 text-xs"
          >
            Refresh Dossier
          </Button>
        </div>
      </div>

      {/* Warning when viewing an organisation assigned to someone else */}
      {currentUser && org.assignedTo && org.assignedTo.id !== currentUser.id && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-5 text-amber-500 shrink-0" />
            <div>
              <span className="font-bold text-sm text-foreground">
                Assigned Account Warning:
              </span>{' '}
              <span className="text-muted-foreground">
                This entity is managed by <strong className="text-foreground font-semibold">{org.assignedTo.name}</strong>. Coordinate internally before initiating outreach.
              </span>
            </div>
          </div>
          <Badge tone="amber" size="sm" className="shrink-0 font-semibold">
            Owner: {org.assignedTo.name}
          </Badge>
        </div>
      )}

      {/* Organisation Dossier Hero Card */}
      <div className="glass-card rounded-2xl border border-border/90 bg-surface/85 backdrop-blur-xl p-6 sm:p-8 shadow-md space-y-6 rim-highlight">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-hover text-white font-mono text-xl font-black shadow-lg shadow-primary/20">
              {org.name.slice(0, 2).toUpperCase()}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight text-foreground">
                  {org.name}
                </h1>
                <Badge
                  tone={
                    org.priority === 'HIGH'
                      ? 'rose'
                      : org.priority === 'MEDIUM'
                        ? 'amber'
                        : 'slate'
                  }
                  size="sm"
                  dot
                >
                  {org.priority} Priority
                </Badge>
                <Badge
                  tone={
                    org.status === 'PARTNERSHIP'
                      ? 'emerald'
                      : org.status === 'MEETING'
                        ? 'violet'
                        : org.status === 'INTERESTED'
                          ? 'amber'
                          : 'indigo'
                  }
                  size="sm"
                >
                  {org.status}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {org.category && (
                  <span className="font-medium text-foreground/80">{org.category}</span>
                )}
                {org.domain && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-primary">{org.domain}</span>
                  </>
                )}
                {org.location && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" /> {org.location}
                    </span>
                  </>
                )}
                {org.website && (
                  <>
                    <span>•</span>
                    <a
                      href={org.website.startsWith('http') ? org.website : `https://${org.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Globe className="size-3" /> {org.website.replace(/^https?:\/\//, '')}
                      <ExternalLink className="size-2.5" />
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Account Owner & Stage Controls */}
          <div className="flex flex-wrap items-center gap-3 lg:self-start">
            <div className="rounded-xl border border-border/80 bg-surface-elevated/70 p-2 px-3 text-right">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Assigned Lead
              </span>
              {org.assignedTo ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <Avatar name={org.assignedTo.name} color={org.assignedTo.avatarColor} size="xs" />
                  <span className="text-xs font-bold text-foreground">{org.assignedTo.name}</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">Unassigned</span>
              )}
            </div>

            <div className="rounded-xl border border-border/80 bg-surface-elevated/70 p-2 px-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
                Override Stage
              </span>
              <select
                value={org.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-bold text-foreground shadow-xs focus:border-primary focus:outline-none"
              >
                <option value="NEW">New Target</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="CONTACTED">Contacted</option>
                <option value="RESPONDED">Responded</option>
                <option value="INTERESTED">Interested</option>
                <option value="MEETING">Meeting</option>
                <option value="PARTNERSHIP">Partnership</option>
                <option value="REJECTED">Disqualified</option>
              </select>
            </div>
          </div>
        </div>

        {/* Partnership Stage Progression Track */}
        <div className="rounded-xl border border-border/70 bg-surface-elevated/40 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Partnership Stage Progression
            </span>
            <span className="text-xs font-semibold text-primary">
              Current: {org.status}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {STAGES.map((s, idx) => {
              const isPassed =
                STAGES.findIndex((x) => x.key === org.status) >= idx
              const isCurrent = org.status === s.key

              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => handleStatusChange(s.key)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border p-2 text-left transition-all duration-200 text-xs',
                    isCurrent
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                      : isPassed
                        ? 'border-border bg-surface-elevated/70 text-foreground/80'
                        : 'border-border/50 bg-surface/30 text-muted-foreground hover:border-border'
                  )}
                >
                  <div
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-mono font-bold',
                      isCurrent
                        ? 'bg-primary text-primary-foreground'
                        : isPassed
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-surface-elevated text-muted-foreground'
                    )}
                  >
                    {isPassed && !isCurrent ? '✓' : idx + 1}
                  </div>
                  <span className="truncate">{s.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Primary Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-foreground mr-1">Log Touchpoint:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openLog('CALL')}
              icon={<Phone className="size-3.5 text-sky-400" />}
              className="border-border/80 hover:bg-surface-elevated"
            >
              + Call
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCallPrepOpen(true)}
              icon={<Sparkles className="size-3.5 text-amber-400" />}
              className="border-border/80 hover:bg-surface-elevated"
            >
              AI Call Prep
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openLog('EMAIL')}
              icon={<Mail className="size-3.5 text-indigo-400" />}
              className="border-border/80 hover:bg-surface-elevated"
            >
              + Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openLog('LINKEDIN')}
              icon={<Linkedin className="size-3.5 text-sky-500" />}
              className="border-border/80 hover:bg-surface-elevated"
            >
              + LinkedIn
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openLog('MEETING')}
              icon={<Calendar className="size-3.5 text-violet-400" />}
              className="border-border/80 hover:bg-surface-elevated"
            >
              + Meeting
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openLog('NOTE')}
              icon={<StickyNote className="size-3.5 text-slate-400" />}
              className="border-border/80 hover:bg-surface-elevated"
            >
              + Note
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMergeModalOpen(true)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Merge Entity
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCreateContactOpen(true)}
              icon={<Plus className="size-4" />}
              className="shadow-xs"
            >
              + Add Key Contact
            </Button>
          </div>
        </div>
      </div>

      {/* HIGH VISIBILITY: Next Recommended Action Dossier */}
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-surface to-surface p-5 shadow-sm space-y-3 rim-highlight">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-primary animate-pulse" />
              <span className="font-mono text-xs font-extrabold uppercase tracking-wider text-primary">
                High-Priority Next Action
              </span>
            </div>
            {nextPendingFollowup ? (
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  Follow-up Due: {formatDate(nextPendingFollowup.dueDate)}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {nextPendingFollowup.note || 'Scheduled touchpoint review with institutional stakeholder.'}
                </p>
              </div>
            ) : (
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Advance outreach cadence for {org.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {primaryContact
                    ? `Ready for touchpoint with ${primaryContact.name} (${primaryContact.designation || 'Stakeholder'}).`
                    : 'No contact persons attached. Add a decision maker to begin personalized cadences.'}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {nextPendingFollowup ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => openLog('CALL', nextPendingFollowup.contactId)}
                icon={<Phone className="size-3.5" />}
                className="font-bold shadow-md shadow-primary/20"
              >
                Execute Follow-up Call
              </Button>
            ) : primaryContact ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => openLog('CALL', primaryContact.id)}
                icon={<Phone className="size-3.5" />}
                className="font-bold shadow-md shadow-primary/20"
              >
                Call {primaryContact.name.split(' ')[0]}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCreateContactOpen(true)}
                icon={<Plus className="size-4" />}
                className="font-bold shadow-md shadow-primary/20"
              >
                Add First Contact
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* AI Intelligence Integration */}
      <AiLeadIntelligenceCard orgId={org.id} />

      {/* Modern Dossier Navigation Tabs */}
      <div className="flex border-b border-border/80 gap-6 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={cn(
            'pb-3.5 -mb-px transition-colors border-b-2 text-xs uppercase tracking-wider',
            activeTab === 'overview'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Overview & Intel
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('contacts')}
          className={cn(
            'pb-3.5 -mb-px transition-colors border-b-2 text-xs uppercase tracking-wider flex items-center gap-1.5',
            activeTab === 'contacts'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <span>Contacts</span>
          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-surface-elevated text-foreground">
            {contacts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          className={cn(
            'pb-3.5 -mb-px transition-colors border-b-2 text-xs uppercase tracking-wider flex items-center gap-1.5',
            activeTab === 'timeline'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <span>Activity Timeline</span>
          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-surface-elevated text-foreground">
            {activities.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('followups')}
          className={cn(
            'pb-3.5 -mb-px transition-colors border-b-2 text-xs uppercase tracking-wider flex items-center gap-1.5',
            activeTab === 'followups'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <span>Follow-ups</span>
          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-surface-elevated text-foreground">
            {followups.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notes')}
          className={cn(
            'pb-3.5 -mb-px transition-colors border-b-2 text-xs uppercase tracking-wider',
            activeTab === 'notes'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Team Notes
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 border-border/80 bg-surface/70 shadow-xs">
            <CardHeader className="p-5 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-foreground">Organization Blueprint</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="rounded-xl border border-border/60 bg-surface-elevated/40 p-3.5 space-y-1">
                  <span className="text-[11px] font-mono text-muted-foreground uppercase">General Email</span>
                  <p className="font-semibold text-foreground truncate">{org.generalEmail || '—'}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-surface-elevated/40 p-3.5 space-y-1">
                  <span className="text-[11px] font-mono text-muted-foreground uppercase">General Phone</span>
                  <p className="font-semibold text-foreground">{org.generalPhone || '—'}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-surface-elevated/40 p-3.5 space-y-1">
                  <span className="text-[11px] font-mono text-muted-foreground uppercase">Target Domain</span>
                  <p className="font-semibold text-primary">{org.domain || '—'}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-surface-elevated/40 p-3.5 space-y-1">
                  <span className="text-[11px] font-mono text-muted-foreground uppercase">Entity Category</span>
                  <p className="font-semibold text-foreground">{org.category || 'General Health'}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-surface-elevated/40 p-4 space-y-1.5">
                <span className="text-[11px] font-mono text-muted-foreground uppercase">Internal Strategic Notes</span>
                <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {org.notes || 'No internal notes captured for this organisation yet.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Metrics Column */}
          <div className="space-y-4">
            <div className="glass-card rounded-2xl border border-border/80 bg-surface/70 p-5 space-y-3">
              <span className="font-mono text-[11px] font-bold text-muted-foreground uppercase">Engagement Velocity</span>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Total Activities</span>
                  <span className="font-mono font-bold text-foreground">{org.activityCount}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Mapped Contacts</span>
                  <span className="font-mono font-bold text-foreground">{contacts.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Pending Follow-ups</span>
                  <span className="font-mono font-bold text-amber-500">
                    {followups.filter((f: any) => f.status === 'PENDING').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Contacts */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">Stakeholders & Decision Makers</h3>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setCreateContactOpen(true)}
              icon={<Plus className="size-3.5" />}
            >
              Add Contact Person
            </Button>
          </div>

          {contacts.length === 0 ? (
            <Card className="border-border p-12 text-center text-xs text-muted-foreground">
              No contacts recorded for this entity. Click &ldquo;Add Contact Person&rdquo; to attach stakeholders.
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {contacts.map((contact: any) => (
                <div
                  key={contact.id}
                  className="glass-card rounded-2xl border border-border/80 bg-surface/70 p-5 shadow-xs hover:border-primary/40 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{contact.name}</span>
                        {contact.isDecisionMaker && (
                          <span className="font-mono text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            Decision Maker
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {contact.designation || 'Stakeholder'} {contact.department ? `· ${contact.department}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground pt-2 border-t border-border/60">
                    {contact.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="size-3.5 text-muted-foreground" />
                        <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                          {contact.email}
                        </a>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-2 truncate">
                        <Phone className="size-3.5 text-muted-foreground" />
                        <a href={`tel:${contact.phone}`} className="text-foreground hover:underline">
                          {contact.phone}
                        </a>
                      </div>
                    )}
                    {contact.linkedinUrl && (
                      <div className="flex items-center gap-2 truncate">
                        <Linkedin className="size-3.5 text-sky-400" />
                        <a
                          href={contact.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-400 hover:underline"
                        >
                          LinkedIn Profile
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Activity Timeline */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          {activities.length === 0 ? (
            <Card className="border-border p-12 text-center space-y-2">
              <Phone className="size-8 mx-auto text-muted-foreground/50" />
              <p className="font-bold text-sm text-foreground">No outreach activity recorded yet</p>
              <p className="text-xs text-muted-foreground">
                Use the buttons above (+ Call, + Email, + LinkedIn) to log your first touchpoint.
              </p>
            </Card>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
              {activities.map((act: any) => (
                <div key={act.id} className="relative group">
                  <div className="absolute -left-6 top-2 flex size-5 items-center justify-center rounded-full bg-surface border-2 border-primary text-[10px] text-primary">
                    <div className="size-1.5 rounded-full bg-primary" />
                  </div>

                  <div className="glass-card rounded-xl border border-border/80 bg-surface/70 p-4 space-y-2 hover:border-border transition-all">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={act.performedBy.name}
                          color={act.performedBy.avatarColor}
                          size="xs"
                        />
                        <span className="text-xs font-bold text-foreground">
                          {act.performedBy.name}
                        </span>
                        <span className="font-mono text-[10px] font-bold uppercase text-primary tracking-wider">
                          • {act.type}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground">
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
                      <p className="text-xs text-foreground/90 whitespace-pre-wrap bg-surface-elevated/50 p-3 rounded-lg border border-border/50">
                        {act.notes}
                      </p>
                    )}

                    {act.nextFollowupDate && (
                      <div className="text-[11px] text-amber-500 font-medium flex items-center gap-1.5 pt-1">
                        <Clock className="size-3" />
                        Follow-up scheduled for {formatDate(act.nextFollowupDate)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Follow-ups */}
      {activeTab === 'followups' && (
        <div className="space-y-3">
          {followups.length === 0 ? (
            <Card className="border-border p-12 text-center text-xs text-muted-foreground">
              No pending follow-ups scheduled for this organisation.
            </Card>
          ) : (
            followups.map((f: any) => (
              <div
                key={f.id}
                className="glass-card rounded-xl border border-border/80 bg-surface/70 p-4 flex items-center justify-between gap-4 shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-amber-500" />
                    <span className="font-mono text-xs font-bold text-foreground">
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
                  Log Call
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 5: Team Notes */}
      {activeTab === 'notes' && (
        <div className="glass-card rounded-2xl border border-border/80 bg-surface/70 p-6 shadow-xs">
          <CommentsFeed organisationId={org.id} />
        </div>
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
