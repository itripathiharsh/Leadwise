'use client'

import * as React from 'react'
import {
  CheckSquare,
  XCircle,
  UserPlus,
  ArrowUpDown,
  Trash2,
  Download,
  Flame,
  Shield,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface BulkActionsBarProps {
  selectedIds: string[]
  totalCount: number
  onSelectAll: () => void
  onClearSelection: () => void
  usersList: Array<{ id: string; name: string }>
  isLeader: boolean
  entityType: 'organisation' | 'contact'
  /** Data for selected items — used for client-side CSV export */
  selectedData?: Array<Record<string, unknown>>
  onRefresh: () => void
}

export function BulkActionsBar({
  selectedIds,
  totalCount,
  onSelectAll,
  onClearSelection,
  usersList,
  isLeader,
  entityType,
  selectedData,
  onRefresh,
}: BulkActionsBarProps) {
  const [loading, setLoading] = React.useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false)

  if (selectedIds.length === 0) return null

  const executeBulk = async (
    action: string,
    extra: Record<string, unknown> = {},
    successMsg?: string,
  ) => {
    setLoading(true)
    try {
      const res = await fetch('/api/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, orgIds: selectedIds, ...extra }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(successMsg || `Bulk ${action.toLowerCase()} applied to ${data.count} ${entityType}s.`)
        onClearSelection()
        onRefresh()
      } else {
        toast.error(data.error || `Bulk ${action.toLowerCase()} failed.`)
      }
    } catch {
      toast.error('Network error during bulk operation.')
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    if (!selectedData || selectedData.length === 0) {
      toast.error('No data to export.')
      return
    }

    const headers = Object.keys(selectedData[0]!)
    const csvRows = [
      headers.join(','),
      ...selectedData.map((row) =>
        headers.map((h) => {
          const val = row[h]
          const str = val === null || val === undefined ? '' : String(val)
          // Escape commas and quotes
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str
        }).join(',')
      ),
    ]

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `leadwise_${entityType}s_export_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(`Exported ${selectedData.length} ${entityType}s to CSV.`)
  }

  const handleDelete = async () => {
    setConfirmDeleteOpen(false)
    await executeBulk('DELETE', {}, `Archived ${selectedIds.length} ${entityType}s.`)
  }

  const allSelected = selectedIds.length === totalCount

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/10 backdrop-blur-xl p-3 shadow-lg animate-in fade-in slide-in-from-top-1">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-white bg-primary px-2.5 py-0.5 rounded-full shadow-xs">
            {selectedIds.length} Selected
          </span>
          <button
            type="button"
            onClick={allSelected ? onClearSelection : onSelectAll}
            className="text-[11px] font-medium text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
          >
            {allSelected ? 'Clear Selection' : 'Select All'}
          </button>
          <button
            type="button"
            onClick={onClearSelection}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <XCircle className="size-3.5" />
            Clear
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Assign Owner */}
          {isLeader && usersList.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="xs"
                  disabled={loading}
                  icon={<UserPlus className="size-3.5" />}
                  className="text-xs border-border/80 bg-surface/90"
                >
                  Assign
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 p-1.5 space-y-0.5 max-h-64 overflow-y-auto">
                <DropdownMenuItem
                  onClick={() => executeBulk('ASSIGN', { assignedToId: null }, `Unassigned ${selectedIds.length} ${entityType}s.`)}
                  className="text-xs cursor-pointer rounded-md py-1.5"
                >
                  Unassign (Open Pool)
                </DropdownMenuItem>
                {usersList.map((u) => (
                  <DropdownMenuItem
                    key={u.id}
                    onClick={() => executeBulk('ASSIGN', { assignedToId: u.id }, `Assigned to ${u.name}.`)}
                    className="text-xs cursor-pointer rounded-md py-1.5"
                  >
                    {u.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Change Status */}
          {entityType === 'organisation' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="xs"
                  disabled={loading}
                  icon={<ArrowUpDown className="size-3.5" />}
                  className="text-xs border-border/80 bg-surface/90"
                >
                  Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 p-1.5 space-y-0.5">
                {(['ASSIGNED', 'CONTACTED', 'RESPONDED', 'MEETING', 'INTERESTED', 'PARTNERSHIP', 'REJECTED'] as const).map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => executeBulk('STATUS', { status: s })}
                    className="text-xs cursor-pointer rounded-md py-1.5"
                  >
                    {s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Change Priority */}
          {entityType === 'organisation' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="xs"
                  disabled={loading}
                  icon={<Flame className="size-3.5" />}
                  className="text-xs border-border/80 bg-surface/90"
                >
                  Priority
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 p-1.5 space-y-0.5">
                {(['HIGH', 'MEDIUM', 'LOW'] as const).map((p) => (
                  <DropdownMenuItem
                    key={p}
                    onClick={() => executeBulk('PRIORITY', { priority: p })}
                    className="text-xs cursor-pointer rounded-md py-1.5"
                  >
                    {p} Priority
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Export CSV */}
          <Button
            variant="outline"
            size="xs"
            onClick={handleExportCSV}
            disabled={loading}
            icon={<Download className="size-3.5" />}
            className="text-xs border-border/80 bg-surface/90"
          >
            Export
          </Button>

          {/* Delete / Archive — OWNER/TL only */}
          {isLeader && entityType === 'organisation' && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={loading}
              icon={<Trash2 className="size-3.5" />}
              className="text-xs border-rose-500/40 text-rose-500 hover:bg-rose-500/10 bg-surface/90"
            >
              Archive
            </Button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Archive {selectedIds.length} {entityType}s?</DialogTitle>
            <DialogDescription>
              This will soft-delete the selected {entityType}s and their associated contacts. They can be restored from backups. This action is audited.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">This action will archive {selectedIds.length} {entityType}{selectedIds.length !== 1 ? 's' : ''} and all associated contacts.</p>
                <p className="mt-1 text-muted-foreground">Records are soft-deleted and can be restored.</p>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDelete}
              loading={loading}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Confirm Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
