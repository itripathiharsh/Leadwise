'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Building2,
  Clock,
  User,
  Flame,
  AlertTriangle,
  Snowflake,
  MoreVertical,
  Plus,
  Phone,
  Mail,
  ChevronRight,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { formatDate } from '@/lib/dates'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { PipelineBoard, PipelineCardItem } from '@/server/services/pipeline'
import type { OrgStatus } from '@prisma/client'

const STAGE_CONFIG: Record<
  OrgStatus,
  { label: string; tone: 'slate' | 'blue' | 'indigo' | 'teal' | 'amber' | 'violet' | 'emerald' | 'rose'; description: string }
> = {
  NEW: { label: 'New Leads', tone: 'slate', description: 'Fresh targets to qualify' },
  ASSIGNED: { label: 'Assigned', tone: 'blue', description: 'Allocated to rep' },
  CONTACTED: { label: 'Contacted', tone: 'indigo', description: 'Outreach initiated' },
  RESPONDED: { label: 'Responded', tone: 'teal', description: 'Contact replied / engaged' },
  INTERESTED: { label: 'Interested', tone: 'amber', description: 'Keen on partnership' },
  MEETING: { label: 'Meeting', tone: 'violet', description: 'Call / Demo scheduled' },
  PARTNERSHIP: { label: 'Partnership', tone: 'emerald', description: 'Active partnership agreed' },
  REJECTED: { label: 'Rejected / Cold', tone: 'rose', description: 'Declined or unresponsive' },
}

const REJECTION_REASONS = [
  'Not relevant / wrong fit',
  'No partnership requirement',
  'Already has similar solution',
  'No response after multiple follow-ups',
  'Budget / commercial constraints',
  'Timing not right (revisit later)',
  'Not reached decision maker',
  'Other',
]

