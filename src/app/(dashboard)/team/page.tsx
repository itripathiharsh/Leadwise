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
  const [users, setUsers] = React.useState<any[]>([])
  const [performance, setPerformance] = React.useState<any[]>([])

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
      const [uRes, pRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/users?performance=true'),
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
    } catch {
      toast.error('Failed to load team data.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user && d.user.role !== 'OWNER' && d.user.role !== 'TL') {
          toast.error('Access Denied: Team management is reserved for Owner and Team Lead.')
          window.location.href = '/dashboard?denied=1'
        }
      })
      .catch(() => {})
    fetchData()
  }, [fetchData])

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
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-surface-elevated/60 transition-colors">
                  <td className="py-3.5 px-3 font-bold text-xs text-foreground">
                    {u.name}
                  </td>
                  <td className="py-3.5 px-3 text-xs font-mono text-muted-foreground">{u.email}</td>
                  <td className="py-3.5 px-3 text-xs font-mono text-muted-foreground">{u.phone || '—'}</td>
                  <td className="py-3.5 px-3">
                    <Badge tone="slate" size="sm">
                      {u.role}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-3">
                    {u.isActive ? (
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-rose-400 font-semibold">
                        <XCircle className="size-3" /> Deactivated
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-xs font-mono text-muted-foreground">
                    {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never logged in'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
