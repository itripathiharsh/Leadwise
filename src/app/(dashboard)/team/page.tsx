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

      toast.success(`Created user ${name}`)
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Users className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Team Management & Analytics
            </h1>
            <Badge tone="slate" size="sm">
              {users.length} Members
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage team roles (Owner, Team Lead, Intern) and monitor 7-day outreach performance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            icon={<RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            icon={<UserPlus className="size-4" />}
          >
            Add Team Member
          </Button>
        </div>
      </div>

      {/* 7-Day Team Performance Matrix */}
      <Card className="border-border shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" />
            <CardTitle className="text-base">7-Day Team Outreach Matrix</CardTitle>
          </div>
          <CardDescription>
            Performance metrics covering the last 7 days of outreach across all team members.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-3">Team Member</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3 text-right">Calls (7d)</th>
                  <th className="py-3 px-3 text-right">Emails (7d)</th>
                  <th className="py-3 px-3 text-right">LinkedIn (7d)</th>
                  <th className="py-3 px-3 text-right">Responses (7d)</th>
                  <th className="py-3 px-3 text-right">Interested (7d)</th>
                  <th className="py-3 px-3 text-right">Held Orgs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {performance.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={item.name} color={item.avatarColor} size="sm" />
                        <div>
                          <div className="font-semibold text-xs text-foreground">{item.name}</div>
                          <div className="text-[10px] text-muted-foreground">{item.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
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

                    <td className="py-3 px-3 text-right font-mono text-xs">{item.week.calls}</td>
                    <td className="py-3 px-3 text-right font-mono text-xs">{item.week.emails}</td>
                    <td className="py-3 px-3 text-right font-mono text-xs">{item.week.linkedin}</td>
                    <td className="py-3 px-3 text-right font-mono text-xs font-semibold text-teal-600">
                      {item.week.responses}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs font-semibold text-amber-600">
                      {item.week.interested}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-xs">
                      {item.assignedOrganisations}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Users List & Accounts */}
      <Card className="border-border shadow-xs">
        <CardHeader>
          <CardTitle className="text-base">Team Accounts & Access</CardTitle>
          <CardDescription>Active login credentials and access levels.</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-3 font-semibold text-xs text-foreground">
                      {u.name}
                    </td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">{u.email}</td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">{u.phone || '—'}</td>
                    <td className="py-3 px-3">
                      <Badge tone="slate" size="sm">
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-3">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <CheckCircle2 className="size-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-rose-600 font-medium">
                          <XCircle className="size-3.5" /> Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">
                      {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never logged in'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add User Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Create an outreach account with designated role permissions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 py-2">
            <Field label="Full Name" required>
              <Input
                placeholder="e.g. Rahul Sharma"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>

            <Field label="Email Address" required>
              <Input
                type="email"
                placeholder="rahul@leadwise.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Role" required>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs focus:border-primary focus:outline-none"
                >
                  <option value="INTERN">Intern (Outreach Rep)</option>
                  <option value="TL">Team Lead (Operational Lead)</option>
                  <option value="OWNER">Owner (Full Administrator)</option>
                </select>
              </Field>

              <Field label="Phone">
                <Input
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Initial Password" required>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            <DialogFooter>
              <Button variant="ghost" type="button" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={creating}>
                Create Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
