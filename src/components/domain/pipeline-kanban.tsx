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
  Star,
  Target,
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

export const PIPELINE_STAGES: OrgStatus[] = [
  'ASSIGNED',
  'CONTACTED',
  'RESPONDED',
  'MEETING',
  'INTERESTED',
  'PARTNERSHIP',
  'REJECTED',
]

const STAGE_CONFIG: Record<
  OrgStatus,
  { label: string; tone: 'slate' | 'blue' | 'indigo' | 'cyan' | 'teal' | 'amber' | 'violet' | 'emerald' | 'rose'; barColor: string; description: string }
> = {
  NEW: { label: 'Assigned', tone: 'blue', barColor: 'bg-blue-500', description: 'Allocated to rep' },
  ASSIGNED: { label: 'Assigned', tone: 'blue', barColor: 'bg-blue-500', description: 'Allocated to rep' },
  CONTACTED: { label: 'Contacted', tone: 'indigo', barColor: 'bg-indigo-500', description: 'Outreach initiated' },
  RESPONDED: { label: 'Responded', tone: 'cyan', barColor: 'bg-cyan-500', description: 'Contact replied / engaged' },
  MEETING: { label: 'Meeting Scheduled', tone: 'violet', barColor: 'bg-violet-500', description: 'Call / Demo scheduled' },
  INTERESTED: { label: 'Warm / Interested', tone: 'amber', barColor: 'bg-amber-500', description: 'Keen on partnership' },
  PARTNERSHIP: { label: 'Partnership Signed', tone: 'emerald', barColor: 'bg-emerald-500', description: 'Active partnership signed' },
  REJECTED: { label: 'Disqualified / Cold', tone: 'rose', barColor: 'bg-rose-500', description: 'Declined or unresponsive' },
}

