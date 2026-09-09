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
  Sparkles,
  Files,
  Eye,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
    toast.success('Template copied to clipboard!')
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
        toast.success('Template duplicated!')
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
        toast.success(editingId ? 'Template updated!' : 'Template created!')
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
        toast.success('Template removed.')
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
        return <Mail className="size-4 text-indigo-400" />
      case 'LINKEDIN':
        return <Linkedin className="size-4 text-sky-400" />
      case 'CALL_SCRIPT':
        return <Phone className="size-4 text-blue-400" />
      default:
        return <MessageSquare className="size-4 text-emerald-400" />
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Executive Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
              <FileText className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-display font-extrabold text-2xl tracking-tight text-foreground">
                  Outreach Templates & Scripts
                </h1>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-surface-elevated text-primary border border-primary/20 font-bold">
                  {templates.length} Active Templates
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Standardized high-conversion copy for Cold Outreach, Cadence Follow-ups, Call Scripts, and InMails.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTemplates}
            icon={<RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />}
            className="border-border hover:bg-surface-elevated"
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            icon={<Plus className="size-4" />}
            className="shadow-md shadow-primary/20 font-semibold"
          >
            + Add Template
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="glass-panel rounded-2xl border border-border/80 bg-surface/70 backdrop-blur-xl p-2.5 shadow-sm flex flex-wrap gap-2">
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
              'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border',
              categoryFilter === tab.key
                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                : 'bg-surface-elevated/60 text-muted-foreground border-border/70 hover:bg-surface-elevated hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading && templates.length === 0 ? (
          <div className="col-span-2 p-16 text-center space-y-3">
            <RefreshCw className="size-6 mx-auto text-primary animate-spin" />
            <div className="font-semibold text-sm text-foreground">Syncing Template Library...</div>
          </div>
        ) : templates.length === 0 ? (
          <div className="col-span-2 p-16 text-center space-y-4 rounded-2xl border border-border/80 bg-surface/60">
            <FileText className="size-10 mx-auto text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="font-display font-bold text-base text-foreground">No templates found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Add outreach copy or pitch scripts to standardize communication across your team.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={handleOpenCreate} icon={<Plus className="size-4" />}>
              + Add First Template
            </Button>
          </div>
        ) : (
          templates.map((t) => (
            <div
              key={t.id}
              className="glass-card rounded-2xl border border-border/80 bg-surface/75 backdrop-blur-xl p-5 shadow-sm hover:border-primary/40 transition-all duration-200 flex flex-col justify-between space-y-4 rim-highlight"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-elevated border border-border/80 shadow-xs">
                      {getCategoryIcon(t.category)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{t.title}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[10px] uppercase font-bold text-primary px-2 py-0.2 rounded bg-primary/10 border border-primary/20">
                          {t.category.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          · {t.subcategory || 'General Outreach'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewTemplate(t)}
                      title="Preview Template"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
                    >
                      <Eye className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(t)}
                      title="Duplicate Template"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
                    >
                      <Files className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(t)}
                      title="Edit Template"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      title="Delete Template"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {t.subject && (
                  <div className="text-xs font-semibold text-foreground/90 rounded-lg bg-surface-elevated/40 p-2 border border-border/50">
                    <span className="text-muted-foreground font-mono text-[11px]">Subject: </span>
                    <span>{t.subject}</span>
                  </div>
                )}

                <pre className="font-sans text-xs text-foreground/80 whitespace-pre-wrap bg-surface-elevated/60 p-3.5 rounded-xl border border-border/50 max-h-40 overflow-y-auto leading-relaxed">
                  {t.body}
                </pre>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/60">
                <span className="font-mono text-[11px] text-muted-foreground">
                  By {t.createdBy?.name || 'Leadwise Team'}
                </span>

                <Button
                  variant={copiedId === t.id ? 'secondary' : 'primary'}
                  size="xs"
                  onClick={() => handleCopy(t)}
                  className={cn(
                    'transition-all duration-200 font-bold shadow-xs',
                    copiedId === t.id && 'bg-emerald-600 hover:bg-emerald-600 text-white border-emerald-600 shadow-sm scale-105',
                  )}
                  icon={copiedId === t.id ? <Check className="size-3 text-white stroke-[3]" /> : <Copy className="size-3" />}
                >
                  {copiedId === t.id ? 'Copied ✓' : 'Copy Template'}
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
            <DialogBody className="space-y-4">
              {previewTemplate.subject && (
                <div className="rounded-xl border border-border bg-surface-elevated/50 p-3 text-xs">
                  <span className="font-mono font-bold text-muted-foreground">Subject: </span>
                  <span className="font-semibold text-foreground">{previewTemplate.subject}</span>
                </div>
              )}
              <div className="rounded-xl border border-border bg-surface-elevated/40 p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap text-foreground">
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
            <DialogBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Template Title" required>
                  <Input
                    placeholder="e.g. Initial Clinical Partnership Intro"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-10"
                  />
                </Field>

                <Field label="Channel" required>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                    className="h-10"
                  />
                </Field>
              )}

              {/* Placeholders Toolbar */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                  Click to Insert Variables:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PLACEHOLDERS.map((ph) => (
                    <button
                      key={ph}
                      type="button"
                      onClick={() => insertPlaceholder(ph)}
                      className="rounded-lg bg-surface-elevated px-2.5 py-1 text-[11px] font-mono text-primary hover:bg-primary/10 border border-border transition-colors font-semibold"
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
                  className="w-full rounded-xl border border-border bg-surface p-3.5 text-xs font-mono text-foreground shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed resize-y min-h-[100px]"
                />
              </Field>
            </DialogBody>

            <DialogFooter>
              <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={saving} className="font-bold">
                Save Template
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
