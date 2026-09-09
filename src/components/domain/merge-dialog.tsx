'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Building2, ArrowRight, AlertTriangle, Check, Search } from 'lucide-react'
import { toast } from 'sonner'
import type { MergePreview } from '@/server/services/merge'

interface MergeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceId: string
  sourceName: string
  onSuccess?: () => void
}

export function MergeOrganisationDialog({
  open,
  onOpenChange,
  sourceId,
  sourceName,
  onSuccess,
}: MergeDialogProps) {
  const [targetId, setTargetId] = React.useState('')
  const [targetName, setTargetName] = React.useState('')
  const [query, setQuery] = React.useState('')
  const [searchResults, setSearchResults] = React.useState<any[]>([])
  const [searching, setSearching] = React.useState(false)

  const [preview, setPreview] = React.useState<MergePreview | null>(null)
  const [previewing, setPreviewing] = React.useState(false)
  const [merging, setMerging] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setTargetId('')
      setTargetName('')
      setQuery('')
      setSearchResults([])
      setPreview(null)
    }
  }, [open])

  // Search target organisations
  React.useEffect(() => {
    if (query.trim().length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&take=6`)
        if (res.ok) {
          const d = await res.json()
          setSearchResults(
            (d.organisations ?? []).filter((o: any) => o.id !== sourceId),
          )
        }
      } catch {
        // ignore
      } finally {
        setSearching(false)
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [query, sourceId])

  const handleSelectTarget = async (org: any) => {
    setTargetId(org.id)
    setTargetName(org.name)
    setPreviewing(true)

    try {
      const res = await fetch('/api/organisations/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, targetId: org.id, preview: true }),
      })

      if (res.ok) {
        const d = await res.json()
        setPreview(d.preview)
      }
    } catch {
      toast.error('Failed to load merge preview.')
    } finally {
      setPreviewing(false)
    }
  }

  const handleExecuteMerge = async () => {
    if (!targetId) return
    setMerging(true)
    try {
      const res = await fetch('/api/organisations/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, targetId, preview: false }),
      })

      const d = await res.json()
      if (res.ok) {
        toast.success(`Successfully merged ${sourceName} into ${targetName}`)
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(d.error || 'Failed to merge organisations.')
      }
    } catch {
      toast.error('Network error during merge.')
    } finally {
      setMerging(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </div>
            <div>
              <DialogTitle>Merge Duplicate Organisation</DialogTitle>
              <DialogDescription>
                Merge <strong>{sourceName}</strong> into another target record. All contacts, activities, and follow-ups will be preserved.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Target Selector */}
          {!targetId ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Search and select target organisation:
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Type organisation name or domain..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="rounded-lg border border-border bg-surface divide-y divide-border/60 max-h-48 overflow-y-auto">
                  {searchResults.map((org) => (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => handleSelectTarget(org)}
                      className="w-full flex items-center justify-between p-2.5 text-left text-xs hover:bg-muted transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-foreground">{org.name}</div>
                        <div className="text-[11px] text-muted-foreground">{org.category || org.location || 'Organisation'}</div>
                      </div>
                      <span className="text-xs text-primary font-medium">Select →</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-primary/30 bg-primary-soft/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">{sourceName}</span>
                  <ArrowRight className="size-4 text-primary" />
                  <span className="text-xs font-bold text-primary">{targetName}</span>
                </div>
                <Button variant="ghost" size="xs" onClick={() => setTargetId('')}>
                  Change Target
                </Button>
              </div>

              {preview && (
                <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-primary/20">
                  <div className="rounded-lg bg-surface p-2.5 border border-border space-y-1">
                    <div className="font-semibold text-muted-foreground">Source ({sourceName})</div>
                    <div>{preview.source.contactCount} contact(s) to transfer</div>
                    <div>{preview.source.activityCount} activity records to transfer</div>
                    <div>{preview.source.followUpCount} follow-ups to transfer</div>
                  </div>

                  <div className="rounded-lg bg-surface p-2.5 border border-border space-y-1">
                    <div className="font-semibold text-primary">Target Result ({targetName})</div>
                    <div>Total contacts: {preview.target.contactCount + preview.source.contactCount}</div>
                    <div>Total activities: {preview.target.activityCount + preview.source.activityCount}</div>
                    <div>Total follow-ups: {preview.target.followUpCount + preview.source.followUpCount}</div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                <AlertTriangle className="size-3.5 shrink-0" />
                <span>The source organisation will be archived, and history consolidated.</span>
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="button"
            disabled={!targetId}
            loading={merging}
            onClick={handleExecuteMerge}
            icon={<Check className="size-4" />}
          >
            Confirm Merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
