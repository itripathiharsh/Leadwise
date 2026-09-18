'use client'

import * as React from 'react'
import {
  Compass,
  Target,
  Layers,
  Cpu,
  HeartHandshake,
  Workflow,
  Sparkles,
  UserCheck,
  Milestone,
  HelpCircle,
  LucideIcon,
} from 'lucide-react'

interface TocItem {
  id: string
  sectionType: string
  title: string
  badge?: string | null
}

interface HandbookTocProps {
  sections: TocItem[]
  activeSectionId?: string
  onSelectSection: (id: string) => void
}

const SECTION_ICONS: Record<string, LucideIcon> = {
  hero: Compass,
  mission_vision: Target,
  why_we_exist: HelpCircle,
  ecosystem: Layers,
  what_we_do: Workflow,
  domains: Compass,
  principles: Sparkles,
  ai_humans: Cpu,
  collaboration: HeartHandshake,
  how_we_build: Workflow,
  research_focus: Cpu,
  new_joiner: UserCheck,
  journey: Milestone,
  cta: HeartHandshake,
}

export function HandbookToc({
  sections,
  activeSectionId,
  onSelectSection,
}: HandbookTocProps) {
  return (
    <div className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur-md px-4 py-2.5 shadow-xs">
      <div className="mx-auto flex max-w-6xl items-center gap-1.5 overflow-x-auto scrollbar-slim">
        <span className="shrink-0 pr-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Jump to:
        </span>
        {sections.map((sec) => {
          const Icon = SECTION_ICONS[sec.sectionType] || Compass
          const isActive = activeSectionId === sec.id

          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => onSelectSection(sec.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-[background-color,color,border-color] duration-140 ${
                isActive
                  ? 'border border-primary-border bg-primary-soft text-primary-soft-foreground shadow-xs font-semibold'
                  : 'border border-border/70 bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground'
              }`}
            >
              <Icon className="size-3" />
              <span>{sec.title}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
