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
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { CreateOrganisationModal } from '@/components/domain/create-organisation-modal'
import { LogActivityModal } from '@/components/domain/log-activity-modal'
import { formatDate } from '@/lib/dates'
import { toast } from 'sonner'
import { BulkActionsBar } from '@/components/domain/bulk-actions-bar'
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

  // Selection
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])

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
    <div className="max-w-7xl mx-auto space-y-5 p-4 sm:p-6 lg:p-8">
      {/* Precision Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-surface-muted text-foreground border border-border">
              <Building2 className="size-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-sans font-bold text-xl sm:text-2xl tracking-tight text-foreground">
                  Organizations
                </h1>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-muted text-muted-foreground border border-border">
                  {total} Entities
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Partnership accounts, clinical stakeholders, verified decision makers, and outreach stages.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrganisations}
            icon={<RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            icon={<Plus className="size-3.5" />}
          >
            Add Organization
          </Button>
        </div>
      </div>

      {/* Filter Control Bar (Solid Precision Surface) */}
      <div className="rounded-lg border border-border bg-surface p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search organizations by name, domain, location, category..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full rounded-md border border-border bg-surface-muted/60 pl-9 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-border-strong focus:bg-surface transition-[border-color,background-color]"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setPage(1)
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground rounded transition-colors"
                title="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="rounded-md border border-border bg-surface-muted/60 px-2.5 py-1.5 text-xs text-foreground font-medium outline-none focus:border-border-strong cursor-pointer"
          >
            <option value="">All Stages</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="CONTACTED">Contacted</option>
            <option value="RESPONDED">Responded</option>
            <option value="MEETING">Meeting Scheduled</option>
            <option value="INTERESTED">Warm / Interested</option>
            <option value="PARTNERSHIP">Partnership Signed</option>
            <option value="REJECTED">Disqualified / Cold</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value)
              setPage(1)
            }}
            className="rounded-md border border-border bg-surface-muted/60 px-2.5 py-1.5 text-xs text-foreground font-medium outline-none focus:border-border-strong cursor-pointer"
          >
            <option value="">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          {/* Owner Filter (Leaders Only) */}
          {isLeader && (
            <select
              value={assigneeFilter}
              onChange={(e) => {
                setAssigneeFilter(e.target.value)
                setPage(1)
              }}
              className="rounded-md border border-border bg-surface-muted/60 px-2.5 py-1.5 text-xs text-foreground font-medium outline-none focus:border-border-strong cursor-pointer"
            >
              <option value="">All Owners</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
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
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <BulkActionsBar
          selectedIds={selectedIds}
          totalCount={organisations.length}
          onSelectAll={() => setSelectedIds(organisations.map((o) => o.id))}
          onClearSelection={() => setSelectedIds([])}
          usersList={usersList}
          isLeader={isLeader}
          entityType="organisation"
          selectedData={organisations
            .filter((o) => selectedIds.includes(o.id))
            .map((o) => ({
              Name: o.name,
              Category: o.category || '',
              Domain: o.domain || '',
              Status: o.status,
              Priority: o.priority,
              Owner: o.assignedTo?.name || 'Unassigned',
              Contacts: o._count.contacts,
              Activities: o.activityCount,
              'Last Activity': o.lastContactedAt || 'Never',
              'Next Follow-up': o.nextFollowupAt || '',
            }))}
          onRefresh={fetchOrganisations}
        />
      )}

      {/* Organizations Intelligence Table */}
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        {loading && organisations.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="size-5 mx-auto text-primary animate-spin" />
            <div className="font-semibold text-sm text-foreground">Syncing Organizations...</div>
            <p className="text-xs text-muted-foreground">Fetching live pipeline records and contact mappings.</p>
          </div>
        ) : organisations.length === 0 ? (
          (search.trim() || statusFilter || priorityFilter || (isLeader && assigneeFilter)) ? (
            <div className="p-16 text-center space-y-4">
              <div className="flex size-12 mx-auto items-center justify-center rounded-lg bg-surface-muted border border-border text-muted-foreground">
                <Filter className="size-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-sm text-foreground">No organizations match your filters</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  No records matched the current search criteria. Try clearing search keywords or resetting filters.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setStatusFilter('')
                  setPriorityFilter('')
                  setAssigneeFilter('')
                  setPage(1)
                }}
                icon={<RefreshCw className="size-3.5" />}
              >
                Reset All Filters
              </Button>
            </div>
          ) : (
            <div className="p-16 text-center space-y-4">
              <div className="flex size-12 mx-auto items-center justify-center rounded-lg bg-surface-muted border border-border text-muted-foreground">
                <Building2 className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-sm text-foreground">No organizations yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Your partnership pipeline starts here. Add your first clinical target, enterprise account, or partner entity to begin tracking outreach.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCreateModalOpen(true)}
                icon={<Plus className="size-3.5" />}
              >
                Add Organization
              </Button>
            </div>
          )
        ) : (
          <>
            {/* Mobile Card Feed (< md) */}
            <div className="md:hidden divide-y divide-border">
              {organisations.map((org) => {
                const isSelected = selectedIds.includes(org.id)
                return (
                  <div
                    key={`mobile-${org.id}`}
                    className={cn(
                      'p-4 space-y-3 transition-colors',
                      isSelected ? 'bg-primary/5' : 'hover:bg-surface-hover',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {isLeader && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(org.id)}
                              className="size-4 rounded border-border text-primary bg-surface mr-1"
                            />
                          )}
                          <Link
                            href={`/organisations/${org.id}`}
                            className="font-semibold text-sm text-foreground hover:text-primary transition-colors truncate block"
                          >
                            {org.name}
                          </Link>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                          {org.domain && <span className="font-mono text-primary">{org.domain}</span>}
                          {org.domain && org.category && <span>•</span>}
                          {org.category && <span>{org.category}</span>}
                          {org.location && (
                            <>
                              <span>•</span>
                              <span>{org.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
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
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-muted text-muted-foreground border border-border">
                          {org.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-border text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        {org.assignedTo ? (
                          <>
                            <Avatar name={org.assignedTo.name} color={org.assignedTo.avatarColor} size="xs" />
                            <span className="text-[11px] font-medium text-foreground truncate max-w-[120px]">
                              {org.assignedTo.name}
                            </span>
                          </>
                        ) : (
                          <span className="text-[11px] italic font-mono">Unassigned</span>
                        )}
                      </div>
                      {org.nextFollowupAt && (
                        <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                          <Calendar className="size-3" />
                          {formatDate(org.nextFollowupAt)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => {
                          setActiveOrgForLog({ id: org.id, name: org.name })
                          setLogModalOpen(true)
                        }}
                        className="text-xs text-primary font-semibold"
                      >
                        + Touchpoint
                      </Button>
                      <Link href={`/organisations/${org.id}`}>
                        <Button
                          variant="outline"
                          size="xs"
                          className="text-xs"
                        >
                          Dossier
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground bg-surface-muted/50">
                    {isLeader && (
                      <th className="py-3 px-3.5 w-10">
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
                    <th className="py-3 px-3.5 font-semibold">Organization & Contacts</th>
                    <th className="py-3 px-3.5 font-semibold">Domain & Category</th>
                    <th className="py-3 px-3.5 font-semibold">Stage</th>
                    <th className="py-3 px-3.5 font-semibold">Priority</th>
                    <th className="py-3 px-3.5 font-semibold">Assigned Owner</th>
                    <th className="py-3 px-3.5 font-semibold">Last Activity</th>
                    <th className="py-3 px-3.5 font-semibold">Next Action</th>
                    <th className="py-3 px-3.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {organisations.map((org) => {
                    const isSelected = selectedIds.includes(org.id)
                    return (
                      <tr
                        key={org.id}
                        className={cn(
                          'group hover:bg-surface-hover transition-[background-color] duration-100',
                          isSelected && 'bg-primary/5',
                        )}
                      >
                        {isLeader && (
                          <td className="py-3 px-3.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(org.id)}
                              className="size-3.5 rounded border-border text-primary bg-surface"
                            />
                          </td>
                        )}

                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-7.5 shrink-0 items-center justify-center rounded-md bg-surface-muted border border-border text-foreground font-semibold text-[11px] font-mono">
                              {org.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/organisations/${org.id}`}
                                className="font-semibold text-xs text-foreground hover:text-primary transition-colors flex items-center gap-1"
                              >
                                <span className="truncate">{org.name}</span>
                                <ChevronRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </Link>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
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

                        <td className="py-3 px-3.5 text-xs">
                          <div className="font-medium text-foreground/90">{org.category || 'Clinical Partner'}</div>
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

                        <td className="py-3 px-3.5">
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
                          >
                            {org.status}
                          </Badge>
                        </td>

                        <td className="py-3 px-3.5">
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

                        <td className="py-3 px-3.5">
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
                                className="rounded border border-border bg-surface px-1.5 py-0.5 text-[11px] font-medium text-foreground focus:border-border-strong focus:outline-none cursor-pointer max-w-[130px] truncate"
                                title="Reassign owner"
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
                            <div className="flex items-center gap-1.5">
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

                        <td className="py-3 px-3.5 text-xs text-muted-foreground whitespace-nowrap font-mono text-[11px]">
                          {org.lastContactedAt ? formatDate(org.lastContactedAt) : 'No outreach'}
                        </td>

                        <td className="py-3 px-3.5 text-xs whitespace-nowrap">
                          {org.nextFollowupAt ? (
                            <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono text-[11px] flex items-center gap-1">
                              <Calendar className="size-3" />
                              {formatDate(org.nextFollowupAt)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60 text-[11px]">—</span>
                          )}
                        </td>

                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => {
                                setActiveOrgForLog({ id: org.id, name: org.name })
                                setLogModalOpen(true)
                              }}
                              className="text-xs text-primary font-medium"
                            >
                              + Touchpoint
                            </Button>
                            <Link href={`/organisations/${org.id}`}>
                              <Button
                                variant="outline"
                                size="xs"
                                className="text-xs"
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
          </>
        )}

        {/* Pagination footer */}
        {pageCount > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground bg-surface-muted/30">
            <div className="font-mono text-[11px]">
              Showing page <span className="text-foreground font-semibold">{page}</span> of {pageCount} ({total} entities)
            </div>
            <div className="flex items-center gap-1.5">
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
