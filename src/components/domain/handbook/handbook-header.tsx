'use client'

import * as React from 'react'
import Image from 'next/image'
import {
  Sparkles,
  Eye,
  Edit3,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  RotateCcw,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface HandbookHeaderProps {
  title: string
  subtitle?: string | null
  version: number
  publishedAt?: string | Date | null
  publishedByName?: string | null
  hasDraftChanges?: boolean
  canManage: boolean
  mode: 'read' | 'preview' | 'edit'
  isPublishing?: boolean
  isDiscarding?: boolean
  onModeChange: (mode: 'read' | 'preview' | 'edit') => void
  onPublish: () => void
  onDiscard: () => void
  onAddSection?: () => void
}

export function HandbookHeader({
  title,
  subtitle,
  version,
  publishedAt,
  publishedByName,
  hasDraftChanges,
  canManage,
  mode,
  isPublishing = false,
  isDiscarding = false,
  onModeChange,
  onPublish,
  onDiscard,
  onAddSection,
}: HandbookHeaderProps) {
  const formattedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Not yet published'

  return (
    <div className="relative border-b border-border/80 bg-surface/80 backdrop-blur-md px-6 py-7 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          {/* Brand Identity & Title */}
          <div className="flex items-start gap-4">
            <div className="relative flex size-13 shrink-0 items-center justify-center rounded-xl border border-primary-border/60 bg-primary-soft/40 shadow-xs">
              <Image
                src="/logo-clean.png"
                alt="Sentio Mind Logo"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[11px] font-semibold tracking-wider text-primary uppercase">
                  Resources • Organisation Handbook
                </span>
                <Badge
                  tone={hasDraftChanges ? 'amber' : 'emerald'}
                  size="sm"
                  dot
                >
                  {hasDraftChanges ? 'Unpublished Drafts' : `Live v${version}`}
                </Badge>
                {mode === 'preview' && (
                  <Badge tone="indigo" size="sm">
                    Preview Mode
                  </Badge>
                )}
                {mode === 'edit' && (
                  <Badge tone="violet" size="sm">
                    CMS Editor Active
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {title}
              </h1>

              {subtitle && (
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {subtitle}
                </p>
              )}

              <div className="flex items-center gap-3 pt-1 text-xs text-subtle-foreground">
                <span>Published {formattedDate}</span>
                {publishedByName && (
                  <>
                    <span>•</span>
                    <span>By {publishedByName}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Lead & Owner Management Controls */}
          {canManage && (
            <div className="flex flex-wrap items-center gap-2 sm:self-start">
              {/* Mode Toggles */}
              <div className="flex items-center rounded-lg border border-border bg-surface-muted/60 p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => onModeChange('read')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-[background-color,color] duration-140 ${
                    mode === 'read'
                      ? 'bg-surface text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <BookOpen className="size-3.5" />
                  <span>Read</span>
                </button>
                <button
                  type="button"
                  onClick={() => onModeChange('preview')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-[background-color,color] duration-140 ${
                    mode === 'preview'
                      ? 'bg-surface text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Eye className="size-3.5" />
                  <span>Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => onModeChange('edit')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-[background-color,color] duration-140 ${
                    mode === 'edit'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Edit3 className="size-3.5" />
                  <span>Edit CMS</span>
                </button>
              </div>

              {/* Edit Mode Specific Action Buttons */}
              {mode === 'edit' && (
                <div className="flex items-center gap-2">
                  {hasDraftChanges && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onDiscard}
                      loading={isDiscarding}
                      icon={<RotateCcw className="size-3.5" />}
                    >
                      Discard Draft
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onPublish}
                    loading={isPublishing}
                    icon={<UploadCloud className="size-3.5" />}
                  >
                    Publish Changes
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
