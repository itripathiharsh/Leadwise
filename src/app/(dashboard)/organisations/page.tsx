'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Building2,
  Search,
  Plus,
  ChevronRight,
  RefreshCw,
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
  const [statusFilter, setStatusFilter] = React.useState('')
  const [priorityFilter, setPriorityFilter] = React.useState('')
  const [assigneeFilter, setAssigneeFilter] = React.useState('')
  const [usersList, setUsersList] = React.useState<Array<{ id: string; name: string }>>([])

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
      if (search.trim()) params.set('q', search.trim())
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
  }, [search, statusFilter, priorityFilter, assigneeFilter, page])

  React.useEffect(() => {
    fetchOrganisations()
  }, [fetchOrganisations])

  // Fetch users for assignment filter
  React.useEffect(() => {
    fetch('/api/search?take=50')
      .then((r) => r.json())
      .catch(() => {})
  }, [])

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

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Building2 className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Organisations
            </h1>
            <Badge tone="slate" size="sm">
              {total} Total
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage partnership targets, domains, assignment ownership, and interaction stages.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
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
            icon={<Plus className="size-4" />}
          >
            Add Organisation
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter by name, domain, location..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full rounded-lg border border-border bg-surface-muted/50 pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:bg-surface"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground font-medium shadow-xs focus:border-primary focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="NEW">New</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="CONTACTED">Contacted</option>
          <option value="RESPONDED">Responded</option>
          <option value="INTERESTED">Interested</option>
          <option value="MEETING">Meeting</option>
          <option value="PARTNERSHIP">Partnership</option>
          <option value="REJECTED">Rejected</option>
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground font-medium shadow-xs focus:border-primary focus:outline-none"
        >
          <option value="">All Priorities</option>
          <option value="HIGH">High Priority</option>
          <option value="MEDIUM">Medium Priority</option>
          <option value="LOW">Low Priority</option>
        </select>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary-soft/30 p-3 animate-in fade-in">
          <span className="text-xs font-semibold text-primary-foreground bg-primary px-2 py-0.5 rounded-md">
            {selectedIds.length} selected
          </span>

          <div className="flex items-center gap-2">
            <select
              value={bulkAssignee}
              onChange={(e) => setBulkAssignee(e.target.value)}
              className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-foreground font-medium"
            >
              <option value="">Choose Assignee...</option>
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
            >
              Assign Selected
            </Button>
          </div>
        </div>
      )}

      {/* Organisations Table */}
      <div className="rounded-xl border border-border bg-surface shadow-xs overflow-hidden">
        {loading && organisations.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            Loading organisations...
          </div>
        ) : organisations.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Building2 className="size-8 mx-auto text-muted-foreground/60" />
            <p className="font-semibold text-sm">No organisations found</p>
            <p className="text-xs text-muted-foreground">
              Try adjusting your search filters or click &ldquo;Add Organisation&rdquo;.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-surface-muted/40">
                  <th className="py-3 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.length > 0 && selectedIds.length === organisations.length
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="size-3.5 rounded border-border text-primary"
                    />
                  </th>
                  <th className="py-3 px-3">Organisation</th>
                  <th className="py-3 px-3">Category / Domain</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Assigned To</th>
                  <th className="py-3 px-3">Last Contacted</th>
                  <th className="py-3 px-3">Next Follow-up</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {organisations.map((org) => {
                  const isSelected = selectedIds.includes(org.id)
                  return (
                    <tr
                      key={org.id}
                      className={cn(
                        'hover:bg-muted/40 transition-colors',
                        isSelected && 'bg-primary-soft/15',
                      )}
                    >
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(org.id)}
                          className="size-3.5 rounded border-border text-primary"
                        />
                      </td>

                      <td className="py-3 px-3">
                        <Link
                          href={`/organisations/${org.id}`}
                          className="font-semibold text-xs text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                        >
                          {org.name}
                          <ChevronRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        </Link>
                        <div className="text-[11px] text-muted-foreground">
                          {org._count.contacts} contact(s) · {org.activityCount} activities
                        </div>
                      </td>

                      <td className="py-3 px-3 text-xs text-muted-foreground">
                        <div>{org.category || '—'}</div>
                        {org.domain && (
                          <span className="font-mono text-[10px] text-foreground/70">
                            {org.domain}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
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

                      <td className="py-3 px-3">
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

                      <td className="py-3 px-3">
                        {org.assignedTo ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar
                              name={org.assignedTo.name}
                              color={org.assignedTo.avatarColor}
                              size="xs"
                            />
                            <span className="text-xs font-medium text-foreground">
                              {org.assignedTo.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            Unassigned
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-xs text-muted-foreground whitespace-nowrap">
                        {org.lastContactedAt ? formatDate(org.lastContactedAt) : 'Never'}
                      </td>

                      <td className="py-3 px-3 text-xs whitespace-nowrap">
                        {org.nextFollowupAt ? (
                          <span className="font-medium text-amber-600 dark:text-amber-400">
                            {formatDate(org.nextFollowupAt)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            setActiveOrgForLog({ id: org.id, name: org.name })
                            setLogModalOpen(true)
                          }}
                          className="mr-1 text-primary hover:bg-primary-soft/40"
                        >
                          + Log
                        </Button>
                        <Link href={`/organisations/${org.id}`}>
                          <Button variant="ghost" size="xs">
                            View
                          </Button>
                        </Link>
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
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <div>
              Page {page} of {pageCount} ({total} organisations)
            </div>
            <div className="flex items-center gap-1">
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
