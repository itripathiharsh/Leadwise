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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
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
        return <Mail className="size-4 text-indigo-500" />
      case 'LINKEDIN':
        return <Linkedin className="size-4 text-sky-500" />
      case 'CALL_SCRIPT':
        return <Phone className="size-4 text-blue-500" />
      default:
        return <MessageSquare className="size-4 text-emerald-500" />
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <FileText className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Outreach Templates & Scripts
            </h1>
            <Badge tone="slate" size="sm">
              {templates.length} Templates
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Reusable outreach copy for Emails, LinkedIn connection/InMail, Call Scripts, and WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
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
            icon={<Plus className="size-4" />}
          >
            Add Template
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: '', label: 'All Templates' },
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
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border',
              categoryFilter === tab.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-surface text-muted-foreground border-border hover:bg-muted hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading && templates.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-xs text-muted-foreground">
            Loading template library...
          </div>
        ) : templates.length === 0 ? (
          <div className="col-span-2 p-12 text-center space-y-2">
            <FileText className="size-8 mx-auto text-muted-foreground/60" />
            <p className="font-semibold text-sm">No templates found</p>
            <p className="text-xs text-muted-foreground">
              Click &ldquo;Add Template&rdquo; above to create outreach scripts for your team.
            </p>
          </div>
        ) : (
          templates.map((t) => (
            <Card key={t.id} className="border-border bg-surface shadow-xs flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-md bg-surface-muted/80 border border-border">
                      {getCategoryIcon(t.category)}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold">{t.title}</CardTitle>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                        {t.category.replace('_', ' ')} · {t.subcategory || 'General'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="xs" onClick={() => handleOpenEdit(t)}>
                      <Edit2 className="size-3 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="xs" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="size-3 text-rose-500" />
                    </Button>
                  </div>
                </div>

                {t.subject && (
                  <div className="text-xs font-semibold text-foreground/90 pt-1.5">
                    Subject: <span className="font-normal text-muted-foreground">{t.subject}</span>
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                <pre className="font-sans text-xs text-foreground/90 whitespace-pre-wrap bg-surface-muted/40 p-3 rounded-lg border border-border/50 max-h-48 overflow-y-auto leading-relaxed">
                  {t.body}
                </pre>

                <div className="flex items-center justify-between pt-1 border-t border-border/60">
                  <span className="text-[10px] text-muted-foreground">
                    By {t.createdBy?.name || 'Leadwise'}
                  </span>

                  <Button
                    variant="primary"
                    size="xs"
                    onClick={() => handleCopy(t)}
                    icon={copiedId === t.id ? <Check className="size-3" /> : <Copy className="size-3" />}
                  >
                    {copiedId === t.id ? 'Copied!' : 'Copy Template'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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

                <Field label="Category" required>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="EMAIL">Email</option>
                    <option value="LINKEDIN">LinkedIn (InMail / Message)</option>
                    <option value="CALL_SCRIPT">Call Script</option>
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
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Click to Insert Variable Placeholders:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PLACEHOLDERS.map((ph) => (
                    <button
                      key={ph}
                      type="button"
                      onClick={() => insertPlaceholder(ph)}
                      className="rounded-md bg-surface-muted px-2.5 py-1 text-[11px] font-mono text-primary hover:bg-primary/10 border border-border transition-colors"
                    >
                      + {ph}
                    </button>
                  ))}
                </div>
              </div>

              <Field label="Template Content / Body" required>
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
