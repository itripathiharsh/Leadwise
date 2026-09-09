'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Building2,
  Users,
  Activity,
  CalendarClock,
  PhoneCall,
  Video,
  Send,
  Sparkles,
  ArrowRight,
  Clock,
  Save,
  Lock,
  Flame,
  Check,
} from 'lucide-react'
import { UserAvatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ProfileData {
  id: string
  name: string
  email: string
  phone: string | null
  role: 'OWNER' | 'TL' | 'INTERN'
  avatarColor: string
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
  target?: {
    dailyOrganisations: number
    dailyCalls: number
    dailyEmails: number
    dailyLinkedin: number
    dailyMeetings: number
  } | null
  counts: {
    assignedOrganisations: number
    assignedContacts: number
    totalActivities: number
    pendingFollowUps: number
    completedFollowUps: number
    overdueFollowUps: number
  }
  metrics: {
    today: {
      activities: number
      calls: number
      emails: number
      linkedin: number
      meetingsScheduled: number
      meetingsCompleted: number
      responses: number
      interested: number
    }
    week: {
      activities: number
      calls: number
      emails: number
      linkedin: number
      meetingsScheduled: number
      meetingsCompleted: number
      responses: number
      interested: number
    }
  }
  recentActivities: Array<{
    id: string
    type: string
    outcome: string
    emailSubject: string | null
    notes: string | null
    activityDate: string
    organisation: { id: string; name: string } | null
    contact: { id: string; name: string } | null
  }>
}

const AVATAR_PALETTE = [
  { id: 'violet', label: 'Violet', bg: 'bg-violet-500' },
  { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-500' },
  { id: 'teal', label: 'Teal', bg: 'bg-teal-500' },
  { id: 'cyan', label: 'Cyan', bg: 'bg-cyan-500' },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-500' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-500' },
  { id: 'sky', label: 'Sky', bg: 'bg-sky-500' },
] as const

export default function ProfilePage() {
  const [profile, setProfile] = React.useState<ProfileData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<'overview' | 'edit' | 'security' | 'role'>('overview')

  // Edit Form State
  const [name, setName] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [avatarColor, setAvatarColor] = React.useState('violet')
  const [savingProfile, setSavingProfile] = React.useState(false)

  // Security Form State
  const [currentPassword, setCurrentPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [savingPassword, setSavingPassword] = React.useState(false)

  const fetchProfile = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/profile')
      if (!res.ok) throw new Error('Failed to load profile')
      const data = await res.json()
      setProfile(data.profile)
      setName(data.profile.name)
      setPhone(data.profile.phone || '')
      setAvatarColor(data.profile.avatarColor || 'violet')
    } catch (err: unknown) {
      toast.error('Could not load profile information')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Name cannot be empty')
      return
    }

    try {
      setSavingProfile(true)
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() ? phone.trim() : null,
          avatarColor,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      toast.success('Profile details updated successfully!')
      fetchProfile()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating profile'
      toast.error(msg)
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword) {
      toast.error('Current password is required')
      return
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    try {
      setSavingPassword(true)
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile?.name || name,
          currentPassword,
          newPassword,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password')
      }

      toast.success('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setActiveTab('overview')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating password'
      toast.error(msg)
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse">
        <div className="h-44 rounded-2xl bg-surface border border-border" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-surface border border-border" />
          ))}
        </div>
        <div className="h-80 rounded-xl bg-surface border border-border" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-xl mx-auto mt-16 p-6 text-center space-y-4">
        <AlertCircle className="size-10 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">Profile Not Available</h2>
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t retrieve your profile data. Please refresh or sign in again.
        </p>
        <Button onClick={() => fetchProfile()} variant="primary" size="sm">
          Try Again
        </Button>
      </div>
    )
  }

  const roleLabel =
    profile.role === 'OWNER'
      ? 'Workspace Owner'
      : profile.role === 'TL'
        ? 'Team Lead'
        : 'Outreach Intern'

  const roleTone =
    profile.role === 'OWNER' ? 'violet' : profile.role === 'TL' ? 'blue' : 'emerald'

  const joinedDate = new Date(profile.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Hero Profile Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface via-surface to-surface-muted p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <UserAvatar
                name={profile.name}
                color={profile.avatarColor}
                size="xl"
                className="size-20 text-2xl shadow-sm ring-4 ring-background"
              />
              <span
                className={cn(
                  'absolute bottom-0 right-0 size-4 rounded-full border-2 border-background',
                  profile.isActive ? 'bg-emerald-500' : 'bg-slate-400',
                )}
                title={profile.isActive ? 'Active Account' : 'Inactive'}
              />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {profile.name}
                </h1>
                <Badge tone={roleTone} size="md" dot>
                  {roleLabel}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                <div className="flex items-center gap-1.5">
                  <Mail className="size-3.5 text-primary" />
                  <span>{profile.email}</span>
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="size-3.5 text-primary" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  <span>Joined {joinedDate}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <Button
              variant={activeTab === 'edit' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('edit')}
              icon={<User className="size-3.5" />}
            >
              Edit Details
            </Button>
            <Button
              variant={activeTab === 'security' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('security')}
              icon={<KeyRound className="size-3.5" />}
            >
              Password
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-t border-border/80 mt-6 pt-4">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={cn(
              'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors',
              activeTab === 'overview'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
            )}
          >
            My Work & Performance
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={cn(
              'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors',
              activeTab === 'edit'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
            )}
          >
            Edit Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={cn(
              'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors',
              activeTab === 'security'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
            )}
          >
            Security
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('role')}
            className={cn(
              'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors',
              activeTab === 'role'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
            )}
          >
            Role & Permissions
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Key Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/organisations" className="group">
              <Card className="h-full border-border bg-surface transition-all duration-150 hover:border-primary/50 hover:shadow-xs p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Assigned Organisations
                  </span>
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Building2 className="size-4" />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-bold text-foreground">
                  {profile.counts.assignedOrganisations}
                </div>
                <div className="mt-1 flex items-center text-[11px] text-muted-foreground">
                  Active outreach accounts
                </div>
              </Card>
            </Link>

            <Link href="/contacts" className="group">
              <Card className="h-full border-border bg-surface transition-all duration-150 hover:border-primary/50 hover:shadow-xs p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Assigned Contacts
                  </span>
                  <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 group-hover:bg-teal-500 group-hover:text-white transition-colors">
                    <Users className="size-4" />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-bold text-foreground">
                  {profile.counts.assignedContacts}
                </div>
                <div className="mt-1 flex items-center text-[11px] text-muted-foreground">
                  Decision makers & leads
                </div>
              </Card>
            </Link>

            <Link href="/activities" className="group">
              <Card className="h-full border-border bg-surface transition-all duration-150 hover:border-primary/50 hover:shadow-xs p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Total Activities Logged
                  </span>
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                    <Activity className="size-4" />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-bold text-foreground">
                  {profile.counts.totalActivities}
                </div>
                <div className="mt-1 flex items-center text-[11px] text-muted-foreground">
                  Calls, emails, meetings, notes
                </div>
              </Card>
            </Link>

            <Link href="/followups" className="group">
              <Card className="h-full border-border bg-surface transition-all duration-150 hover:border-primary/50 hover:shadow-xs p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Pending Follow-ups
                  </span>
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <CalendarClock className="size-4" />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-bold text-foreground">
                  {profile.counts.pendingFollowUps}
                </div>
                <div className="mt-1 flex items-center text-[11px]">
                  {profile.counts.overdueFollowUps > 0 ? (
                    <span className="text-destructive font-medium">
                      ⚠️ {profile.counts.overdueFollowUps} overdue
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ No overdue tasks
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          </div>

          {/* Outreach Performance Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Activity */}
            <Card className="border-border bg-surface">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Today&apos;s Outreach</CardTitle>
                    <CardDescription className="text-xs">
                      Activities performed by you today
                    </CardDescription>
                  </div>
                  <Badge tone="emerald" size="sm">
                    {profile.metrics.today.activities} Total
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border/70 bg-surface-muted/50 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <PhoneCall className="size-3.5 text-emerald-500" />
                      <span>Calls</span>
                    </div>
                    <div className="mt-1.5 text-xl font-bold text-foreground">
                      {profile.metrics.today.calls}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-surface-muted/50 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Send className="size-3.5 text-blue-500" />
                      <span>Emails</span>
                    </div>
                    <div className="mt-1.5 text-xl font-bold text-foreground">
                      {profile.metrics.today.emails}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-surface-muted/50 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Video className="size-3.5 text-indigo-500" />
                      <span>Meetings</span>
                    </div>
                    <div className="mt-1.5 text-xl font-bold text-foreground">
                      {profile.metrics.today.meetingsCompleted}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-surface-muted/50 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Sparkles className="size-3.5 text-amber-500" />
                      <span>Responses</span>
                    </div>
                    <div className="mt-1.5 text-xl font-bold text-foreground">
                      {profile.metrics.today.responses}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-surface-muted/50 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Flame className="size-3.5 text-rose-500" />
                      <span>Interested</span>
                    </div>
                    <div className="mt-1.5 text-xl font-bold text-foreground">
                      {profile.metrics.today.interested}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-surface-muted/50 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                      <span>Follow-ups Done</span>
                    </div>
                    <div className="mt-1.5 text-xl font-bold text-foreground">
                      {profile.counts.completedFollowUps}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Last 7 Days Performance */}
            <Card className="border-border bg-surface">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Last 7 Days Outreach</CardTitle>
                    <CardDescription className="text-xs">
                      Rolling weekly progress and output
                    </CardDescription>
                  </div>
                  <Badge tone="blue" size="sm">
                    {profile.metrics.week.activities} Total
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border/70 bg-surface-muted/50 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <PhoneCall className="size-3.5 text-emerald-500" />
                      <span>Calls</span>
                    </div>
                    <div className="mt-1.5 text-xl font-bold text-foreground">
                      {profile.metrics.week.calls}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-surface-muted/50 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Send className="size-3.5 text-blue-500" />
                      <span>Emails</span>
                    </div>
                    <div className="mt-1.5 text-xl font-bold text-foreground">
                      {profile.metrics.week.emails}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-surface-muted/50 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Video className="size-3.5 text-indigo-500" />
                      <span>Meetings</span>
                    </div>
                    <div className="mt-1.5 text-xl font-bold text-foreground">
                      {profile.metrics.week.meetingsCompleted}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-surface-muted/50 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Sparkles className="size-3.5 text-amber-500" />
                      <span>Responses</span>
                    </div>
                    <div className="mt-1.5 text-xl font-bold text-foreground">
                      {profile.metrics.week.responses}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-surface-muted/50 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Flame className="size-3.5 text-rose-500" />
                      <span>Interested</span>
                    </div>
                    <div className="mt-1.5 text-xl font-bold text-foreground">
                      {profile.metrics.week.interested}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-surface-muted/50 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarClock className="size-3.5 text-teal-500" />
                      <span>Scheduled</span>
                    </div>
                    <div className="mt-1.5 text-xl font-bold text-foreground">
                      {profile.metrics.week.meetingsScheduled}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assigned Targets (if set) */}
          {profile.target && (
            <Card className="border-border bg-surface">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      Daily Outreach Targets
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Daily performance milestones configured for your account
                    </CardDescription>
                  </div>
                  <Badge tone="indigo" size="sm">
                    Target Plan
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-border p-3 space-y-1">
                    <div className="text-xs text-muted-foreground">Daily Calls</div>
                    <div className="text-xl font-bold">{profile.target.dailyCalls}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Today: {profile.metrics.today.calls} logged
                    </div>
                  </div>
                  <div className="rounded-xl border border-border p-3 space-y-1">
                    <div className="text-xs text-muted-foreground">Daily Emails</div>
                    <div className="text-xl font-bold">{profile.target.dailyEmails}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Today: {profile.metrics.today.emails} sent
                    </div>
                  </div>
                  <div className="rounded-xl border border-border p-3 space-y-1">
                    <div className="text-xs text-muted-foreground">Daily Meetings</div>
                    <div className="text-xl font-bold">{profile.target.dailyMeetings}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Today: {profile.metrics.today.meetingsCompleted} done
                    </div>
                  </div>
                  <div className="rounded-xl border border-border p-3 space-y-1">
                    <div className="text-xs text-muted-foreground">Organisations</div>
                    <div className="text-xl font-bold">{profile.target.dailyOrganisations}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Assigned: {profile.counts.assignedOrganisations} total
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Outreach Activity Feed */}
          <Card className="border-border bg-surface">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Your Recent Outreach</CardTitle>
                  <CardDescription className="text-xs">
                    Latest interactions and calls logged by you
                  </CardDescription>
                </div>
                <Link
                  href="/activities"
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                >
                  <span>View All</span>
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {profile.recentActivities.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No outreach activity logged yet. Click &quot;Log Activity&quot; in the sidebar to start!
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {profile.recentActivities.map((act) => (
                    <div key={act.id} className="py-3 flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            {act.type}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs font-medium text-primary truncate">
                            {act.organisation?.name || 'Unknown Organisation'}
                          </span>
                          {act.contact && (
                            <span className="text-[11px] text-muted-foreground truncate">
                              ({act.contact.name})
                            </span>
                          )}
                        </div>
                        {act.emailSubject && (
                          <div className="text-xs text-foreground/80 truncate">{act.emailSubject}</div>
                        )}
                        {act.notes && (
                          <div className="text-[11px] text-muted-foreground line-clamp-1">
                            {act.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge tone="slate" size="sm">
                          {act.outcome}
                        </Badge>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="size-3" />
                          <span>
                            {new Date(act.activityDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: EDIT PROFILE */}
      {activeTab === 'edit' && (
        <Card className="max-w-2xl border-border bg-surface">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Personal Information</CardTitle>
            <CardDescription className="text-xs">
              Update your display name, contact phone number, and avatar color theme.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden"
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full rounded-lg border border-border/60 bg-muted/60 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                />
                <span className="text-[11px] text-muted-foreground">
                  Email address is managed by workspace administrator.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden"
                  placeholder="+91 98765 43210"
                />
              </div>

              {/* Avatar Color Swatch Picker */}
              <div className="space-y-2 pt-2 border-t border-border/80">
                <label className="text-xs font-medium text-foreground">Avatar Accent Color</label>
                <div className="flex items-center gap-3">
                  <UserAvatar name={name} color={avatarColor} size="lg" />
                  <div className="flex flex-wrap items-center gap-2">
                    {AVATAR_PALETTE.map((pal) => (
                      <button
                        key={pal.id}
                        type="button"
                        onClick={() => setAvatarColor(pal.id)}
                        className={cn(
                          'flex size-7 items-center justify-center rounded-full transition-transform',
                          pal.bg,
                          avatarColor === pal.id ? 'ring-2 ring-primary ring-offset-2 scale-110' : 'opacity-80 hover:opacity-100',
                        )}
                        title={pal.label}
                      >
                        {avatarColor === pal.id && <Check className="size-3.5 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('overview')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={savingProfile}
                  icon={<Save className="size-3.5" />}
                >
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: SECURITY & PASSWORD */}
      {activeTab === 'security' && (
        <Card className="max-w-xl border-border bg-surface">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <Lock className="size-4 text-primary" />
              <CardTitle className="text-base font-semibold">Change Password</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Keep your account secure with a strong password of at least 8 characters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden"
                  placeholder="Enter current password"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden"
                  placeholder="At least 8 characters"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden"
                  placeholder="Confirm new password"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('overview')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={savingPassword}
                  icon={<KeyRound className="size-3.5" />}
                >
                  {savingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB 4: ROLE & PERMISSIONS */}
      {activeTab === 'role' && (
        <Card className="max-w-2xl border-border bg-surface">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              <CardTitle className="text-base font-semibold">
                Your Role: {roleLabel} ({profile.role})
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Overview of permissions and access configured for your user role in Leadwise CRM.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            {profile.role === 'INTERN' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-foreground space-y-1">
                  <div className="font-semibold text-primary">Focused Outreach Workflow</div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    As an Outreach Intern, your workspace is organized around your assigned accounts and personal performance goals.
                  </p>
                </div>
                <div className="space-y-2 pt-2">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Manage your assigned organisations, contacts, and deal stages.</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Log calls, meetings, emails, and follow-ups with instant progress tracking.</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>View your personal activity metrics, targets, and response rates.</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Access shared templates, calendar reminders, and AI outreach assistance.</span>
                  </div>
                </div>
              </div>
            )}

            {profile.role === 'TL' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-foreground space-y-1">
                  <div className="font-semibold text-blue-600 dark:text-blue-400">Team Lead Oversight</div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    As a Team Lead, you have complete visibility over team performance, outreach pipelines, and end-of-day reports.
                  </p>
                </div>
                <div className="space-y-2 pt-2">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle2 className="size-4 text-blue-500 shrink-0 mt-0.5" />
                    <span>View all team members&apos; performance, calls, and follow-up metrics.</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle2 className="size-4 text-blue-500 shrink-0 mt-0.5" />
                    <span>Review daily EOD reports and monitor outreach bottlenecks.</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle2 className="size-4 text-blue-500 shrink-0 mt-0.5" />
                    <span>Assign organisations and reallocate workloads across interns.</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle2 className="size-4 text-blue-500 shrink-0 mt-0.5" />
                    <span>Access AI & funnel analytics across the entire CRM.</span>
                  </div>
                </div>
              </div>
            )}

            {profile.role === 'OWNER' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/20 text-foreground space-y-1">
                  <div className="font-semibold text-violet-600 dark:text-violet-400">Full Workspace Ownership</div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    You hold full administrative control over the Leadwise CRM organization and workspace settings.
                  </p>
                </div>
                <div className="space-y-2 pt-2">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle2 className="size-4 text-violet-500 shrink-0 mt-0.5" />
                    <span>Full administrative access to users, roles, and deactivations.</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle2 className="size-4 text-violet-500 shrink-0 mt-0.5" />
                    <span>Configure system backups, Google Drive sync, and notification schedules.</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle2 className="size-4 text-violet-500 shrink-0 mt-0.5" />
                    <span>Inspect complete audit trails, security events, and bulk actions.</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle2 className="size-4 text-violet-500 shrink-0 mt-0.5" />
                    <span>Manage global workspace targets and custom pipelines.</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
