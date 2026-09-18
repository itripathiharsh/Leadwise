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
import { Input, Textarea, Label } from '@/components/ui/field'
import { toast } from 'sonner'

interface AddSectionModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (data: {
    sectionType: string
    title: string
    subtitle?: string | null
    badge?: string | null
    content?: string | null
    data?: any
    isVisible?: boolean
  }) => Promise<void>
}

const SECTION_TYPES = [
  { value: 'rich_text', label: 'Rich Narrative / Text Section' },
  { value: 'hero', label: 'Identity / Hero Card' },
  { value: 'mission_vision', label: 'Mission & Vision Split' },
  { value: 'why_we_exist', label: 'Challenges / Why We Exist' },
  { value: 'ecosystem', label: 'Product Ecosystem Cards' },
  { value: 'what_we_do', label: 'Pillars / What We Do' },
  { value: 'domains', label: 'Domain Spectrum Cards' },
  { value: 'principles', label: 'Numbered Principles' },
  { value: 'ai_humans', label: 'AI vs Human Collaboration' },
  { value: 'collaboration', label: 'Multidisciplinary Coalition' },
  { value: 'how_we_build', label: '5-Step Process Timeline' },
  { value: 'new_joiner', label: 'New Joiner Role Guide' },
  { value: 'journey', label: 'Milestones & Journey Roadmap' },
  { value: 'cta', label: 'Call to Action Banner' },
  { value: 'custom', label: 'Custom Content Block' },
]

export function AddSectionModal({ isOpen, onClose, onAdd }: AddSectionModalProps) {
  const [sectionType, setSectionType] = React.useState('rich_text')
  const [title, setTitle] = React.useState('')
  const [subtitle, setSubtitle] = React.useState('')
  const [badge, setBadge] = React.useState('')
  const [content, setContent] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Section title is required')
      return
    }

    setIsSaving(true)
    try {
      await onAdd({
        sectionType,
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        badge: badge.trim() || null,
        content: content.trim() || null,
        isVisible: true,
      })
      toast.success('Section created successfully')
      setTitle('')
      setSubtitle('')
      setBadge('')
      setContent('')
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to add section')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Handbook Section</DialogTitle>
            <DialogDescription>
              Select a section layout type and enter the initial text.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="sec-type" required>
                Section Layout Type
              </Label>
              <select
                id="sec-type"
                value={sectionType}
                onChange={(e) => setSectionType(e.target.value)}
                className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/18"
              >
                {SECTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sec-add-title" required>
                Section Title
              </Label>
              <Input
                id="sec-add-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Clinical Research Protocols"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sec-add-badge">Eyebrow / Badge</Label>
                <Input
                  id="sec-add-badge"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="e.g. Protocol"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sec-add-subtitle">Subtitle</Label>
                <Input
                  id="sec-add-subtitle"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Short explanatory description"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sec-add-content">Content / Narrative</Label>
              <Textarea
                id="sec-add-content"
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter section narrative or guidelines..."
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={isSaving}>
              Create Section
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
