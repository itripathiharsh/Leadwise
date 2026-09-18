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
import type { HandbookSectionItem } from './section-renderer'
import { toast } from 'sonner'

interface SectionEditModalProps {
  isOpen: boolean
  section: HandbookSectionItem | null
  onClose: () => void
  onSave: (
    sectionId: string,
    updates: {
      title?: string
      subtitle?: string | null
      badge?: string | null
      content?: string | null
      data?: any
      isVisible?: boolean
      saveAsDraft?: boolean
    },
  ) => Promise<void>
}

export function SectionEditModal({
  isOpen,
  section,
  onClose,
  onSave,
}: SectionEditModalProps) {
  const [title, setTitle] = React.useState('')
  const [subtitle, setSubtitle] = React.useState('')
  const [badge, setBadge] = React.useState('')
  const [content, setContent] = React.useState('')
  const [jsonData, setJsonData] = React.useState('')
  const [isVisible, setIsVisible] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    if (section) {
      setTitle(section.draftTitle ?? section.title ?? '')
      setSubtitle(section.draftSubtitle ?? section.subtitle ?? '')
      setBadge(section.badge ?? '')
      setContent(section.draftContent ?? section.content ?? '')
      setIsVisible(section.isVisible)

      const effectiveData = section.draftData ?? section.data
      if (effectiveData && Object.keys(effectiveData).length > 0) {
        setJsonData(JSON.stringify(effectiveData, null, 2))
      } else {
        setJsonData('')
      }
    }
  }, [section])

  if (!section) return null

  const handleSave = async (saveAsDraft: boolean) => {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }

    let parsedData: any = undefined
    if (jsonData.trim()) {
      try {
        parsedData = JSON.parse(jsonData)
      } catch (err: any) {
        toast.error(`Invalid JSON in structured data: ${err.message}`)
        return
      }
    }

    setIsSaving(true)
    try {
      await onSave(section.id, {
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        badge: badge.trim() || null,
        content: content.trim() || null,
        data: parsedData,
        isVisible,
        saveAsDraft,
      })
      toast.success(saveAsDraft ? 'Saved to draft' : 'Published section directly')
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update section')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              CMS Section Editor
            </span>
            <span className="text-xs text-muted-foreground">• {section.sectionType}</span>
          </div>
          <DialogTitle>Edit Section Content</DialogTitle>
          <DialogDescription>
            Modify headings, text, or structured cards for this handbook section.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="sec-title" required>
              Section Title
            </Label>
            <Input
              id="sec-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. The Sentio Mind Ecosystem"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sec-badge">Eyebrow / Badge Label</Label>
              <Input
                id="sec-badge"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="e.g. Core Values"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sec-subtitle">Subtitle</Label>
              <Input
                id="sec-subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Brief explanatory tagline"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sec-content">Body Text / Markdown Overview</Label>
            <Textarea
              id="sec-content"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Section narrative text..."
            />
          </div>

          {jsonData !== '' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="sec-json">Structured Card Data (JSON)</Label>
                <span className="text-[11px] text-muted-foreground">
                  Valid JSON configuration for cards, lists, or steps
                </span>
              </div>
              <textarea
                id="sec-json"
                rows={9}
                value={jsonData}
                onChange={(e) => setJsonData(e.target.value)}
                className="w-full rounded-lg border border-input bg-surface p-3 font-mono text-xs text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/18"
              />
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="sec-visible"
              checked={isVisible}
              onChange={(e) => setIsVisible(e.target.checked)}
              className="size-4 rounded border-border text-primary focus:ring-primary"
            />
            <Label htmlFor="sec-visible" className="cursor-pointer text-xs">
              Visible on published handbook
            </Label>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave(true)}
            loading={isSaving}
          >
            Save as Draft
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSave(false)}
            loading={isSaving}
          >
            Publish Live
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
