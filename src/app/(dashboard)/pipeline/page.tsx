'use client'

import * as React from 'react'
import {
  Kanban,
  Filter,
  RefreshCw,
  Plus,
  Flame,
  AlertTriangle,
  Snowflake,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PipelineKanban } from '@/components/domain/pipeline-kanban'
import { CreateOrganisationModal } from '@/components/domain/create-organisation-modal'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { PipelineBoard, LeadHealth } from '@/server/services/pipeline'
import type { Priority } from '@prisma/client'

export default function PipelinePage() {
  const [loading, setLoading] = React.useState(true)
  const [board, setBoard] = React.useState<PipelineBoard | null>(null)

  // Filters
  const [assigneeFilter, setAssigneeFilter] = React.useState('')
  const [priorityFilter, setPriorityFilter] = React.useState<Priority | ''>('')
  const [healthFilter, setHealthFilter] = React.useState<LeadHealth | ''>('')
  const [createModalOpen, setCreateModalOpen] = React.useState(false)
  const [usersList, setUsersList] = React.useState<Array<{ id: string; name: string }>>([])

  const fetchBoard = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (assigneeFilter) params.set('assignee', assigneeFilter)
      if (priorityFilter) params.set('priority', priorityFilter)
      if (healthFilter) params.set('health', healthFilter)

      const res = await fetch(`/api/pipeline?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setBoard(data)
      } else {
        toast.error('Failed to load pipeline.')
      }
    } catch {
      toast.error('Network error loading pipeline.')
    } finally {
      setLoading(false)
    }
  }, [assigneeFilter, priorityFilter, healthFilter])

  React.useEffect(() => {
    fetchBoard()
  }, [fetchBoard])

  React.useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((d) => {
        if (d.users) setUsersList(d.users)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="max-w-full mx-auto space-y-5 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Kanban className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Lead Pipeline & Stages
            </h1>
            {board && (
              <Badge tone="slate" size="sm">
                {board.total} Targets
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visual stage progression, health indicators (Active/Attention/Cold), and next action guidance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBoard}
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
            Add Lead
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mr-1">
          <Filter className="size-3.5" /> Filters:
        </div>

        {/* Assignee Filter */}
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground font-medium shadow-xs focus:border-primary focus:outline-none"
        >
          <option value="">All Assignees</option>
          <option value="UNASSIGNED">Unassigned Only</option>
          {usersList.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as Priority | '')}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground font-medium shadow-xs focus:border-primary focus:outline-none"
        >
          <option value="">All Priorities</option>
          <option value="HIGH">High Priority</option>
          <option value="MEDIUM">Medium Priority</option>
          <option value="LOW">Low Priority</option>
        </select>

        {/* Health Filter */}
        <select
          value={healthFilter}
          onChange={(e) => setHealthFilter(e.target.value as LeadHealth | '')}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground font-medium shadow-xs focus:border-primary focus:outline-none"
        >
          <option value="">All Health Statuses</option>
          <option value="ACTIVE">🔥 Active Only</option>
          <option value="ATTENTION">⚠️ Needs Attention</option>
          <option value="GOING_COLD">❄️ Going Cold</option>
        </select>
      </div>

      {/* Kanban Board */}
      {loading && !board ? (
        <div className="flex h-96 items-center justify-center text-xs text-muted-foreground">
          Loading pipeline stages...
        </div>
      ) : board ? (
        <PipelineKanban initialData={board} onRefresh={fetchBoard} />
      ) : null}

      <CreateOrganisationModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        usersList={usersList}
        onSuccess={() => fetchBoard()}
      />
    </div>
  )
}
