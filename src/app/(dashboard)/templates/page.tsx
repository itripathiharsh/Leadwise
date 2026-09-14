'use client'

import * as React from 'react'
import {
  FileText,
  Mail,
  Linkedin,
  Phone,
  MessageSquare,
  Plus,
  Copy,
  Check,
  Edit2,
  Trash2,
  RefreshCw,
  Files,
  Eye,
} from 'lucide-react'
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
import { Field, Input } from '@/components/ui/field'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const PLACEHOLDERS = [
  '{{organisation_name}}',
  '{{contact_name}}',
  '{{contact_designation}}',
  '{{sender_name}}',
  '{{sender_role}}',
  '{{sender_phone}}',
]

export default function TemplatesPage() {
  const [categoryFilter, setCategoryFilter] = React.useState('')
  const [templates, setTemplates] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [copiedId, setCopiedId] = React.useState<string | null>(null)

  // Modal State
  const [modalOpen, setModalOpen] = React.useState(false)
  const [previewTemplate, setPreviewTemplate] = React.useState<any | null>(null)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [title, setTitle] = React.useState('')
  const [category, setCategory] = React.useState('EMAIL')
  const [subcategory, setSubcategory] = React.useState('INITIAL_OUTREACH')
  const [subject, setSubject] = React.useState('')
  const [body, setBody] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const fetchTemplates = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoryFilter) params.set('category', categoryFilter)

      const res = await fetch(`/api/templates?${params.toString()}`)
      if (res.ok) {
        const d = await res.json()
        setTemplates(d.templates ?? [])
      }
    } catch {
      toast.error('Failed to load templates.')
    } finally {
      setLoading(false)
    }
  }, [categoryFilter])

  React.useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleCopy = (t: any) => {
    const textToCopy = t.category === 'EMAIL' && t.subject ? `Subject: ${t.subject}\n\n${t.body}` : t.body
    navigator.clipboard.writeText(textToCopy)
    setCopiedId(t.id)
    toast.success('Template copied to clipboard')
    setTimeout(() => setCopiedId(null), 2500)
  }

  const handleDuplicate = async (t: any) => {
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${t.title} (Copy)`,
          category: t.category,
          subcategory: t.subcategory,
          subject: t.subject,
          body: t.body,
        }),
      })
      if (res.ok) {
        toast.success('Template duplicated')
        fetchTemplates()
      } else {
        toast.error('Failed to duplicate template.')
      }
    } catch {
      toast.error('Network error duplicating template.')
    }
  }

  const handleOpenCreate = () => {
    setEditingId(null)
    setTitle('')
    setCategory('EMAIL')
    setSubcategory('INITIAL_OUTREACH')
    setSubject('')
    setBody('')
    setModalOpen(true)
  }

  const handleOpenEdit = (t: any) => {
    setEditingId(t.id)
    setTitle(t.title)
    setCategory(t.category)
    setSubcategory(t.subcategory || 'INITIAL_OUTREACH')
    setSubject(t.subject || '')
    setBody(t.body)
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return

    setSaving(true)
    try {
      const url = editingId ? `/api/templates/${editingId}` : '/api/templates'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category,
          subcategory,
          subject: category === 'EMAIL' ? subject.trim() : undefined,
          body: body.trim(),
        }),
      })
      const data = await res.json().catch(() => null)

      if (res.ok) {
        toast.success(editingId ? 'Template updated' : 'Template created')
        setModalOpen(false)
        fetchTemplates()
      } else {
        toast.error(data?.error || 'Failed to save template.')
      }
    } catch {
      toast.error('Network error saving template.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => null)
      if (res.ok) {
        toast.success('Template deleted')
        fetchTemplates()
      } else {
        toast.error(data?.error || 'Failed to delete template.')
      }
    } catch {
      toast.error('Network error deleting template.')
    }
  }

  const insertPlaceholder = (ph: string) => {
    setBody((prev) => `${prev} ${ph}`)
  }

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'EMAIL':
        return <Mail className="size-3.5 text-muted-foreground" />
      case 'LINKEDIN':
        return <Linkedin className="size-3.5 text-muted-foreground" />
      case 'CALL_SCRIPT':
        return <Phone className="size-3.5 text-muted-foreground" />
      default:
        return <MessageSquare className="size-3.5 text-muted-foreground" />
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 p-4 sm:p-6 lg:p-8">
      {/* Precision Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-surface-muted text-foreground border border-border">
              <FileText className="size-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-sans font-bold text-xl sm:text-2xl tracking-tight text-foreground">
                  Outreach Templates & Scripts
                </h1>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-muted text-muted-foreground border border-border">
                  {templates.length} Active Templates
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Standardized high-conversion copy for cold outreach, follow-ups, and call scripts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTemplates}
            icon={<RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            icon={<Plus className="size-3.5" />}
          >
            Add Template
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="rounded-lg border border-border bg-surface p-2 flex flex-wrap gap-1">
        {[
          { key: '', label: 'All Channels' },
          { key: 'EMAIL', label: 'Emails' },
          { key: 'LINKEDIN', label: 'LinkedIn' },
          { key: 'CALL_SCRIPT', label: 'Call Scripts' },
          { key: 'WHATSAPP', label: 'WhatsApp' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setCategoryFilter(tab.key)}
            className={cn(
              'px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer',
              categoryFilter === tab.key
                ? 'bg-surface-muted text-foreground border border-border shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {loading && templates.length === 0 ? (
          <div className="col-span-2 p-16 text-center space-y-3">
            <RefreshCw className="size-5 mx-auto text-primary animate-spin" />
            <div className="font-semibold text-sm text-foreground">Syncing Template Library...</div>
          </div>
        ) : templates.length === 0 ? (
          <div className="col-span-2 p-16 text-center space-y-4 rounded-lg border border-border bg-surface">
            <FileText className="size-8 mx-auto text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-semibold text-sm text-foreground">No templates found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Add outreach copy or pitch scripts to standardize communication across your team.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={handleOpenCreate} icon={<Plus className="size-3.5" />}>
              Add First Template
            </Button>
          </div>
        ) : (
          templates.map((t) => (
            <div
              key={t.id}
              className="rounded-lg border border-border bg-surface p-4 hover:border-border-strong transition-[border-color] flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-muted border border-border text-foreground">
                      {getCategoryIcon(t.category)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-semibold text-foreground truncate">{t.title}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[9px] uppercase font-semibold text-primary px-1.5 py-0.2 rounded bg-primary/10 border border-primary/20">
                          {t.category.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate">
                          · {t.subcategory || 'General Outreach'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewTemplate(t)}
                      title="Preview Template"
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
                    >
                      <Eye className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(t)}
                      title="Duplicate Template"
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
                    >
                      <Files className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(t)}
                      title="Edit Template"
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      title="Delete Template"
                      className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {t.subject && (
                  <div className="text-xs text-foreground/90 rounded bg-surface-muted/40 p-2 border border-border">
                    <span className="text-muted-foreground font-mono text-[10.5px]">Subject: </span>
                    <span className="font-medium">{t.subject}</span>
                  </div>
                )}

                <pre className="font-sans text-xs text-foreground/80 whitespace-pre-wrap bg-surface-muted/50 p-3 rounded border border-border max-h-36 overflow-y-auto leading-relaxed">
                  {t.body}
                </pre>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-border">
                <span className="font-mono text-[10.5px] text-muted-foreground">
                  By {t.createdBy?.name || 'Leadwise Team'}
                </span>

                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleCopy(t)}
                  icon={copiedId === t.id ? <Check className="size-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="size-3" />}
                >
                  {copiedId === t.id ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Preview Dialog */}
      {previewTemplate && (
        <Dialog open={Boolean(previewTemplate)} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent size="lg">
            <DialogHeader>
              <DialogTitle>{previewTemplate.title}</DialogTitle>
              <DialogDescription>
                Live preview with placeholders visible.
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-3">
              {previewTemplate.subject && (
                <div className="rounded border border-border bg-surface-muted/40 p-2.5 text-xs">
                  <span className="font-mono font-semibold text-muted-foreground">Subject: </span>
                  <span className="font-medium text-foreground">{previewTemplate.subject}</span>
                </div>
              )}
              <div className="rounded border border-border bg-surface-muted/30 p-3.5 text-xs font-mono leading-relaxed whitespace-pre-wrap text-foreground">
                {previewTemplate.body}
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                variant="primary"
                onClick={() => {
                  handleCopy(previewTemplate)
                  setPreviewTemplate(null)
                }}
                icon={<Copy className="size-3.5" />}
              >
                Copy Content
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add / Edit Template Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Template' : 'Add Outreach Template'}</DialogTitle>
            <DialogDescription>
              Create outreach copy for your team with automated variable placeholders.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
            <DialogBody className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Template Title" required>
                  <Input
                    placeholder="e.g. Initial Clinical Partnership Intro"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-9"
                  />
                </Field>

                <Field label="Channel" required>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-9 w-full rounded border border-border bg-surface px-3 py-1 text-xs text-foreground focus:border-border-strong focus:outline-none cursor-pointer"
                  >
                    <option value="EMAIL">Email</option>
                    <option value="LINKEDIN">LinkedIn (InMail / Connection)</option>
                    <option value="CALL_SCRIPT">Phone Call Script</option>
                    <option value="WHATSAPP">WhatsApp</option>
                  </select>
                </Field>
              </div>

              {category === 'EMAIL' && (
                <Field label="Email Subject Line">
                  <Input
                    placeholder="e.g. Partnership exploration: Leadwise & {{organisation_name}}"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="h-9"
                  />
                </Field>
              )}

              {/* Placeholders Toolbar */}
              <div className="space-y-1">
                <label className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider font-mono">
                  Insert Variables:
                </label>
                <div className="flex flex-wrap gap-1">
                  {PLACEHOLDERS.map((ph) => (
                    <button
                      key={ph}
                      type="button"
                      onClick={() => insertPlaceholder(ph)}
                      className="rounded bg-surface-muted px-2 py-0.5 text-[11px] font-mono text-foreground hover:bg-surface-hover border border-border transition-colors cursor-pointer"
                    >
                      + {ph}
                    </button>
                  ))}
                </div>
              </div>

              <Field label="Template Body / Pitch" required>
                <textarea
                  rows={6}
                  required
                  placeholder="Hi {{contact_name}}, I'm reaching out from Leadwise regarding..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full rounded border border-border bg-surface p-3 text-xs font-mono text-foreground focus:border-border-strong focus:outline-none leading-relaxed resize-y min-h-[100px]"
                />
              </Field>
            </DialogBody>

            <DialogFooter>
              <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={saving}>
                Save Template
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
