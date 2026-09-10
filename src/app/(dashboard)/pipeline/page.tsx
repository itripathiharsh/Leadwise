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
  Layers,
  Sparkles,
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

  const [currentUserRole, setCurrentUserRole] = React.useState<string | null>(null)
  const isLeader = currentUserRole === 'OWNER' || currentUserRole === 'TL'

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d?.user?.role) setCurrentUserRole(d.user.role)
      })
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    if (!isLeader) return
    fetch('/api/users')
      .then((r) => r.json())
      .then((d) => {
        if (d.users) setUsersList(d.users)
      })
      .catch(() => {})
  }, [isLeader])

  return (
    <div className="max-w-full mx-auto space-y-5 p-4 sm:p-6 lg:p-8">
      {/* Executive Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
              <Kanban className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-display font-extrabold text-2xl tracking-tight text-foreground">
                  Partnership Pipeline Board
                </h1>
                {board && (
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-surface-elevated text-primary border border-primary/20 font-bold">
                    {board.total} Live Targets
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Multi-stage momentum, drag-and-drop progression, and health status indicators.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBoard}
            icon={<RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />}
            className="border-border hover:bg-surface-elevated"
          >
            Refresh Board
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            icon={<Plus className="size-4" />}
            className="shadow-md shadow-primary/20 font-semibold"
          >
            + Add Target Entity
          </Button>
        </div>
      </div>

      {/* Filter Control Panel */}
      <div className="glass-panel rounded-2xl border border-border/80 bg-surface/70 backdrop-blur-xl p-3 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mr-1 uppercase tracking-wider font-mono">
          <Filter className="size-3.5 text-primary" /> Filter Board:
        </div>

        {/* Assignee Filter (Leaders Only) */}
        {isLeader && (
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="rounded-xl border border-border bg-surface-elevated/70 px-3 py-1.5 text-xs text-foreground font-medium shadow-xs focus:border-primary focus:outline-none transition-all"
          >
            <option value="">All Account Owners</option>
            <option value="UNASSIGNED">Unassigned Only</option>
            {usersList.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        )}

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as Priority | '')}
          className="rounded-xl border border-border bg-surface-elevated/70 px-3 py-1.5 text-xs text-foreground font-medium shadow-xs focus:border-primary focus:outline-none transition-all"
        >
          <option value="">All Priorities</option>
          <option value="HIGH">High Priority Only</option>
          <option value="MEDIUM">Medium Priority</option>
          <option value="LOW">Low Priority</option>
        </select>

        {/* Health Filter */}
        <select
          value={healthFilter}
          onChange={(e) => setHealthFilter(e.target.value as LeadHealth | '')}
          className="rounded-xl border border-border bg-surface-elevated/70 px-3 py-1.5 text-xs text-foreground font-medium shadow-xs focus:border-primary focus:outline-none transition-all"
        >
          <option value="">All Lead Health</option>
          <option value="ACTIVE">🔥 Active Cadence</option>
          <option value="ATTENTION">⚠️ Needs Attention</option>
          <option value="GOING_COLD">❄️ Going Cold</option>
        </select>

        {(assigneeFilter || priorityFilter || healthFilter) && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              setAssigneeFilter('')
              setPriorityFilter('')
              setHealthFilter('')
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Kanban Board */}
      {loading && !board ? (
        <div className="flex h-96 flex-col items-center justify-center gap-3 text-xs text-muted-foreground">
          <RefreshCw className="size-6 text-primary animate-spin" />
          <span>Synchronizing pipeline stages and health indices...</span>
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
