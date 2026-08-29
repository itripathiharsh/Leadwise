'use client'

import * as React from 'react'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RefreshCw,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { formatDateTime } from '@/lib/dates'
import { toast } from 'sonner'

export default function ImportPage() {
  const [file, setFile] = React.useState<File | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const [committing, setCommitting] = React.useState(false)

  const [preview, setPreview] = React.useState<any>(null)
  const [commitResult, setCommitResult] = React.useState<any>(null)
  const [batches, setBatches] = React.useState<any[]>([])

  const fetchBatches = React.useCallback(async () => {
    try {
      const res = await fetch('/api/import')
      if (res.ok) {
        const d = await res.json()
        setBatches(d.batches ?? [])
      }
    } catch {
      // ignore
    }
  }, [])

  React.useEffect(() => {
    fetchBatches()
  }, [fetchBatches])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    setFile(selected)
    setPreview(null)
    setCommitResult(null)
    setUploading(true)

    const formData = new FormData()
    formData.append('file', selected)

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        toast.error(data.error || 'Failed to parse spreadsheet.')
        setUploading(false)
        return
      }

      setPreview(data)
      toast.success(`Parsed ${data.summary.totalRows} rows from ${selected.name}`)
    } catch {
      toast.error('Network error uploading spreadsheet.')
    } finally {
      setUploading(false)
    }
  }

  const handleCommit = async () => {
    if (!preview?.batchId) return
    setCommitting(true)

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: preview.batchId,
          mapping: preview.mapping,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        toast.error(data.error || 'Failed to commit import.')
        setCommitting(false)
        return
      }

      setCommitResult(data)
      setPreview(null)
      toast.success('Spreadsheet data imported into CRM successfully!')
      fetchBatches()
    } catch {
      toast.error('Network error during import.')
    } finally {
      setCommitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="border-b border-border pb-5">
        <div className="flex items-center gap-2.5">
          <Upload className="size-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Excel Spreadsheet Import
          </h1>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Import organisations, contacts, and outreach records from Excel (.xlsx) with duplicate protection.
        </p>
      </div>

      {/* Upload Box */}
      <Card className="border-dashed border-2 border-border/80 bg-surface shadow-xs text-center p-8">
        <div className="max-w-md mx-auto space-y-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto">
            <FileSpreadsheet className="size-6" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">
              Select or drop your Leadwise Excel file
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports .xlsx spreadsheets up to 5,000 rows. Existing CRM data will not be overwritten.
            </p>
          </div>

          <label className="inline-block">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button variant="primary" size="md" asChild loading={uploading}>
              <span>Choose Excel File</span>
            </Button>
          </label>
        </div>
      </Card>

      {/* Preview & Validation Report */}
      {preview && (
        <Card className="border-border shadow-xs space-y-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Import Validation Preview</CardTitle>
                <CardDescription>File: {file?.name}</CardDescription>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCommit}
                loading={committing}
                icon={<ArrowRight className="size-4" />}
              >
                Confirm & Import Records
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border bg-surface p-3 text-center">
                <div className="text-xs text-muted-foreground font-medium">Total Rows</div>
                <div className="text-lg font-bold text-foreground mt-0.5">
                  {preview.summary?.totalRows ?? 0}
                </div>
              </div>

              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
                <div className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Valid Records</div>
                <div className="text-lg font-bold text-emerald-600 mt-0.5">
                  {preview.summary?.valid ?? 0}
                </div>
              </div>

              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-center">
                <div className="text-xs text-amber-700 dark:text-amber-300 font-medium">Duplicates Detected</div>
                <div className="text-lg font-bold text-amber-600 mt-0.5">
                  {preview.summary?.duplicates ?? 0}
                </div>
              </div>

              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-center">
                <div className="text-xs text-rose-700 dark:text-rose-300 font-medium">Invalid / Skipped</div>
                <div className="text-lg font-bold text-rose-600 mt-0.5">
                  {preview.summary?.invalid ?? 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Summary */}
      {commitResult && (
        <Card className="border-emerald-500/30 bg-emerald-500/10 p-6 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-base">
            <CheckCircle2 className="size-5" /> Import Completed Successfully!
          </div>
          <p className="text-xs text-foreground/90">
            {commitResult.imported} organisations created, {commitResult.updated} updated, and{' '}
            {commitResult.contactsCreated} contacts added.
          </p>
        </Card>
      )}

      {/* Past Import Batches */}
      {batches.length > 0 && (
        <Card className="border-border shadow-xs">
          <CardHeader>
            <CardTitle className="text-base">Recent Import Batches</CardTitle>
            <CardDescription>History of uploaded spreadsheets and row statistics.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">File Name</th>
                    <th className="py-2.5 px-3 text-right">Imported</th>
                    <th className="py-2.5 px-3 text-right">Updated</th>
                    <th className="py-2.5 px-3 text-right">Duplicates</th>
                    <th className="py-2.5 px-3">Uploaded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {batches.map((b) => (
                    <tr key={b.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-xs text-foreground">
                        {formatDateTime(b.createdAt)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-foreground">{b.fileName}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs font-semibold text-emerald-600">
                        {b.imported}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs">{b.updated}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs text-amber-600">
                        {b.skippedDuplicates}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-muted-foreground">{b.uploadedBy.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
