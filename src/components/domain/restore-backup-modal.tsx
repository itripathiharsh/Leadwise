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
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  UploadCloud,
  FileSpreadsheet,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Database,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RestoreBackupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type ModalStep = 'UPLOAD' | 'PREVIEW' | 'RESTORING' | 'SUCCESS' | 'ERROR'

export function RestoreBackupModal({ open, onOpenChange, onSuccess }: RestoreBackupModalProps) {
  const [step, setStep] = React.useState<ModalStep>('UPLOAD')
  const [file, setFile] = React.useState<File | null>(null)
  const [loadingPreview, setLoadingPreview] = React.useState(false)
  const [mode, setMode] = React.useState<'missing_only' | 'exact_overwrite'>('missing_only')
  const [preBackup, setPreBackup] = React.useState(true)
  const [confirmInput, setConfirmInput] = React.useState('')
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [previewData, setPreviewData] = React.useState<{
    valid: boolean
    totalSheets: number
    foundSheets: string[]
    missingSheets: string[]
    counts: Record<string, number>
    newRecordsCount: number
    existingRecordsCount: number
    foreignKeyOrphansCount: number
    roleConflicts?: Array<{ email: string; dbRole: string; fileRole: string; note: string }>
    warnings: string[]
    errors: string[]
    sheetDetails: {
      name: string
      rowsInFile: number
      newRows: number
      existingRows: number
      orphanRows: number
      warnings: string[]
    }[]
  } | null>(null)

  const [restoreResult, setRestoreResult] = React.useState<{
    success: boolean
    mode: string
    preRestoreBackupFile?: string
    restored: Record<string, number>
    skippedExisting: number
    totalProcessed: number
    message: string
  } | null>(null)

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const resetState = () => {
    setStep('UPLOAD')
    setFile(null)
    setLoadingPreview(false)
    setMode('missing_only')
    setPreBackup(true)
    setConfirmInput('')
    setErrorMessage(null)
    setPreviewData(null)
    setRestoreResult(null)
  }

  const handleFileSelected = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.xlsx')) {
      setErrorMessage('Please upload a valid Excel (.xlsx) backup file.')
      return
    }

    setFile(selectedFile)
    setLoadingPreview(true)
    setErrorMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('action', 'preview')

      const res = await fetch('/api/backups/restore', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setErrorMessage(data.error || 'Failed to inspect backup file.')
        setStep('ERROR')
        return
      }

      setPreviewData(data.preview)
      setStep('PREVIEW')
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Network error inspecting backup file.')
      setStep('ERROR')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleExecuteRestore = async () => {
    if (!file || confirmInput.trim().toUpperCase() !== 'RESTORE') return

    setStep('RESTORING')
    setErrorMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('action', 'restore')
      formData.append('mode', mode)
      formData.append('preBackup', preBackup ? 'true' : 'false')

      const res = await fetch('/api/backups/restore', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setErrorMessage(data.error || 'Restoration failed.')
        setStep('ERROR')
        return
      }

      setRestoreResult(data)
      setStep('SUCCESS')
      onSuccess?.()
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Network error executing database restore.')
      setStep('ERROR')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetState()
        onOpenChange(isOpen)
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Database className="size-4" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Restore CRM from Backup</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Safely inspect, validate, and restore relational data from a Leadwise Excel (.xlsx) archive.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* STEP 1: UPLOAD */}
          {step === 'UPLOAD' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelected(e.dataTransfer.files[0])
                  }
                }}
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                  'border-border hover:border-primary/50 hover:bg-primary/[0.02]',
                  loadingPreview && 'opacity-60 pointer-events-none',
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelected(e.target.files[0])
                    }
                  }}
                />

                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="size-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
                    {loadingPreview ? (
                      <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
                    ) : (
                      <UploadCloud className="size-6 text-primary" aria-hidden="true" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {loadingPreview ? 'Inspecting workbook & validating relations...' : 'Click to upload or drag & drop backup file'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Leadwise full relational backup workbook (.xlsx)
                    </p>
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="rounded-lg border border-border/80 bg-muted/30 p-4 text-xs space-y-2 text-muted-foreground">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
                  <span>Safety Guarantees Before Database Writes</span>
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>Full dry-run analysis validates all sheet structures, cuid formats, and foreign-key links.</li>
                  <li>No database changes occur until you review the preview and type &quot;RESTORE&quot;.</li>
                  <li>An automatic pre-restore backup snapshot is generated before any modification.</li>
                  <li>All writes occur inside an atomic database transaction with automatic rollback on error.</li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & DRY-RUN REPORT */}
          {step === 'PREVIEW' && previewData && (
            <div className="space-y-5">
              {/* Top Banner */}
              <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-muted/30 text-xs">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="size-4 text-primary" aria-hidden="true" />
                  <span className="font-medium text-foreground font-mono">{file?.name}</span>
                </div>
                {previewData.valid ? (
                  <Badge tone="emerald" size="sm">
                    <CheckCircle2 className="size-3 mr-1" aria-hidden="true" />
                    Valid Archive Structure
                  </Badge>
                ) : (
                  <Badge tone="rose" size="sm">
                    <AlertTriangle className="size-3 mr-1" aria-hidden="true" />
                    Structure Issues Found
                  </Badge>
                )}
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg border border-border/80 bg-muted/40 p-3">
                  <div className="text-[11px] text-muted-foreground font-medium">New Records</div>
                  <div className="text-base font-bold text-foreground mt-0.5 tabular-nums">
                    {previewData.newRecordsCount.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg border border-border/80 bg-muted/40 p-3">
                  <div className="text-[11px] text-muted-foreground font-medium">Existing in DB</div>
                  <div className="text-base font-bold text-foreground mt-0.5 tabular-nums">
                    {previewData.existingRecordsCount.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg border border-border/80 bg-muted/40 p-3">
                  <div className="text-[11px] text-muted-foreground font-medium">Orphan References</div>
                  <div className="text-base font-bold text-foreground mt-0.5 tabular-nums">
                    {previewData.foreignKeyOrphansCount}
                  </div>
                </div>
              </div>

              {/* Role Conflicts Alert */}
              {previewData.roleConflicts && previewData.roleConflicts.length > 0 && (
                <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs space-y-1.5 text-amber-950 dark:text-amber-200">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                    <span>Role Conflicts Detected ({previewData.roleConflicts.length})</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-muted-foreground pl-1 text-[11px]">
                    {previewData.roleConflicts.map((c, i) => (
                      <li key={i}>{c.note}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Mode Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Restoration Strategy</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={cn(
                      'flex flex-col justify-between p-3.5 rounded-lg border cursor-pointer transition-colors text-xs',
                      mode === 'missing_only'
                        ? 'border-primary bg-primary/[0.04] ring-1 ring-primary/30'
                        : 'border-border hover:bg-muted/30',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="radio"
                        name="restoreMode"
                        checked={mode === 'missing_only'}
                        onChange={() => setMode('missing_only')}
                        className="mt-0.5 text-primary"
                      />
                      <div>
                        <span className="font-semibold text-foreground">Restore Missing Only</span>
                        <p className="text-muted-foreground mt-0.5 leading-relaxed">
                          Recommended. Only inserts missing records. Existing database records are untouched.
                        </p>
                      </div>
                    </div>
                  </label>

                  <label
                    className={cn(
                      'flex flex-col justify-between p-3.5 rounded-lg border cursor-pointer transition-colors text-xs',
                      mode === 'exact_overwrite'
                        ? 'border-primary bg-primary/[0.04] ring-1 ring-primary/30'
                        : 'border-border hover:bg-muted/30',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="radio"
                        name="restoreMode"
                        checked={mode === 'exact_overwrite'}
                        onChange={() => setMode('exact_overwrite')}
                        className="mt-0.5 text-primary"
                      />
                      <div>
                        <span className="font-semibold text-foreground">Exact Overwrite</span>
                        <p className="text-muted-foreground mt-0.5 leading-relaxed">
                          Updates matching records to match backup values while preserving relationships.
                        </p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Pre-Restore Backup Checkbox */}
              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={preBackup}
                  onChange={(e) => setPreBackup(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary size-4"
                />
                <span className="font-medium">
                  Create automatic pre-restore backup snapshot before applying modifications (Recommended)
                </span>
              </label>

              {/* Sheet Breakdown Table */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-foreground">Relational Sheets Inventory</div>
                <div className="border border-border rounded-lg max-h-48 overflow-y-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-muted/60 sticky top-0 border-b border-border text-[11px] text-muted-foreground font-semibold">
                      <tr>
                        <th className="py-2 px-3">Entity Sheet</th>
                        <th className="py-2 px-3 text-right">Rows in File</th>
                        <th className="py-2 px-3 text-right">New</th>
                        <th className="py-2 px-3 text-right">Existing</th>
                        <th className="py-2 px-3 text-right">Orphans</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {previewData.sheetDetails.map((sheet) => (
                        <tr key={sheet.name} className="hover:bg-muted/20">
                          <td className="py-2 px-3 font-medium text-foreground">{sheet.name}</td>
                          <td className="py-2 px-3 text-right tabular-nums text-foreground/80">{sheet.rowsInFile}</td>
                          <td className="py-2 px-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                            {sheet.newRows}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">
                            {sheet.existingRows}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums">
                            {sheet.orphanRows > 0 ? (
                              <span className="text-amber-600 dark:text-amber-400 font-bold">{sheet.orphanRows}</span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* OWNER Confirmation Guard */}
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.04] p-3.5 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-amber-950 dark:text-amber-200">
                  <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  <span>OWNER Confirmation Required</span>
                </div>
                <p className="text-muted-foreground">
                  To execute restoration in <strong>{mode === 'missing_only' ? 'Missing Only' : 'Exact Overwrite'}</strong> mode, type{' '}
                  <strong className="text-foreground font-mono">RESTORE</strong> below:
                </p>
                <input
                  type="text"
                  placeholder="Type RESTORE to confirm"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-foreground font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary uppercase tracking-wider"
                />
              </div>
            </div>
          )}

          {/* STEP 3: RESTORING IN PROGRESS */}
          {step === 'RESTORING' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 className="size-10 animate-spin text-primary" aria-hidden="true" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">Executing Database Restoration</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Applying snapshot in topological dependency order within a safe database transaction. Please do not close this window.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS SUMMARY */}
          {step === 'SUCCESS' && restoreResult && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-start gap-3">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1 text-xs">
                  <h3 className="font-bold text-emerald-950 dark:text-emerald-200 text-sm">
                    Restoration Completed Successfully
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Database records have been restored while preserving stable IDs, timestamps, and relational integrity.
                  </p>
                  {restoreResult.preRestoreBackupFile && (
                    <div className="pt-1 text-[11px] text-muted-foreground">
                      Pre-restore snapshot saved:{' '}
                      <span className="font-mono text-foreground">{restoreResult.preRestoreBackupFile}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary Stats Table */}
              <div className="rounded-lg border border-border text-xs divide-y divide-border/60">
                <div className="p-3 bg-muted/40 font-semibold text-foreground flex justify-between">
                  <span>Entity Model</span>
                  <span>Restored Records</span>
                </div>
                {Object.entries(restoreResult.restored).map(([key, val]) => (
                  <div key={key} className="p-2.5 px-3 flex justify-between hover:bg-muted/20">
                    <span className="capitalize text-muted-foreground">{key}</span>
                    <span className="font-bold text-foreground tabular-nums">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: ERROR */}
          {step === 'ERROR' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-start gap-3">
                <AlertTriangle className="size-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1 text-xs">
                  <h3 className="font-bold text-rose-950 dark:text-rose-200 text-sm">Restoration Error</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {errorMessage || 'An unexpected error occurred during database restoration. No records were corrupted.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter className="p-4 px-6 border-t border-border flex items-center justify-between bg-muted/20">
          {step === 'UPLOAD' && (
            <div className="flex items-center justify-end w-full">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          )}

          {step === 'PREVIEW' && (
            <>
              <Button variant="outline" size="sm" onClick={() => setStep('UPLOAD')}>
                Choose Different File
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={confirmInput.trim().toUpperCase() !== 'RESTORE'}
                onClick={handleExecuteRestore}
                icon={<ArrowRight className="size-4" aria-hidden="true" />}
              >
                Execute Restoration
              </Button>
            </>
          )}

          {step === 'RESTORING' && (
            <div className="text-xs text-muted-foreground italic flex items-center gap-1.5 ml-auto">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Processing restore...
            </div>
          )}

          {step === 'SUCCESS' && (
            <div className="flex items-center justify-end w-full">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  resetState()
                  onOpenChange(false)
                }}
              >
                Done
              </Button>
            </div>
          )}

          {step === 'ERROR' && (
            <div className="flex items-center justify-between w-full">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button variant="primary" size="sm" onClick={resetState} icon={<RefreshCw className="size-3.5" aria-hidden="true" />}>
                Try Again
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
