'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Building2,
  Search,
  Plus,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
  ExternalLink,
  MessageSquarePlus,
  Calendar,
  Sparkles,
  ArrowUpDown,
  Filter,
  Users,
  CheckSquare,
  Shield,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { CreateOrganisationModal } from '@/components/domain/create-organisation-modal'
import { LogActivityModal } from '@/components/domain/log-activity-modal'
import { formatDate } from '@/lib/dates'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface OrganisationItem {
  id: string
  name: string
  category: string | null
  website: string | null
  domain: string | null
  location: string | null
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  status: string
  lastContactedAt: string | null
  nextFollowupAt: string | null
  activityCount: number
  assignedTo: { id: string; name: string; avatarColor: string } | null
  _count: { contacts: number }
}

export default function OrganisationsPage() {
  const [loading, setLoading] = React.useState(true)
  const [organisations, setOrganisations] = React.useState<OrganisationItem[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [pageCount, setPageCount] = React.useState(1)

  // Filters
  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('')
  const [priorityFilter, setPriorityFilter] = React.useState('')
  const [assigneeFilter, setAssigneeFilter] = React.useState('')
  const [usersList, setUsersList] = React.useState<Array<{ id: string; name: string }>>([])

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 250)
    return () => clearTimeout(timer)
  }, [search])

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [bulkAssignee, setBulkAssignee] = React.useState('')
  const [bulkAssigning, setBulkAssigning] = React.useState(false)

  // Modals
  const [createModalOpen, setCreateModalOpen] = React.useState(false)
  const [logModalOpen, setLogModalOpen] = React.useState(false)
  const [activeOrgForLog, setActiveOrgForLog] = React.useState<{ id: string; name: string } | null>(null)

  const fetchOrganisations = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim())
      if (statusFilter) params.set('status', statusFilter)
      if (priorityFilter) params.set('priority', priorityFilter)
      if (assigneeFilter) params.set('assignee', assigneeFilter)
      params.set('page', String(page))

      const res = await fetch(`/api/organisations?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setOrganisations(data.items ?? [])
        setTotal(data.total ?? 0)
        setPageCount(data.pageCount ?? 1)
      }
    } catch {
      toast.error('Failed to load organisations.')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, priorityFilter, assigneeFilter, page])

  React.useEffect(() => {
    fetchOrganisations()
  }, [fetchOrganisations])

  const [currentUser, setCurrentUser] = React.useState<any>(null)
  const [currentUserRole, setCurrentUserRole] = React.useState<string | null>(null)
  const isLeader = currentUserRole === 'OWNER' || currentUserRole === 'TL'

  // Fetch current user
  React.useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d?.user) {
          setCurrentUser(d.user)
          setCurrentUserRole(d.user.role)
        }
      })
      .catch(() => {})
  }, [])

  // Fetch users for assignment filter (only for leaders)
  React.useEffect(() => {
    if (!isLeader) return
    fetch('/api/users')
      .then((r) => r.json())
      .then((d) => {
        if (d?.users) setUsersList(d.users)
      })
      .catch(() => {})
  }, [isLeader])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(organisations.map((o) => o.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }

  const handleBulkAssign = async () => {
    if (!bulkAssignee || selectedIds.length === 0) return
    setBulkAssigning(true)
    try {
      const res = await fetch('/api/organisations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bulkAssign: true,
          ids: selectedIds,
          assignedToId: bulkAssignee === 'UNASSIGNED' ? null : bulkAssignee,
        }),
      })

      if (res.ok) {
        toast.success(`Assigned ${selectedIds.length} organisations.`)
        setSelectedIds([])
        setBulkAssignee('')
        fetchOrganisations()
      } else {
        toast.error('Bulk assignment failed.')
      }
    } catch {
      toast.error('Network error during assignment.')
    } finally {
      setBulkAssigning(false)
    }
  }

  const handleQuickReassign = async (orgId: string, assignedToId: string) => {
    try {
      const res = await fetch(`/api/organisations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedToId: assignedToId === 'UNASSIGNED' ? null : assignedToId,
          confirmReassign: true,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(
          assignedToId === 'UNASSIGNED'
            ? 'Organisation unassigned.'
            : `Assigned to ${data.assigneeName || 'team member'}.`,
        )
        fetchOrganisations()
      } else {
        toast.error(data.error || 'Failed to reassign.')
      }
    } catch {
      toast.error('Network error reassigning.')
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Executive Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
              <Building2 className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-display font-extrabold text-2xl tracking-tight text-foreground">
                  Organizations
                </h1>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-surface-elevated text-primary border border-primary/20 font-bold">
                  {total} Active Entities
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage your partnership pipeline, domain intelligence, verified decision makers, and outreach stages.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrganisations}
            icon={<RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />}
            className="hover:bg-surface-elevated border-border"
          >
            Refresh Data
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            icon={<Plus className="size-4" />}
            className="shadow-md shadow-primary/20"
          >
            + Add Organization
          </Button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="glass-panel rounded-2xl border border-border/80 bg-surface/70 backdrop-blur-xl p-3.5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by organization name, domain, location, category..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full rounded-xl border border-border bg-surface-elevated/60 pl-10 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:bg-surface transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="rounded-xl border border-border bg-surface-elevated/70 px-3 py-2 text-xs text-foreground font-medium shadow-xs focus:border-primary focus:outline-none transition-all"
            >
              <option value="">All Partnership Stages</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="CONTACTED">Contacted</option>
              <option value="RESPONDED">Responded</option>
              <option value="MEETING">Meeting Scheduled</option>
              <option value="INTERESTED">Warm / Interested</option>
              <option value="PARTNERSHIP">Partnership Signed</option>
              <option value="REJECTED">Disqualified / Cold</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5">
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value)
                setPage(1)
              }}
              className="rounded-xl border border-border bg-surface-elevated/70 px-3 py-2 text-xs text-foreground font-medium shadow-xs focus:border-primary focus:outline-none transition-all"
            >
              <option value="">All Priorities</option>
              <option value="HIGH">High Priority (Urgent)</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>

          {/* Owner Filter (Leaders Only) */}
          {isLeader && (
            <div className="flex items-center gap-1.5">
              <select
                value={assigneeFilter}
                onChange={(e) => {
                  setAssigneeFilter(e.target.value)
                  setPage(1)
                }}
                className="rounded-xl border border-border bg-surface-elevated/70 px-3 py-2 text-xs text-foreground font-medium shadow-xs focus:border-primary focus:outline-none transition-all"
              >
                <option value="">All Owners</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(search || statusFilter || priorityFilter || (isLeader && assigneeFilter)) && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                setSearch('')
                setStatusFilter('')
                setPriorityFilter('')
                setAssigneeFilter('')
                setPage(1)
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* High Density Bulk Selection Floating Bar (Leaders Only) */}
      {isLeader && selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/10 backdrop-blur-xl p-3 shadow-lg animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white bg-primary px-2.5 py-0.5 rounded-full shadow-xs">
              {selectedIds.length} Selected
            </span>
            <span className="text-xs text-muted-foreground">
              Choose an owner to assign this batch of entities:
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={bulkAssignee}
              onChange={(e) => setBulkAssignee(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground font-medium"
            >
              <option value="">Select Target Owner...</option>
              <option value="UNASSIGNED">Unassign</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>

            <Button
              variant="primary"
              size="xs"
              onClick={handleBulkAssign}
              loading={bulkAssigning}
              disabled={!bulkAssignee}
              className="font-semibold shadow-xs"
            >
              Assign Selected
            </Button>
          </div>
        </div>
      )}

      {/* Organizations Intelligence Table */}
      <div className="glass-card rounded-2xl border border-border/90 bg-surface/80 shadow-md overflow-hidden rim-highlight">
        {loading && organisations.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="size-6 mx-auto text-primary animate-spin" />
            <div className="font-semibold text-sm text-foreground">Syncing Organizations...</div>
            <p className="text-xs text-muted-foreground">Fetching live pipeline records and contact mappings.</p>
          </div>
        ) : organisations.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="flex size-14 mx-auto items-center justify-center rounded-2xl bg-surface-elevated border border-border/80 text-muted-foreground">
              <Building2 className="size-7" />
            </div>
            <div className="space-y-1">
              <p className="font-display font-bold text-base text-foreground">No organizations yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Your partnership pipeline starts here. Add your first clinical target, corporate enterprise, or health entity to begin tracking outreach.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              icon={<Plus className="size-4" />}
            >
              + Add Organization
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-[11px] font-mono uppercase tracking-wider text-muted-foreground bg-surface-elevated/40">
                  {isLeader && (
                    <th className="py-3.5 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.length > 0 && selectedIds.length === organisations.length
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="size-3.5 rounded border-border text-primary bg-surface"
                      />
                    </th>
                  )}
                  <th className="py-3.5 px-4">Organization & Contacts</th>
                  <th className="py-3.5 px-4">Domain & Category</th>
                  <th className="py-3.5 px-4">Stage</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Assigned Owner</th>
                  <th className="py-3.5 px-4">Last Activity</th>
                  <th className="py-3.5 px-4">Next Action</th>
                  <th className="py-3.5 px-4 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {organisations.map((org) => {
                  const isSelected = selectedIds.includes(org.id)
                  return (
                    <tr
                      key={org.id}
                      className={cn(
                        'group hover:bg-surface-elevated/60 transition-colors duration-150',
                        isSelected && 'bg-primary/5',
                      )}
                    >
                      {isLeader && (
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(org.id)}
                            className="size-3.5 rounded border-border text-primary bg-surface"
                          />
                        </td>
                      )}

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-xs font-mono">
                            {org.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/organisations/${org.id}`}
                              className="font-bold text-xs text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                            >
                              <span className="truncate">{org.name}</span>
                              <ChevronRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Users className="size-3" />
                                {org._count.contacts} {org._count.contacts === 1 ? 'contact' : 'contacts'}
                              </span>
                              <span>·</span>
                              <span>{org.activityCount} touchpoints</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-medium text-foreground/90">{org.category || 'General Health'}</div>
                        {org.domain ? (
                          <div className="font-mono text-[10px] text-muted-foreground tracking-tight">
                            {org.domain}
                          </div>
                        ) : org.location ? (
                          <div className="text-[10px] text-muted-foreground">
                            {org.location}
                          </div>
                        ) : null}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          tone={
                            org.status === 'PARTNERSHIP'
                              ? 'emerald'
                              : org.status === 'MEETING'
                                ? 'violet'
                                : org.status === 'INTERESTED'
                                  ? 'amber'
                                  : org.status === 'CONTACTED'
                                    ? 'indigo'
                                    : 'slate'
                          }
                          size="sm"
                          dot
                        >
                          {org.status}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4">
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
                          {org.priority}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4">
                        {isLeader ? (
                          <div className="flex items-center gap-1.5">
                            {org.assignedTo && (
                              <Avatar
                                name={org.assignedTo.name}
                                color={org.assignedTo.avatarColor}
                                size="xs"
                              />
                            )}
                            <select
                              value={org.assignedTo?.id || 'UNASSIGNED'}
                              onChange={(e) => handleQuickReassign(org.id, e.target.value)}
                              className="rounded-lg border border-border/80 bg-surface px-2 py-1 text-[11px] font-semibold text-foreground focus:border-primary focus:outline-none cursor-pointer max-w-[135px] truncate"
                              title="Reassign to self, unassigned, or others (Leader Control)"
                            >
                              {currentUser && (
                                <option value={currentUser.id}>
                                  Me ({currentUser.name})
                                </option>
                              )}
                              <option value="UNASSIGNED">Unassigned</option>
                              <optgroup label="Team Members">
                                {usersList
                                  .filter((u) => u.id !== currentUser?.id)
                                  .map((u) => (
                                    <option key={u.id} value={u.id}>
                                      {u.name}
                                    </option>
                                  ))}
                              </optgroup>
                            </select>
                          </div>
                        ) : org.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <Avatar
                              name={org.assignedTo.name}
                              color={org.assignedTo.avatarColor}
                              size="xs"
                            />
                            <span className="text-xs font-medium text-foreground truncate max-w-[110px]">
                              {org.assignedTo.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic font-mono text-[11px]">
                            Unassigned
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap font-mono text-[11px]">
                        {org.lastContactedAt ? formatDate(org.lastContactedAt) : 'No outreach'}
                      </td>

                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        {org.nextFollowupAt ? (
                          <span className="font-semibold text-amber-500 font-mono text-[11px] flex items-center gap-1">
                            <Calendar className="size-3 text-amber-500" />
                            {formatDate(org.nextFollowupAt)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => {
                              setActiveOrgForLog({ id: org.id, name: org.name })
                              setLogModalOpen(true)
                            }}
                            className="text-xs text-primary hover:bg-primary/10 font-semibold"
                          >
                            + Touchpoint
                          </Button>
                          <Link href={`/organisations/${org.id}`}>
                            <Button
                              variant="outline"
                              size="xs"
                              className="text-xs border-border/80 hover:bg-surface-elevated"
                            >
                              Dossier
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {pageCount > 1 && (
          <div className="flex items-center justify-between border-t border-border/80 px-4 py-3 text-xs text-muted-foreground bg-surface-elevated/30">
            <div className="font-mono text-[11px]">
              Showing page <span className="text-foreground font-bold">{page}</span> of {pageCount} ({total} entities)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="xs"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateOrganisationModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        usersList={usersList}
        onSuccess={() => fetchOrganisations()}
      />

      {activeOrgForLog && (
        <LogActivityModal
          open={logModalOpen}
          onOpenChange={setLogModalOpen}
          initialOrganisationId={activeOrgForLog.id}
          onSuccess={() => fetchOrganisations()}
        />
      )}
    </div>
  )
}
