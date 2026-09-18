'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, AlertCircle, Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { HandbookHeader } from '@/components/domain/handbook/handbook-header'
import { HandbookToc } from '@/components/domain/handbook/handbook-toc'
import {
  SectionRenderer,
  type HandbookSectionItem,
} from '@/components/domain/handbook/section-renderer'
import { SectionEditModal } from '@/components/domain/handbook/section-edit-modal'
import { AddSectionModal } from '@/components/domain/handbook/add-section-modal'

interface HandbookClientProps {
  initialData: {
    handbook: {
      id: string
      slug: string
      title: string
      subtitle?: string | null
      status: string
      version: number
      publishedAt?: string | null
      publishedBy?: { id: string; name: string; role: string } | null
      updatedAt: string
      hasDraftChanges?: boolean
    }
    sections: HandbookSectionItem[]
    canManage: boolean
    mode: 'read' | 'preview' | 'edit'
  }
}

export function HandbookClient({ initialData }: HandbookClientProps) {
  const router = useRouter()
  const [mode, setMode] = React.useState<'read' | 'preview' | 'edit'>(initialData.mode)
  const [handbook, setHandbook] = React.useState(initialData.handbook)
  const [sections, setSections] = React.useState<HandbookSectionItem[]>(initialData.sections)
  const [canManage] = React.useState(initialData.canManage)

  const [activeSectionId, setActiveSectionId] = React.useState<string>('')
  const [editingSection, setEditingSection] = React.useState<HandbookSectionItem | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)

  const [isPublishing, setIsPublishing] = React.useState(false)
  const [isDiscarding, setIsDiscarding] = React.useState(false)
  const [isLoadingMode, setIsLoadingMode] = React.useState(false)

  // Fetch data whenever mode changes
  const fetchModeData = React.useCallback(async (targetMode: 'read' | 'preview' | 'edit') => {
    setIsLoadingMode(true)
    try {
      const res = await fetch(`/api/resources/about-organisation?mode=${targetMode}`)
      if (!res.ok) {
        throw new Error('Failed to load handbook for selected mode')
      }
      const data = await res.json()
      setHandbook(data.handbook)
      setSections(data.sections)
      setMode(targetMode)
    } catch (err: any) {
      toast.error(err.message || 'Error switching modes')
    } finally {
      setIsLoadingMode(false)
    }
  }, [])

  const handleModeChange = (newMode: 'read' | 'preview' | 'edit') => {
    if (newMode === mode) return
    fetchModeData(newMode)
  }

  // ScrollSpy to highlight active section in TOC
  React.useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 140
      for (const section of sections) {
        const el = document.getElementById(`section-${section.id}`)
        if (el) {
          const top = el.offsetTop
          const height = el.offsetHeight
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSectionId(section.id)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [sections])

  const handleSelectTocSection = (id: string) => {
    const el = document.getElementById(`section-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
      setActiveSectionId(id)
    }
  }

  // Section CRUD Actions
  const handleSaveSection = async (
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
  ) => {
    const res = await fetch(`/api/resources/about-organisation/sections/${sectionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to update section')
    }

    await fetchModeData(mode)
  }

  const handleDeleteSection = async (sectionId: string) => {
    if (!window.confirm('Are you sure you want to delete this section?')) return

    try {
      const res = await fetch(`/api/resources/about-organisation/sections/${sectionId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete section')
      }
      toast.success('Section deleted')
      setSections((prev) => prev.filter((s) => s.id !== sectionId))
    } catch (err: any) {
      toast.error(err.message || 'Error deleting section')
    }
  }

  const handleToggleVisibility = async (section: HandbookSectionItem) => {
    try {
      const nextVisible = !section.isVisible
      await handleSaveSection(section.id, {
        isVisible: nextVisible,
        saveAsDraft: false,
      })
      toast.success(nextVisible ? 'Section is now visible' : 'Section is now hidden')
    } catch (err: any) {
      toast.error(err.message || 'Error toggling visibility')
    }
  }

  const handleMoveUp = async (sectionId: string) => {
    const index = sections.findIndex((s) => s.id === sectionId)
    if (index <= 0) return

    const newSections = [...sections]
    const temp = newSections[index - 1]
    newSections[index - 1] = newSections[index]
    newSections[index] = temp
    setSections(newSections)

    try {
      const res = await fetch('/api/resources/about-organisation/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionIds: newSections.map((s) => s.id) }),
      })
      if (!res.ok) throw new Error('Failed to update sort order')
      toast.success('Order updated')
    } catch (err: any) {
      toast.error(err.message)
      fetchModeData(mode)
    }
  }

  const handleMoveDown = async (sectionId: string) => {
    const index = sections.findIndex((s) => s.id === sectionId)
    if (index < 0 || index >= sections.length - 1) return

    const newSections = [...sections]
    const temp = newSections[index + 1]
    newSections[index + 1] = newSections[index]
    newSections[index] = temp
    setSections(newSections)

    try {
      const res = await fetch('/api/resources/about-organisation/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionIds: newSections.map((s) => s.id) }),
      })
      if (!res.ok) throw new Error('Failed to update sort order')
      toast.success('Order updated')
    } catch (err: any) {
      toast.error(err.message)
      fetchModeData(mode)
    }
  }

  const handleAddSection = async (data: {
    sectionType: string
    title: string
    subtitle?: string | null
    badge?: string | null
    content?: string | null
    data?: any
    isVisible?: boolean
  }) => {
    const res = await fetch('/api/resources/about-organisation/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to create section')
    }

    await fetchModeData(mode)
  }

  const handlePublish = async () => {
    setIsPublishing(true)
    try {
      const res = await fetch('/api/resources/about-organisation/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to publish changes')
      }
      toast.success('Handbook published successfully to all users!')
      await fetchModeData('read')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleDiscard = async () => {
    if (!window.confirm('Discard all uncommitted draft modifications?')) return

    setIsDiscarding(true)
    try {
      const res = await fetch('/api/resources/about-organisation/discard-draft', {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to discard draft')
      }
      toast.success('Draft changes discarded')
      await fetchModeData(mode)
    } catch (err: any) {
      toast.error(err.message || 'Failed to discard draft')
    } finally {
      setIsDiscarding(false)
    }
  }

  // Filter sections for TOC
  const visibleSections = mode === 'read' ? sections.filter((s) => s.isVisible) : sections

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <HandbookHeader
        title={handbook.title}
        subtitle={handbook.subtitle}
        version={handbook.version}
        publishedAt={handbook.publishedAt}
        publishedByName={handbook.publishedBy?.name}
        hasDraftChanges={handbook.hasDraftChanges}
        canManage={canManage}
        mode={mode}
        isPublishing={isPublishing}
        isDiscarding={isDiscarding}
        onModeChange={handleModeChange}
        onPublish={handlePublish}
        onDiscard={handleDiscard}
        onAddSection={() => setIsAddModalOpen(true)}
      />

      {/* Sticky Table of Contents Jump Bar */}
      <HandbookToc
        sections={visibleSections.map((s) => ({
          id: s.id,
          sectionType: s.sectionType,
          title: s.title,
          badge: s.badge,
        }))}
        activeSectionId={activeSectionId}
        onSelectSection={handleSelectTocSection}
      />

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
        {/* Banner for Preview Mode */}
        {mode === 'preview' && (
          <div className="flex items-center gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/[0.05] p-4 text-xs sm:text-sm text-indigo-700 dark:text-indigo-300">
            <Compass className="size-4 shrink-0" />
            <span>
              <strong>Preview Mode:</strong> You are viewing uncommitted draft updates. Regular users
              still see the published version until you click &ldquo;Publish Changes&rdquo;.
            </span>
          </div>
        )}

        {/* Banner for Edit Mode */}
        {mode === 'edit' && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary-border/70 bg-primary-soft/30 p-4 text-xs sm:text-sm text-primary-soft-foreground">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0 text-primary" />
              <span>
                <strong>CMS Edit Mode:</strong> Reorder sections, update content, and toggle visibility. Changes can be saved as drafts or published directly.
              </span>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              icon={<Plus className="size-3.5" />}
            >
              Add Section
            </Button>
          </div>
        )}

        {/* Section List */}
        {sections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <p className="text-sm text-muted-foreground">No sections available in this handbook.</p>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setIsAddModalOpen(true)}
              >
                Create First Section
              </Button>
            )}
          </div>
        ) : (
          sections.map((section, idx) => (
            <SectionRenderer
              key={section.id}
              section={section}
              isFirst={idx === 0}
              isLast={idx === sections.length - 1}
              mode={mode}
              canManage={canManage}
              onEdit={(sec) => setEditingSection(sec)}
              onDelete={handleDeleteSection}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onToggleVisibility={handleToggleVisibility}
            />
          ))
        )}

        {/* Footer Add Section Button in Edit Mode */}
        {mode === 'edit' && canManage && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsAddModalOpen(true)}
              icon={<Plus className="size-4" />}
            >
              Add Another Section
            </Button>
          </div>
        )}
      </main>

      {/* Edit Section Modal */}
      <SectionEditModal
        isOpen={!!editingSection}
        section={editingSection}
        onClose={() => setEditingSection(null)}
        onSave={handleSaveSection}
      />

      {/* Add Section Modal */}
      <AddSectionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddSection}
      />
    </div>
  )
}
