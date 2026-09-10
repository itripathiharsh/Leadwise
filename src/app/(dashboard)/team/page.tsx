'use client'

import * as React from 'react'
import {
  Users,
  BarChart3,
  UserPlus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  Linkedin,
  Shield,
  Zap,
  Award,
  Clock,
  UserX,
  UserCheck,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
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
import { Field, Input } from '@/components/ui/field'
import { formatDateTime } from '@/lib/dates'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function TeamPage() {
  const [loading, setLoading] = React.useState(true)
  const [currentUser, setCurrentUser] = React.useState<any>(null)
  const [users, setUsers] = React.useState<any[]>([])
  const [performance, setPerformance] = React.useState<any[]>([])
  const [pendingUsers, setPendingUsers] = React.useState<any[]>([])
  const [reviewingId, setReviewingId] = React.useState<string | null>(null)
  const [selectedRoles, setSelectedRoles] = React.useState<Record<string, string>>({})

  const [discontinueTarget, setDiscontinueTarget] = React.useState<any>(null)
  const [discontinuing, setDiscontinuing] = React.useState(false)

  const [deleteTarget, setDeleteTarget] = React.useState<any>(null)
  const [deleting, setDeleting] = React.useState(false)

  const [createModalOpen, setCreateModalOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('Sentio@123')
  const [role, setRole] = React.useState('INTERN')
  const [phone, setPhone] = React.useState('')
  const [creating, setCreating] = React.useState(false)

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [uRes, pRes, pendRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/users?performance=true'),
        fetch('/api/users?pending=true'),
      ])

      if (uRes.status === 403 || pRes.status === 403) {
        toast.error('Access Denied: Team management is reserved for Owner and Team Lead.')
        window.location.href = '/dashboard?denied=1'
        return
      }

      if (uRes.ok) {
        const ud = await uRes.json()
        setUsers(ud.users ?? [])
      }
      if (pRes.ok) {
        const pd = await pRes.json()
        setPerformance(pd.performance ?? [])
      }
      if (pendRes.ok) {
        const pendData = await pendRes.json()
        setPendingUsers(pendData.pending ?? [])
      }
    } catch {
      toast.error('Failed to load team data.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleReviewUser = async (userId: string, action: 'APPROVE' | 'REJECT') => {
    setReviewingId(userId)
    try {
      const assignedRole = selectedRoles[userId] || 'INTERN'
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, role: assignedRole }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        toast.error(data.error || `Failed to ${action.toLowerCase()} user.`)
        return
      }
      toast.success(action === 'APPROVE' ? 'User access approved!' : 'User registration rejected.')
      fetchData()
    } catch {
      toast.error('Network error while reviewing user.')
    } finally {
      setReviewingId(null)
    }
  }

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d?.user) {
          setCurrentUser(d.user)
          if (d.user.role !== 'OWNER' && d.user.role !== 'TL') {
            toast.error('Access Denied: Team management is reserved for Owner and Team Lead.')
            window.location.href = '/dashboard?denied=1'
          }
        }
      })
      .catch(() => {})
    fetchData()
  }, [fetchData])

  const handleDiscontinue = async () => {
    if (!discontinueTarget) return
    setDiscontinuing(true)
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: discontinueTarget.id, action: 'DISCONTINUE' }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        toast.error(data.error || 'Failed to discontinue user.')
        return
      }
      toast.success(`${discontinueTarget.name} has been discontinued. Workload released.`)
      setDiscontinueTarget(null)
      fetchData()
    } catch {
      toast.error('Network error discontinuing user.')
    } finally {
      setDiscontinuing(false)
    }
  }

  const handleReactivate = async (u: any) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id, action: 'REACTIVATE' }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        toast.error(data.error || 'Failed to reactivate user.')
        return
      }
      toast.success(`${u.name} reactivated. Access restored.`)
      fetchData()
    } catch {
      toast.error('Network error reactivating user.')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deleteTarget.id }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        toast.error(data.error || 'Failed to delete user.')
        return
      }
      toast.success(`${deleteTarget.name} removed from CRM.`)
      setDeleteTarget(null)
      fetchData()
    } catch {
      toast.error('Network error deleting user.')
    } finally {
      setDeleting(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          phone: phone.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        toast.error(data.error || 'Failed to create user.')
        setCreating(false)
        return
      }

      toast.success(`Created team account for ${name} ✓`)
      setCreateModalOpen(false)
      setName('')
      setEmail('')
      fetchData()
    } catch {
      toast.error('Network error creating user.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Executive Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
              <Users className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-display font-extrabold text-2xl tracking-tight text-foreground">
                  Team Operations & Velocity
                </h1>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-surface-elevated text-primary border border-primary/20 font-bold">
                  {users.length} Active Accounts
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Governance, RBAC privileges, and multi-channel 7-day outreach velocity matrix.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            icon={<RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />}
            className="border-border hover:bg-surface-elevated"
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            icon={<UserPlus className="size-4" />}
            className="shadow-md shadow-primary/20 font-semibold"
          >
            + Add Team Member
          </Button>
        </div>
      </div>

      {/* Pending Access Requests (TL/Owner Review) */}
      {pendingUsers.length > 0 && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 backdrop-blur-xl p-6 shadow-lg space-y-4 rim-highlight animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30 shadow-xs">
                <Clock className="size-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-foreground">
                    Pending Access Requests
                  </h2>
                  <span className="text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    {pendingUsers.length} Pending Review
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review new team member registrations. Choose an operational role and approve or reject CRM access.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingUsers.map((pendingUser) => (
              <div
                key={pendingUser.id}
                className="flex flex-col justify-between rounded-xl border border-border/80 bg-surface/90 p-4 space-y-3.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={pendingUser.name} color={pendingUser.avatarColor} size="md" />
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-foreground truncate">
                        {pendingUser.name}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground truncate">
                        {pendingUser.email}
                      </div>
                      {pendingUser.phone && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          📞 {pendingUser.phone}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold shrink-0">
                    {formatDateTime(pendingUser.createdAt)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/60">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-muted-foreground">Assign Role:</label>
                    <select
                      value={selectedRoles[pendingUser.id] || 'INTERN'}
                      onChange={(e) =>
                        setSelectedRoles((prev) => ({ ...prev, [pendingUser.id]: e.target.value }))
                      }
                      className="rounded-lg border border-border bg-surface-elevated px-2 py-1 text-xs text-foreground font-medium focus:border-primary focus:outline-none"
                    >
                      <option value="INTERN">Intern (Scoped)</option>
                      <option value="TL">Team Lead (Executive)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => handleReviewUser(pendingUser.id, 'REJECT')}
                      disabled={reviewingId === pendingUser.id}
                      icon={<XCircle className="size-3.5 text-rose-500" />}
                      className="hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/30 text-xs"
                    >
                      Reject
                    </Button>
                    <Button
                      variant="primary"
                      size="xs"
                      onClick={() => handleReviewUser(pendingUser.id, 'APPROVE')}
                      loading={reviewingId === pendingUser.id}
                      icon={<CheckCircle2 className="size-3.5" />}
                      className="shadow-xs font-semibold text-xs"
                    >
                      Approve & Grant Access
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7-Day Team Performance Matrix */}
      <div className="glass-card rounded-2xl border border-border/90 bg-surface/80 shadow-md overflow-hidden rim-highlight space-y-3 p-6">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="size-5 text-primary" />
            <div>
              <h2 className="text-sm font-bold text-foreground">7-Day Team Outreach Leaderboard</h2>
              <p className="text-xs text-muted-foreground">Comparative touchpoints, responses, and territory ownership across reps.</p>
            </div>
          </div>
          <span className="font-mono text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Real-time Metrics
          </span>
        </div>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border/80 text-[11px] font-mono uppercase tracking-wider text-muted-foreground bg-surface-elevated/40">
                <th className="py-3 px-3">Team Member</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3 text-right">Calls (7d)</th>
                <th className="py-3 px-3 text-right">Emails (7d)</th>
                <th className="py-3 px-3 text-right">LinkedIn (7d)</th>
                <th className="py-3 px-3 text-right">Responses</th>
                <th className="py-3 px-3 text-right">Interested</th>
                <th className="py-3 px-3 text-right">Held Accounts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {performance.map((item) => (
                <tr key={item.id} className="hover:bg-surface-elevated/60 transition-colors">
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={item.name} color={item.avatarColor} size="sm" />
                      <div>
                        <div className="font-bold text-xs text-foreground">{item.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{item.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-3">
                    <Badge
                      tone={
                        item.role === 'OWNER'
                          ? 'violet'
                          : item.role === 'TL'
                            ? 'teal'
                            : 'blue'
                      }
                      size="sm"
                    >
                      {item.role}
                    </Badge>
                  </td>

                  <td className="py-3.5 px-3 text-right font-mono text-xs text-foreground/90">{item.week.calls}</td>
                  <td className="py-3.5 px-3 text-right font-mono text-xs text-foreground/90">{item.week.emails}</td>
                  <td className="py-3.5 px-3 text-right font-mono text-xs text-foreground/90">{item.week.linkedin}</td>
                  <td className="py-3.5 px-3 text-right font-mono text-xs font-bold text-teal-400">
                    {item.week.responses}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-xs font-bold text-amber-400">
                    {item.week.interested}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-bold text-xs text-foreground">
                    {item.assignedOrganisations}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users List & Accounts */}
      <div className="glass-card rounded-2xl border border-border/90 bg-surface/80 shadow-md overflow-hidden rim-highlight space-y-3 p-6">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <Shield className="size-5 text-primary" />
            <div>
              <h2 className="text-sm font-bold text-foreground">Authorized Accounts & Security State</h2>
              <p className="text-xs text-muted-foreground">Configured roles, session audit timestamps, and operational status.</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border/80 text-[11px] font-mono uppercase tracking-wider text-muted-foreground bg-surface-elevated/40">
                <th className="py-3 px-3">Name</th>
                <th className="py-3 px-3">Email Address</th>
                <th className="py-3 px-3">Phone</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Account State</th>
                <th className="py-3 px-3">Last Active</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-surface-elevated/60 transition-colors">
                  <td className="py-3.5 px-3 font-bold text-xs text-foreground">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.name} color={u.avatarColor} size="xs" />
                      <span>{u.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-xs font-mono text-muted-foreground">{u.email}</td>
                  <td className="py-3.5 px-3 text-xs font-mono text-muted-foreground">{u.phone || '—'}</td>
                  <td className="py-3.5 px-3">
                    <Badge
                      tone={
                        u.role === 'OWNER'
                          ? 'violet'
                          : u.role === 'TL'
                            ? 'teal'
                            : 'blue'
                      }
                      size="sm"
                    >
                      {u.role}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-3">
                    {u.status === 'DISCONTINUED' ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        <UserX className="size-3 text-amber-400" /> Discontinued
                      </span>
                    ) : u.isActive ? (
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-rose-400 font-semibold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                        <XCircle className="size-3 text-rose-400" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-xs font-mono text-muted-foreground">
                    {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never logged in'}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    {u.id === currentUser?.id ? (
                      <span className="text-[10px] font-mono text-muted-foreground font-semibold px-2 py-0.5 bg-surface-elevated rounded border border-border/60">
                        Current Account
                      </span>
                    ) : u.role === 'INTERN' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        {u.isActive && u.status !== 'DISCONTINUED' ? (
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => setDiscontinueTarget(u)}
                            icon={<UserX className="size-3.5 text-amber-500" />}
                            className="hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/40 text-xs font-semibold text-amber-600 dark:text-amber-400 shadow-xs"
                            title="Discontinue intern and unassign active accounts"
                          >
                            Discontinue
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => handleReactivate(u)}
                            icon={<UserCheck className="size-3.5 text-emerald-500" />}
                            className="hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/40 text-xs font-semibold text-emerald-600 dark:text-emerald-400 shadow-xs"
                            title="Reactivate intern access"
                          >
                            Reactivate
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setDeleteTarget(u)}
                          icon={<Trash2 className="size-3 text-muted-foreground hover:text-rose-500" />}
                          className="hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 p-1.5"
                          title="Delete intern permanently"
                        />
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono text-muted-foreground font-medium px-2 py-0.5 bg-surface-elevated/50 rounded border border-border/40">
                        Leadership
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Discontinue Confirmation Dialog */}
      <Dialog open={Boolean(discontinueTarget)} onOpenChange={(open) => !open && setDiscontinueTarget(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-amber-500">
              <AlertTriangle className="size-5" />
              <DialogTitle>Discontinue Intern Access</DialogTitle>
            </div>
            <DialogDescription>
              Are you sure you want to discontinue this intern&apos;s tenure?
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-3 pt-2">
            <div className="rounded-xl border border-border bg-surface-elevated/60 p-3.5 space-y-1.5 text-xs">
              <div className="font-bold text-foreground">{discontinueTarget?.name}</div>
              <div className="font-mono text-muted-foreground">{discontinueTarget?.email}</div>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-muted-foreground space-y-1">
              <div className="font-semibold text-amber-500">System Impact:</div>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Immediate session revocation and login lockout.</li>
                <li>Any assigned organizations will be released back to the unassigned queue for reassignment.</li>
                <li>Pending follow-ups assigned to them will be cancelled.</li>
                <li>Historical outreach logs and analytics will be preserved.</li>
              </ul>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDiscontinueTarget(null)} disabled={discontinuing}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDiscontinue}
              loading={discontinuing}
              icon={<UserX className="size-4" />}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              Discontinue Intern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-rose-500">
              <Trash2 className="size-5" />
              <DialogTitle>Delete Intern Account</DialogTitle>
            </div>
            <DialogDescription>
              Are you sure you want to permanently delete this account from CRM rosters?
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-3 pt-2">
            <div className="rounded-xl border border-border bg-surface-elevated/60 p-3.5 space-y-1.5 text-xs">
              <div className="font-bold text-foreground">{deleteTarget?.name}</div>
              <div className="font-mono text-muted-foreground">{deleteTarget?.email}</div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This action soft-deletes the intern account from all active rosters while retaining audit history for compliance.
            </p>
          </DialogBody>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={deleting}
              icon={<Trash2 className="size-4" />}
              className="font-semibold"
            >
              Delete Intern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Create an outreach account with designated role permissions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="flex flex-col flex-1 overflow-hidden">
            <DialogBody className="space-y-4">
              <Field label="Full Name" required>
                <Input
                  placeholder="e.g. Maya Lin"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10"
                />
              </Field>

              <Field label="Corporate Email" required>
                <Input
                  type="email"
                  placeholder="e.g. maya@sentiomind.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="System Role" required>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="INTERN">Intern / Outreach Rep</option>
                    <option value="TL">Team Lead (TL)</option>
                    <option value="OWNER">Owner / Admin</option>
                  </select>
                </Field>

                <Field label="Direct Phone">
                  <Input
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-10"
                  />
                </Field>
              </div>

              <Field label="Initial Password" required>
                <Input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 font-mono text-xs"
                />
              </Field>
            </DialogBody>

            <DialogFooter>
              <Button variant="ghost" type="button" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={creating} className="font-bold">
                Create Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