const REJECTION_REASONS = [
  'Not relevant / wrong clinical fit',
  'No partnership requirement',
  'Already has competing solution',
  'No response after multiple touchpoints',
  'Budget / commercial constraints',
  'Timing not right (revisit next quarter)',
  'Not reached authenticated decision maker',
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

      toast.success(`Moved to ${STAGE_CONFIG[targetStatus].label} ✓`)
      onRefresh()
    } catch {
      toast.error('Network error moving stage.')
    } finally {
      setMoving(false)
      setDraggedItemId(null)
    }
  }

  const [dragOverStage, setDragOverStage] = React.useState<OrgStatus | null>(null)

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
    setDraggedItemId(id)
  }

  const handleDragOver = (e: React.DragEvent, stage: OrgStatus) => {
    e.preventDefault()
    if (dragOverStage !== stage) {
      setDragOverStage(stage)
    }
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: OrgStatus) => {
    e.preventDefault()
    setDragOverStage(null)
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

  const stages = PIPELINE_STAGES

  return (
    <div className="space-y-4">
      {/* Horizontal Scrollable Kanban Columns */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 snap-x min-h-[78vh]">
        {stages.map((stage) => {
          const config = STAGE_CONFIG[stage]
          const items = stage === 'ASSIGNED'
            ? [...(board.columns['ASSIGNED'] || []), ...(board.columns['NEW'] || [])]
            : (board.columns[stage] || [])
          const count = stage === 'ASSIGNED'
            ? (board.counts['ASSIGNED'] || 0) + (board.counts['NEW'] || 0)
            : (board.counts[stage] || 0)

          return (
            <div
              key={stage}
              onDragOver={(e) => handleDragOver(e, stage)}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={(e) => handleDrop(e, stage)}
              className={cn(
                'flex flex-col w-[320px] shrink-0 rounded-2xl border bg-surface/70 backdrop-blur-xl p-3 shadow-md transition-all duration-200 snap-start rim-highlight',
                dragOverStage === stage
                  ? 'border-primary/80 bg-primary/10 shadow-2xl ring-2 ring-primary/40 scale-[1.01]'
                  : 'border-border/80 hover:border-border',
              )}
            >
              {/* Top Accent Strip */}
              <div className={cn('h-1 w-full rounded-full mb-3', config.barColor)} />

              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border/60 px-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-foreground">
                    {config.label}
                  </span>
                  <span className="font-mono text-[11px] font-bold px-2 py-0.2 rounded-full bg-surface-elevated text-foreground border border-border/80">
                    {count}
                  </span>
                </div>
              </div>

              {/* Cards list */}
              <div className="flex-1 overflow-y-auto pt-3 space-y-3 min-h-[140px]">
                {items.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-border/60 text-[11px] text-muted-foreground/70">
                    <span>Drop target entity here</span>
                  </div>
                ) : (
                  items.map((org) => (
                    <div
                      key={org.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, org.id)}
                      className={cn(
                        'group rounded-xl border border-border/80 bg-surface-elevated/70 backdrop-blur-md p-3.5 shadow-sm transition-all duration-200 hover:border-primary/60 hover:shadow-xl hover:-translate-y-0.5 cursor-grab active:cursor-grabbing active:scale-[1.02] active:ring-2 active:ring-primary space-y-2.5',
                        draggedItemId === org.id && 'opacity-40 scale-95',
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
                              className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20"
                            >
                              <Flame className="size-3 fill-amber-400 text-amber-400" /> Active
                            </span>
                          )}
                          {org.health === 'ATTENTION' && (
                            <span
                              title={`Needs Attention: ${org.daysSinceContact} days since last contact`}
                              className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20"
                            >
                              <AlertTriangle className="size-3 text-orange-400" /> {org.daysSinceContact}d
                            </span>
                          )}
                          {org.health === 'GOING_COLD' && (
                            <span
                              title={`Going Cold: ${org.daysSinceContact} days inactive`}
                              className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20"
                            >
                              <Snowflake className="size-3 text-sky-400" /> Cold ({org.daysSinceContact}d)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Organisation Name & Domain */}
                      <div>
                        <Link
                          href={`/organisations/${org.id}`}
                          className="font-bold text-xs text-foreground hover:text-primary transition-colors line-clamp-1 flex items-center justify-between group-hover:text-primary"
                        >
                          <span>{org.name}</span>
                          <ChevronRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        {org.category && (
                          <span className="text-[11px] text-muted-foreground block truncate mt-0.5">
                            {org.category} {org.location ? `· ${org.location}` : ''}
                          </span>
                        )}
                      </div>

                      {/* Primary Contact */}
                      {org.primaryContact && (
                        <div className="rounded-lg bg-surface/80 p-2 text-xs border border-border/50 space-y-0.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-foreground truncate text-xs">
                              {org.primaryContact.name}
                            </span>
                            {org.primaryContact.isDecisionMaker && (
                              <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                DM
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {org.primaryContact.designation || 'Key Stakeholder'}
                          </div>
                        </div>
                      )}

                      {/* Next Action / Recommended Action */}
                      <div className="text-[11px] text-foreground/90 space-y-1 pt-1.5 border-t border-border/50">
                        {org.nextAction ? (
                          <div className="font-medium text-primary line-clamp-1 flex items-center gap-1">
                            <Target className="size-3 text-primary shrink-0" />
                            <span className="truncate">{org.nextAction}</span>
                          </div>
                        ) : (
                          <div className="text-muted-foreground/80 italic line-clamp-1 flex items-center gap-1">
                            <Sparkles className="size-3 text-amber-400 shrink-0" />
                            <span className="truncate">{org.recommendedAction}</span>
                          </div>
                        )}

                        {org.nextFollowupAt && (
                          <div className="text-[10px] font-mono font-medium text-amber-400 flex items-center gap-1">
                            <Clock className="size-2.5" />
                            Due {formatDate(org.nextFollowupAt)}
                          </div>
                        )}
                      </div>

                      {/* Footer: Assignee & Stage quick jump */}
                      <div className="flex items-center justify-between pt-1.5 text-xs border-t border-border/40">
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
                          <span className="text-[10px] text-muted-foreground italic font-mono">Unassigned</span>
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
                          className="rounded-lg border border-border/80 bg-surface px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
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
            <DialogTitle>Mark Target as Disqualified / Cold</DialogTitle>
            <DialogDescription>
              Record the intelligence reason why {pendingRejectOrg?.name} is not proceeding with this partnership.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmRejection} className="flex flex-col flex-1 overflow-hidden">
            <DialogBody className="space-y-4">
              <Field label="Primary Reason" required>
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

              <Field label="Tactical Context / Debrief Notes">
                <textarea
                  rows={3}
                  placeholder="Details of objections, gatekeeper hurdles, or when to revisit..."
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
