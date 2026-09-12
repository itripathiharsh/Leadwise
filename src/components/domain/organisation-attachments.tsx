'use client'

import * as React from 'react'
import {
  Paperclip,
  Upload,
  FileText,
  Download,
  Trash2,
  AlertCircle,
  File,
  CheckCircle2,
  Clock,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/dates'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AttachmentItem {
  id: string
  filename: string
  fileSize: number
  mimeType: string
  createdAt: string
  uploadedById: string
  uploadedBy?: { id: string; name: string }
}

const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.msi', '.ps1', '.vbs', '.wsf',
  '.com', '.scr', '.pif', '.hta', '.cpl', '.msc', '.jar',
]

const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB

function isFileSafe(file: File): { safe: boolean; reason?: string } {
  const name = file.name.toLowerCase()
  const ext = name.substring(name.lastIndexOf('.'))
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return { safe: false, reason: `File type ${ext} is not allowed for security reasons.` }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { safe: false, reason: `File size exceeds the 4MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).` }
  }
  return { safe: true }
}

export function OrganisationAttachments({
  organisationId,
  canEdit = true,
}: {
  organisationId: string
  canEdit?: boolean
}) {
  const [attachments, setAttachments] = React.useState<AttachmentItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [uploading, setUploading] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null)
  const [uploadFileName, setUploadFileName] = React.useState<string | null>(null)
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [isDragOver, setIsDragOver] = React.useState(false)
  const [uploadSuccess, setUploadSuccess] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const dropZoneRef = React.useRef<HTMLDivElement>(null)

  const fetchAttachments = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/attachments?organisationId=${encodeURIComponent(organisationId)}`)
      if (res.ok) {
        const json = await res.json()
        setAttachments(json.attachments || [])
      }
    } catch {
      toast.error('Failed to load organisation attachments.')
    } finally {
      setLoading(false)
    }
  }, [organisationId])

  React.useEffect(() => {
    fetchAttachments()
  }, [fetchAttachments])

  const uploadFile = async (file: File) => {
    const check = isFileSafe(file)
    if (!check.safe) {
      toast.error(check.reason!)
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('organisationId', organisationId)

    setUploading(true)
    setUploadFileName(file.name)
    setUploadProgress(0)
    setUploadSuccess(false)

    try {
      // Use XMLHttpRequest for upload progress
      const result = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/attachments')

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100))
          }
        })

        xhr.addEventListener('load', () => {
          try {
            const json = JSON.parse(xhr.responseText)
            if (xhr.status >= 200 && xhr.status < 300 && json.success) {
              resolve({ ok: true })
            } else {
              resolve({ ok: false, error: json.error || 'Upload failed.' })
            }
          } catch {
            resolve({ ok: false, error: 'Invalid server response.' })
          }
        })

        xhr.addEventListener('error', () => {
          resolve({ ok: false, error: 'Network error during upload.' })
        })

        xhr.send(formData)
      })

      if (result.ok) {
        setUploadSuccess(true)
        toast.success(`Attached ${file.name} successfully.`)
        fetchAttachments()
        // Reset success indicator after brief display
        setTimeout(() => setUploadSuccess(false), 2000)
      } else {
        toast.error(result.error || 'Failed to upload attachment.')
      }
    } catch {
      toast.error('Error uploading attachment.')
    } finally {
      setUploading(false)
      setUploadProgress(null)
      setUploadFileName(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Upload files sequentially
    for (const file of Array.from(files)) {
      await uploadFile(file)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (!canEdit) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    for (const file of files) {
      await uploadFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (canEdit) setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set drag over false if we're actually leaving the drop zone
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && canEdit) {
      e.preventDefault()
      fileInputRef.current?.click()
    }
  }

  const handleDownload = async (item: AttachmentItem) => {
    try {
      setDownloadingId(item.id)
      const res = await fetch(`/api/attachments?attachmentId=${encodeURIComponent(item.id)}`)
      if (res.ok) {
        const json = await res.json()
        if (json.attachment?.contentBase64) {
          const byteCharacters = atob(json.attachment.contentBase64)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const blob = new Blob([byteArray], { type: item.mimeType || 'application/octet-stream' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = item.filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        } else {
          toast.error('File data unavailable.')
        }
      } else {
        toast.error('Failed to download attachment.')
      }
    } catch {
      toast.error('Error downloading file.')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDelete = async (item: AttachmentItem) => {
    if (!confirm(`Are you sure you want to delete ${item.filename}?`)) return
    try {
      setDeletingId(item.id)
      const res = await fetch(`/api/attachments?id=${encodeURIComponent(item.id)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success(`Deleted ${item.filename}`)
        fetchAttachments()
      } else {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error || 'Failed to delete attachment.')
      }
    } catch {
      toast.error('Error deleting attachment.')
    } finally {
      setDeletingId(null)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        disabled={uploading}
        multiple
        aria-label="Upload document files"
      />

      {/* Drag-and-Drop Upload Zone */}
      {canEdit && (
        <div
          ref={dropZoneRef}
          role="button"
          tabIndex={0}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onKeyDown={handleKeyDown}
          onClick={() => !uploading && fileInputRef.current?.click()}
          aria-label="Drop files here to upload or click to browse"
          className={cn(
            'relative rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 cursor-pointer outline-none',
            'focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/60',
            isDragOver
              ? 'border-primary bg-primary/10 scale-[1.01] shadow-lg shadow-primary/10'
              : uploadSuccess
                ? 'border-emerald-500/60 bg-emerald-500/10'
                : 'border-border/60 bg-surface/30 hover:border-border hover:bg-surface/50',
          )}
        >
          {/* Upload Progress Overlay */}
          {uploading && uploadProgress !== null && (
            <div className="space-y-3">
              <Upload className="size-8 mx-auto text-primary animate-bounce" />
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-foreground">
                  Uploading {uploadFileName}...
                </p>
                <div className="w-full max-w-xs mx-auto h-2 rounded-full bg-surface-elevated overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-[11px] font-mono text-muted-foreground">{uploadProgress}%</p>
              </div>
            </div>
          )}

          {/* Success State */}
          {!uploading && uploadSuccess && (
            <div className="space-y-2">
              <CheckCircle2 className="size-8 mx-auto text-emerald-500" />
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Upload complete!</p>
            </div>
          )}

          {/* Default / Drag Over State */}
          {!uploading && !uploadSuccess && (
            <div className="space-y-2">
              {isDragOver ? (
                <>
                  <Upload className="size-8 mx-auto text-primary animate-pulse" />
                  <p className="text-xs font-bold text-primary">Release to upload</p>
                </>
              ) : (
                <>
                  <div className="flex size-12 mx-auto items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                    <Paperclip className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      Drag files here or click to browse
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Proposals, MOUs, pitch decks, agreements · Max 4MB per file
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Attachments List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl border border-border/60 bg-surface animate-pulse" />
          ))}
        </div>
      ) : attachments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-surface/30 p-12 text-center">
          <FileText className="size-10 text-muted-foreground/40 mb-3" />
          <h4 className="text-sm font-bold text-foreground">No documents attached yet</h4>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
            Upload institutional agreements, partnership proposals, and collateral directly to this organisation.
          </p>
          {canEdit && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              icon={<Upload className="size-3.5" />}
            >
              Choose File
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {attachments.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-border/80 bg-surface p-3.5 shadow-2xs hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-primary border border-border/60">
                  <File className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate" title={item.filename}>
                    {item.filename}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground font-mono">
                    <span>{formatFileSize(item.fileSize)}</span>
                    <span>•</span>
                    <span>{formatDate(item.createdAt)}</span>
                    {item.uploadedBy && (
                      <>
                        <span>•</span>
                        <span className="text-foreground/70">{item.uploadedBy.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={downloadingId === item.id}
                  onClick={() => handleDownload(item)}
                  title="Download attachment"
                  className="h-8 w-8 p-0"
                >
                  <Download className="size-4 text-muted-foreground hover:text-foreground" />
                </Button>
                {canEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={deletingId === item.id}
                    onClick={() => handleDelete(item)}
                    title="Delete attachment"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-400"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
