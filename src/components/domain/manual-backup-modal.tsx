'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Database,
  ExternalLink,
  Download,
  FolderSync,
} from 'lucide-react'

interface ManualBackupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type Stage = 'IDLE' | 'PREPARING' | 'EXPORTING' | 'VALIDATING' | 'UPLOADING' | 'DONE' | 'ERROR'

export function ManualBackupModal({ open, onOpenChange, onSuccess }: ManualBackupModalProps) {
  const [stage, setStage] = React.useState<Stage>('IDLE')
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<{
    recordId?: string
    fileName?: string
    fileSize?: number
    status?: string
    driveUrl?: string
    validation?: any
    errorMessage?: string
  } | null>(null)

  const resetState = () => {
    setStage('IDLE')
    setError(null)
    setResult(null)
  }

  const handleStartBackup = async () => {
    resetState()
    setStage('PREPARING')

    try {
      // Advance step visuals smoothly for responsive user experience
      setTimeout(() => setStage((s) => (s === 'PREPARING' ? 'EXPORTING' : s)), 600)
      setTimeout(() => setStage((s) => (s === 'EXPORTING' ? 'VALIDATING' : s)), 1400)
      setTimeout(() => setStage((s) => (s === 'VALIDATING' ? 'UPLOADING' : s)), 2200)

      const res = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'MANUAL' }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error || 'Failed to complete backup.')
        setStage('ERROR')
        return
      }

      setResult(data)
      setStage('DONE')
      onSuccess?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error during backup generation.')
      setStage('ERROR')
    }
  }

  const renderStep = (
    stepStage: Stage,
    label: string,
    currentStage: Stage,
  ) => {
    const order: Stage[] = ['PREPARING', 'EXPORTING', 'VALIDATING', 'UPLOADING', 'DONE']
    const currentIndex = order.indexOf(currentStage)
    const stepIndex = order.indexOf(stepStage)

    let icon = <div className="size-2 rounded-full bg-border" />
    let textColor = 'text-muted-foreground'

    if (currentStage === 'ERROR' && stepIndex <= currentIndex) {
      icon = <AlertTriangle className="size-4 text-rose-500 shrink-0" />
      textColor = 'text-rose-600 dark:text-rose-400 font-medium'
    } else if (currentIndex > stepIndex || currentStage === 'DONE') {
      icon = <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
      textColor = 'text-foreground font-medium'
    } else if (currentStage === stepStage) {
      icon = <Loader2 className="size-4 text-primary animate-spin shrink-0" />
      textColor = 'text-primary font-semibold'
    }

    return (
      <div className="flex items-center gap-3 py-1.5">
        <div className="flex size-5 items-center justify-center">{icon}</div>
        <span className={`text-sm ${textColor}`}>{label}</span>
      </div>
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (stage !== 'PREPARING' && stage !== 'EXPORTING' && stage !== 'VALIDATING' && stage !== 'UPLOADING') {
          onOpenChange(next)
          if (!next) resetState()
        }
      }}
    >
      <DialogContent size="md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Database className="size-5 text-primary" />
            <DialogTitle>Manual System Backup</DialogTitle>
          </div>
          <DialogDescription>
            Generate a full relational multi-sheet Excel backup and upload it directly to Google Drive.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {stage === 'IDLE' ? (
            <div className="rounded-lg border border-border/80 bg-muted/40 p-4 text-sm text-muted-foreground space-y-2">
              <p>This will export complete business data into separate Excel sheets:</p>
              <ul className="grid grid-cols-2 gap-1.5 text-xs text-foreground/80 pl-2">
                <li>• Organisations (with IDs)</li>
                <li>• Contacts & Designations</li>
                <li>• Activities & Outcomes</li>
                <li>• Follow-ups & Reminders</li>
                <li>• Users & Team Details</li>
                <li>• Reassignment Logs</li>
                <li>• EOD Reports & Metrics</li>
                <li>• System Metadata</li>
              </ul>
              <p className="pt-2 text-xs text-muted-foreground">
                The generated file is validated for relational integrity and uploaded to Google Drive.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-surface p-4 space-y-1">
              {renderStep('PREPARING', 'Preparing database export...', stage)}
              {renderStep('EXPORTING', 'Exporting organisations, contacts & activities...', stage)}
              {renderStep('VALIDATING', 'Validating multi-sheet relational integrity...', stage)}
              {renderStep('UPLOADING', 'Uploading backup to Google Drive...', stage)}
              {renderStep('DONE', 'Backup validated and recorded successfully!', stage)}
            </div>
          )}

          {/* Success summary */}
          {stage === 'DONE' && result && (
            <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-emerald-700 dark:text-emerald-300">
                  {result.status === 'SUCCESS' ? '✓ Backup Completed & Uploaded' : '✓ Backup Generated (Local Fallback)'}
                </span>
                <Badge tone={result.status === 'SUCCESS' ? 'emerald' : 'amber'} size="sm">
                  {result.status === 'SUCCESS' ? 'Google Drive Synced' : 'Drive Upload Pending'}
                </Badge>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <div>File: <span className="font-mono text-foreground">{result.fileName}</span></div>
                {result.validation && (
                  <div className="flex flex-wrap gap-2 pt-1 text-foreground/90">
                    <span>{result.validation.sheets?.find((s: any) => s.name === 'Organisations')?.rowCount ?? 0} Orgs</span>
                    <span>•</span>
                    <span>{result.validation.sheets?.find((s: any) => s.name === 'Contacts')?.rowCount ?? 0} Contacts</span>
                    <span>•</span>
                    <span>{result.validation.sheets?.find((s: any) => s.name === 'Activities')?.rowCount ?? 0} Activities</span>
                  </div>
                )}
                {result.errorMessage && (
                  <p className="text-amber-600 dark:text-amber-400 text-xs pt-1">
                    Notice: {result.errorMessage}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                {result.driveUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(result.driveUrl, '_blank')}
                    icon={<ExternalLink className="size-3.5" />}
                  >
                    Open in Google Drive
                  </Button>
                )}
                {result.recordId && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(`/api/backups/${result.recordId}/download`, '_blank')}
                    icon={<Download className="size-3.5" />}
                  >
                    Download Backup (.xlsx)
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Error notice */}
          {stage === 'ERROR' && error && (
            <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-300">
              <p className="font-semibold mb-1">Backup Failed</p>
              <p>{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {stage === 'IDLE' ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleStartBackup}
                icon={<FolderSync className="size-4" />}
              >
                Create Backup Now
              </Button>
            </>
          ) : stage === 'DONE' || stage === 'ERROR' ? (
            <Button variant="primary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          ) : (
            <Button variant="primary" disabled loading>
              Processing Backup...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