export function PipelineKanban({
  initialData,
  onRefresh,
}: {
  initialData: PipelineBoard
  onRefresh: () => void
}) {
  const [board, setBoard] = React.useState<PipelineBoard>(initialData)
  const [draggedItemId, setDraggedItemId] = React.useState<string | null>(null)
  const [moving, setMoving] = React.useState(false)

  // Rejection modal state
  const [rejectionModalOpen, setRejectionModalOpen] = React.useState(false)
  const [pendingRejectOrg, setPendingRejectOrg] = React.useState<PipelineCardItem | null>(null)
  const [rejectionReason, setRejectionReason] = React.useState(REJECTION_REASONS[0])
  const [rejectionNote, setRejectionNote] = React.useState('')

  React.useEffect(() => {
    setBoard(initialData)
  }, [initialData])

  const executeStageMove = async (
    orgId: string,
    targetStatus: OrgStatus,
    reason?: string,
    note?: string,
  ) => {
    setMoving(true)
    try {
      const res = await fetch('/api/pipeline', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orgId,
          status: targetStatus,
          rejectionReason: reason,
          rejectionNote: note,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        toast.error(data.error || 'Failed to move stage.')
        return
      }

      toast.success(`Moved to ${STAGE_CONFIG[targetStatus].label}`)
      onRefresh()
    } catch {
      toast.error('Network error moving stage.')
    } finally {
      setMoving(false)
      setDraggedItemId(null)
    }
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
    setDraggedItemId(id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: OrgStatus) => {
    e.preventDefault()
    const orgId = e.dataTransfer.getData('text/plain') || draggedItemId
    if (!orgId) return

    // Find the item
    let currentItem: PipelineCardItem | null = null
    for (const st of Object.keys(board.columns) as OrgStatus[]) {
      const found = board.columns[st].find((i) => i.id === orgId)
      if (found) {
        currentItem = found
        break
      }
    }

    if (!currentItem || currentItem.status === targetStatus) return

    // If moving to REJECTED, open reason modal
    if (targetStatus === 'REJECTED') {
      setPendingRejectOrg(currentItem)
      setRejectionModalOpen(true)
      return
    }

    await executeStageMove(orgId, targetStatus)
  }

  const handleConfirmRejection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pendingRejectOrg) return

    await executeStageMove(
      pendingRejectOrg.id,
      'REJECTED',
      rejectionReason,
      rejectionNote.trim() || undefined,
    )

    setRejectionModalOpen(false)
    setPendingRejectOrg(null)
    setRejectionNote('')
  }

  const stages = Object.keys(STAGE_CONFIG) as OrgStatus[]

  return (
    <div className="space-y-4">
      {/* Horizontal Scrollable Kanban Columns */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 snap-x min-h-[75vh]">
        {stages.map((stage) => {
          const config = STAGE_CONFIG[stage]
          const items = board.columns[stage] || []
          const count = board.counts[stage] || 0

          return (
            <div
              key={stage}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage)}
              className="flex flex-col w-80 shrink-0 rounded-2xl border border-border/80 bg-surface-muted/40 p-3 shadow-xs transition-colors hover:border-border-strong snap-start"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border/60 px-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-foreground">
                    {config.label}
                  </span>
                  <Badge tone={config.tone} size="sm">
                    {count}
                  </Badge>
                </div>
              </div>

              {/* Cards list */}
              <div className="flex-1 overflow-y-auto pt-3 space-y-3 min-h-[120px]">
                {items.length === 0 ? (
                  <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border/70 text-[11px] text-muted-foreground">
                    Drop organisation here
                  </div>
                ) : (
                  items.map((org) => (
                    <div
                      key={org.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, org.id)}
                      className={cn(
                        'group rounded-xl border border-border bg-surface p-3.5 shadow-xs transition-all duration-150 hover:border-primary/50 hover:shadow-md cursor-grab active:cursor-grabbing space-y-2.5',
                        draggedItemId === org.id && 'opacity-50',
                      )}
                    >
                      {/* Top row: Priority & Health */}
                      <div className="flex items-center justify-between gap-1.5">
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

                        {/* Health Badge */}
                        <div className="flex items-center gap-1">
                          {org.health === 'ACTIVE' && (
                            <span
                              title="Active: recent contact logged or scheduled follow-up"
                              className="inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md"
                            >
                              <Flame className="size-3" /> Active
                            </span>
                          )}
                          {org.health === 'ATTENTION' && (
                            <span
                              title={`Needs Attention: ${org.daysSinceContact} days since last contact`}
                              className="inline-flex items-center gap-0.5 text-[11px] font-medium text-orange-600 dark:text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded-md"
                            >
                              <AlertTriangle className="size-3" /> {org.daysSinceContact}d
                            </span>
                          )}
                          {org.health === 'GOING_COLD' && (
                            <span
                              title={`Going Cold: ${org.daysSinceContact} days inactive`}
                              className="inline-flex items-center gap-0.5 text-[11px] font-medium text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded-md"
                            >
                              <Snowflake className="size-3" /> Cold ({org.daysSinceContact}d)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Organisation Name & Domain */}
                      <div>
                        <Link
                          href={`/organisations/${org.id}`}
                          className="font-bold text-xs text-foreground hover:text-primary transition-colors line-clamp-1"
                        >
                          {org.name}
                        </Link>
                        {org.category && (
                          <span className="text-[11px] text-muted-foreground block truncate mt-0.5">
                            {org.category} {org.location ? `· ${org.location}` : ''}
                          </span>
                        )}
                      </div>

                      {/* Primary Contact */}
                      {org.primaryContact && (
                        <div className="rounded-lg bg-surface-muted/60 p-2 text-xs border border-border/40 space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-foreground truncate">
                              {org.primaryContact.name}
                            </span>
                            {org.primaryContact.isDecisionMaker && (
                              <Badge tone="amber" size="sm">DM</Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {org.primaryContact.designation || 'Key Stakeholder'}
                          </div>
                        </div>
                      )}

                      {/* Next Action / Recommended Action */}
                      <div className="text-[11px] text-foreground/90 space-y-1 pt-1 border-t border-border/50">
                        {org.nextAction ? (
                          <div className="font-medium text-primary line-clamp-1">
                            🎯 {org.nextAction}
                          </div>
                        ) : (
                          <div className="text-muted-foreground italic line-clamp-1">
                            💡 {org.recommendedAction}
                          </div>
                        )}

                        {org.nextFollowupAt && (
                          <div className="text-[10px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Clock className="size-2.5" />
                            Due {formatDate(org.nextFollowupAt)}
                          </div>
                        )}
                      </div>

                      {/* Footer: Assignee & Stage quick jump */}
                      <div className="flex items-center justify-between pt-1 text-xs">
                        {org.assignedTo ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar
                              name={org.assignedTo.name}
                              color={org.assignedTo.avatarColor}
                              size="xs"
                            />
                            <span className="text-[11px] text-muted-foreground truncate max-w-[90px]">
                              {org.assignedTo.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">Unassigned</span>
                        )}

                        <select
                          value={org.status}
                          onChange={(e) => {
                            const newSt = e.target.value as OrgStatus
                            if (newSt === 'REJECTED') {
                              setPendingRejectOrg(org)
                              setRejectionModalOpen(true)
                            } else {
                              executeStageMove(org.id, newSt)
                            }
                          }}
                          className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground focus:outline-none"
                        >
                          {stages.map((s) => (
                            <option key={s} value={s}>
                              Move: {STAGE_CONFIG[s].label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Rejection Reason Modal */}
      <Dialog open={rejectionModalOpen} onOpenChange={setRejectionModalOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Reason for Marking Rejected / Cold</DialogTitle>
            <DialogDescription>
              Record why {pendingRejectOrg?.name} is not proceeding with the partnership.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmRejection} className="flex flex-col flex-1 overflow-hidden">
            <DialogBody className="space-y-4">
              <Field label="Primary Rejection Reason" required>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {REJECTION_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Additional Context / Notes">
                <textarea
                  rows={3}
                  placeholder="Details of the conversation, objections, or when to revisit..."
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface p-3 text-sm text-foreground shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y min-h-[72px]"
                />
              </Field>
            </DialogBody>

            <DialogFooter>
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  setRejectionModalOpen(false)
                  setPendingRejectOrg(null)
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={moving}>
                Confirm Rejection
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
