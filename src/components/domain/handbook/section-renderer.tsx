'use client'

import * as React from 'react'
import {
  Check,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  HeartHandshake,
  CheckCircle2,
  Layers,
  ArrowRight,
  UserCheck,
  Code2,
  BrainCircuit,
  Stethoscope,
  Clock,
  Compass,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export interface HandbookSectionItem {
  id: string
  sectionType: string
  title: string
  subtitle?: string | null
  badge?: string | null
  content?: string | null
  data?: any
  draftTitle?: string | null
  draftSubtitle?: string | null
  draftContent?: string | null
  draftData?: any
  isDraft?: boolean
  sortOrder: number
  isVisible: boolean
}

interface SectionRendererProps {
  section: HandbookSectionItem
  isFirst: boolean
  isLast: boolean
  mode: 'read' | 'preview' | 'edit'
  canManage: boolean
  onEdit: (section: HandbookSectionItem) => void
  onDelete: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onToggleVisibility: (section: HandbookSectionItem) => void
}

export function SectionRenderer({
  section,
  isFirst,
  isLast,
  mode,
  canManage,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
}: SectionRendererProps) {
  // Use effective values based on mode
  const title = mode === 'preview' && section.draftTitle ? section.draftTitle : section.title
  const subtitle =
    mode === 'preview' && section.draftSubtitle !== undefined && section.draftSubtitle !== null
      ? section.draftSubtitle
      : section.subtitle
  const content =
    mode === 'preview' && section.draftContent !== undefined && section.draftContent !== null
      ? section.draftContent
      : section.content
  const data =
    mode === 'preview' && section.draftData !== undefined && section.draftData !== null
      ? section.draftData
      : section.data || {}

  // Active role track tab state for New Joiner guide
  const [activeRoleIndex, setActiveRoleIndex] = React.useState(0)

  return (
    <section
      id={`section-${section.id}`}
      className={`group relative scroll-mt-20 rounded-2xl border transition-[border-color,background-color] duration-140 ${
        mode === 'edit'
          ? section.isDraft
            ? 'border-amber-500/40 bg-amber-500/[0.02] p-6 lg:p-8'
            : !section.isVisible
              ? 'border-dashed border-border/80 bg-surface-muted/30 opacity-75 p-6 lg:p-8'
              : 'border-border/80 bg-surface p-6 lg:p-8'
          : 'border-border/60 bg-surface p-6 sm:p-8 lg:p-10 shadow-xs'
      }`}
    >
      {/* Edit Mode Action Bar */}
      {mode === 'edit' && canManage && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {section.sectionType.replace('_', ' ')}
            </span>
            {section.isDraft && (
              <Badge tone="amber" size="sm" dot>
                Draft Unsaved
              </Badge>
            )}
            {!section.isVisible && (
              <Badge tone="slate" size="sm">
                Hidden from Read View
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="iconSm"
              disabled={isFirst}
              onClick={() => onMoveUp(section.id)}
              title="Move Up"
            >
              <ArrowUp className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="iconSm"
              disabled={isLast}
              onClick={() => onMoveDown(section.id)}
              title="Move Down"
            >
              <ArrowDown className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="iconSm"
              onClick={() => onToggleVisibility(section)}
              title={section.isVisible ? 'Hide Section' : 'Show Section'}
            >
              {section.isVisible ? (
                <Eye className="size-3.5" />
              ) : (
                <EyeOff className="size-3.5 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(section)}
              icon={<Edit2 className="size-3.5" />}
            >
              Edit Section
            </Button>
            <Button
              variant="dangerGhost"
              size="iconSm"
              onClick={() => onDelete(section.id)}
              title="Delete Section"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Section Header */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-2">
          {section.badge && (
            <Badge tone="sky" size="sm">
              {section.badge}
            </Badge>
          )}
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl [text-wrap:balance]">
          {title}
        </h2>
        {subtitle && (
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground [text-wrap:pretty]">
            {subtitle}
          </p>
        )}
      </div>

      {/* Main Body Content if present */}
      {content && (
        <div className="mb-8 prose prose-slate max-w-none text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
          {content}
        </div>
      )}

      {/* Specific Section Type Renderers */}
      {renderSectionBody(section.sectionType, data, activeRoleIndex, setActiveRoleIndex)}
    </section>
  )
}

function renderSectionBody(
  sectionType: string,
  data: any,
  activeRoleIndex: number,
  setActiveRoleIndex: (index: number) => void,
) {
  switch (sectionType) {
    case 'hero':
      return renderHero(data)
    case 'mission_vision':
      return renderMissionVision(data)
    case 'why_we_exist':
      return renderWhyWeExist(data)
    case 'ecosystem':
      return renderEcosystem(data)
    case 'what_we_do':
      return renderWhatWeDo(data)
    case 'domains':
      return renderDomains(data)
    case 'principles':
      return renderPrinciples(data)
    case 'ai_humans':
      return renderAiHumans(data)
    case 'collaboration':
      return renderCollaboration(data)
    case 'how_we_build':
      return renderHowWeBuild(data)
    case 'research_focus':
      return renderResearchFocus(data)
    case 'new_joiner':
      return renderNewJoiner(data, activeRoleIndex, setActiveRoleIndex)
    case 'journey':
      return renderJourney(data)
    case 'cta':
      return renderCta(data)
    default:
      return renderGeneric(data)
  }
}

// ── 1. Hero / Identity Renderer ──────────────────────────────────────────────
function renderHero(data: any) {
  const whatWeAre = data?.whatWeAre || []
  const whatWeAreNot = data?.whatWeAreNot || []

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* What We Are */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02] p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10">
            <Check className="size-4" />
          </div>
          <h3 className="text-base font-semibold">What Sentio Mind Is</h3>
        </div>
        <ul className="space-y-3 text-xs sm:text-sm text-foreground/80">
          {whatWeAre.map((item: string, i: number) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-1 flex size-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* What We Are Not */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.02] p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10">
            <ShieldAlert className="size-4" />
          </div>
          <h3 className="text-base font-semibold">Our Protective Boundaries (What We Are Not)</h3>
        </div>
        <ul className="space-y-3 text-xs sm:text-sm text-foreground/80">
          {whatWeAreNot.map((item: string, i: number) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-1 flex size-1.5 shrink-0 rounded-full bg-amber-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ── 2. Mission & Vision Renderer ─────────────────────────────────────────────
function renderMissionVision(data: any) {
  const mission = data?.mission
  const vision = data?.vision

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {mission && (
        <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-surface-muted/40 p-6">
          <div className="space-y-4">
            <span className="inline-block text-xs font-bold uppercase tracking-wider text-primary">
              {mission.title || 'Our Mission'}
            </span>
            <p className="text-base font-semibold leading-snug text-foreground sm:text-lg">
              &ldquo;{mission.statement}&rdquo;
            </p>
            {mission.explanation && (
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {mission.explanation}
              </p>
            )}
            {mission.points && (
              <ul className="space-y-2 pt-2 text-xs sm:text-sm text-foreground/80">
                {mission.points.map((pt: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="size-3.5 mt-0.5 text-primary shrink-0" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {vision && (
        <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-surface-muted/40 p-6">
          <div className="space-y-4">
            <span className="inline-block text-xs font-bold uppercase tracking-wider text-primary">
              {vision.title || 'Our Vision'}
            </span>
            <p className="text-base font-semibold leading-snug text-foreground sm:text-lg">
              &ldquo;{vision.statement}&rdquo;
            </p>
            {vision.explanation && (
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {vision.explanation}
              </p>
            )}
            {vision.points && (
              <ul className="space-y-2 pt-2 text-xs sm:text-sm text-foreground/80">
                {vision.points.map((pt: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Sparkles className="size-3.5 mt-0.5 text-primary shrink-0" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 3. Why We Exist Renderer ─────────────────────────────────────────────────
function renderWhyWeExist(data: any) {
  const challenges = data?.challenges || []

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {challenges.map((c: any, i: number) => (
        <div
          key={i}
          className="rounded-xl border border-border/70 bg-surface-raised p-5 shadow-xs"
        >
          <div className="mb-2.5 flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary-soft text-[11px] font-bold text-primary tabular-nums">
              {i + 1}
            </span>
            <h4 className="text-sm font-semibold text-foreground">{c.title}</h4>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{c.description}</p>
        </div>
      ))}
    </div>
  )
}

// ── 4. Ecosystem Bento Grid ──────────────────────────────────────────────────
function renderEcosystem(data: any) {
  const items = data?.items || []

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item: any, i: number) => (
        <div
          key={i}
          className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-5 shadow-xs transition-[border-color,box-shadow] duration-140 hover:border-primary-border/80 hover:shadow-sm"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge tone={item.tone || 'sky'} size="sm">
                {item.title.split('—')[0].trim()}
              </Badge>
            </div>
            <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
            <p className="text-xs font-medium text-primary">{item.tagline}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{item.description}</p>
          </div>

          {item.boundaries && (
            <div className="mt-4 border-t border-border/60 pt-3 text-[11px] leading-relaxed text-subtle-foreground">
              <span className="font-semibold text-foreground/70">Boundary: </span>
              {item.boundaries}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── 5. What We Do Renderer ───────────────────────────────────────────────────
function renderWhatWeDo(data: any) {
  const items = data?.items || []

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item: any, i: number) => (
        <div key={i} className="rounded-xl border border-border/70 bg-surface-raised p-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-primary tabular-nums">
              0{i + 1}.
            </span>
            <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{item.description}</p>
        </div>
      ))}
    </div>
  )
}

// ── 6. Domains Renderer ──────────────────────────────────────────────────────
function renderDomains(data: any) {
  const items = data?.items || []

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item: any, i: number) => (
        <div
          key={i}
          className="flex flex-col justify-between rounded-xl border border-border/70 bg-card p-5"
        >
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground">{item.name}</h4>
              <Badge tone={item.tone || 'slate'} size="sm">
                Domain
              </Badge>
            </div>

            <div className="mb-3 flex flex-wrap gap-1.5">
              {(item.focus || []).map((f: string, idx: number) => (
                <span
                  key={idx}
                  className="rounded-md border border-border/60 bg-surface-muted/80 px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          {item.disclaimer && (
            <div className="border-t border-border/50 pt-2 text-[11px] italic text-subtle-foreground">
              {item.disclaimer}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── 7. Principles Renderer ───────────────────────────────────────────────────
function renderPrinciples(data: any) {
  const items = data?.items || []

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
      {items.map((item: any, i: number) => (
        <div
          key={i}
          className="flex items-start gap-4 rounded-xl border border-border/70 bg-surface-raised p-5"
        >
          <span className="font-mono text-xl font-bold text-primary/70 tabular-nums">
            {item.number || (i < 9 ? `0${i + 1}` : `${i + 1}`)}
          </span>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
            <p className="text-xs leading-relaxed text-muted-foreground">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 8. AI and Humans Renderer ────────────────────────────────────────────────
function renderAiHumans(data: any) {
  const aiAssists = data?.aiAssists || []
  const humansProvide = data?.humansProvide || []
  const conclusion = data?.conclusion

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary-border/60 bg-primary-soft/30 p-5 text-center">
        <p className="text-base font-bold text-foreground sm:text-lg">
          &ldquo;{data?.thesis || 'AI can assist. Humans understand, care, and connect.'}&rdquo;
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* What AI May Help With */}
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.02] p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2 text-sky-700 dark:text-sky-400">
            <Zap className="size-4" />
            <h4 className="text-sm font-bold">What AI May Help With</h4>
          </div>
          <ul className="space-y-2.5 text-xs sm:text-sm text-foreground/85">
            {aiAssists.map((pt: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-sky-500" />
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* What Humans Bring */}
        <div className="rounded-xl border border-primary-border/60 bg-primary-soft/10 p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2 text-primary">
            <HeartHandshake className="size-4" />
            <h4 className="text-sm font-bold">What Humans Bring (Irreplaceable)</h4>
          </div>
          <ul className="space-y-2.5 text-xs sm:text-sm text-foreground/85">
            {humansProvide.map((pt: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {conclusion && (
        <p className="text-xs leading-relaxed text-muted-foreground italic sm:text-sm [text-wrap:pretty]">
          {conclusion}
        </p>
      )}
    </div>
  )
}

// ── 9. Collaboration Renderer ────────────────────────────────────────────────
function renderCollaboration(data: any) {
  const groups = data?.groups || []
  const expectations = data?.expectations || []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((grp: any, i: number) => (
          <div key={i} className="rounded-xl border border-border/80 bg-card p-5">
            <h4 className="mb-3 text-sm font-bold text-foreground">{grp.title}</h4>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              {(grp.areas || []).map((area: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="size-1 rounded-full bg-primary" />
                  <span>{area}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {expectations.length > 0 && (
        <div className="rounded-xl border border-border/80 bg-surface-muted/40 p-5">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-foreground">
            What We Expect from Collaborators
          </h4>
          <div className="flex flex-wrap gap-2">
            {expectations.map((exp: string, idx: number) => (
              <span
                key={idx}
                className="rounded-lg border border-border/80 bg-surface px-3 py-1 text-xs text-foreground/80 shadow-xs"
              >
                {exp}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 10. How We Build Renderer ────────────────────────────────────────────────
function renderHowWeBuild(data: any) {
  const steps = data?.steps || []

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {steps.map((st: any, i: number) => (
        <div
          key={i}
          className="relative flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4.5"
        >
          <div className="space-y-2">
            <span className="font-mono text-xs font-bold text-primary tabular-nums">
              STEP {st.step || `0${i + 1}`}
            </span>
            <h4 className="text-sm font-bold text-foreground">{st.title}</h4>
            <p className="text-xs leading-relaxed text-muted-foreground">{st.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 11. Research Horizons Renderer ───────────────────────────────────────────
function renderResearchFocus(data: any) {
  const areas = data?.areas || []

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {areas.map((a: any, i: number) => (
        <div key={i} className="rounded-xl border border-border/80 bg-card p-5">
          <h4 className="mb-3 text-sm font-bold text-foreground">{a.title}</h4>
          <ul className="space-y-2 text-xs text-muted-foreground">
            {(a.points || []).map((pt: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

// ── 12. New Joiner Guide Renderer ────────────────────────────────────────────
function renderNewJoiner(
  data: any,
  activeRoleIndex: number,
  setActiveRoleIndex: (idx: number) => void,
) {
  const generalChecklist = data?.generalChecklist || []
  const roleTracks = data?.roleTracks || []

  return (
    <div className="space-y-6">
      {/* General Orientation Checklist */}
      <div className="rounded-xl border border-border/80 bg-surface-raised p-5">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">
          Core Onboarding Checklist (All Joiners)
        </h4>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {generalChecklist.map((item: string, idx: number) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-surface p-3 text-xs text-foreground/85"
            >
              <CheckCircle2 className="size-4 mt-0.5 text-primary shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Role-Specific Switcher */}
      {roleTracks.length > 0 && (
        <div className="rounded-xl border border-border/80 bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border/70 pb-3">
            <span className="text-xs font-semibold text-muted-foreground">Role Track:</span>
            {roleTracks.map((r: any, idx: number) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveRoleIndex(idx)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-[background-color,color] duration-140 ${
                  activeRoleIndex === idx
                    ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground'
                }`}
              >
                {r.role}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <h5 className="text-xs font-bold text-foreground">
              {roleTracks[activeRoleIndex]?.role} Expectations:
            </h5>
            <div className="space-y-2">
              {(roleTracks[activeRoleIndex]?.checklist || []).map((chk: string, cIdx: number) => (
                <div key={cIdx} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{chk}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 13. Journey / Timeline Renderer ──────────────────────────────────────────
function renderJourney(data: any) {
  const items = data?.items || []

  return (
    <div className="relative border-l-2 border-border/80 ml-3 pl-6 space-y-6 sm:space-y-8">
      {items.map((item: any, i: number) => {
        const isCompleted = item.status === 'Completed' || item.status === 'Live'
        return (
          <div key={i} className="relative">
            {/* Timeline Node */}
            <span
              className={`absolute -left-[31px] top-1 flex size-4 items-center justify-center rounded-full border-2 border-surface ${
                isCompleted ? 'bg-primary' : 'bg-muted-foreground'
              }`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
              <Badge
                tone={
                  item.status === 'Live'
                    ? 'emerald'
                    : item.status === 'Completed'
                      ? 'blue'
                      : item.status === 'In Development'
                        ? 'amber'
                        : 'slate'
                }
                size="sm"
              >
                {item.status}
              </Badge>
              {item.category && (
                <span className="text-[11px] text-muted-foreground">({item.category})</span>
              )}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
          </div>
        )
      })}
    </div>
  )
}

// ── 14. CTA Renderer ─────────────────────────────────────────────────────────
function renderCta(data: any) {
  const primary = data?.primaryAction
  const secondary = data?.secondaryAction

  return (
    <div className="rounded-xl border border-primary-border/80 bg-primary-soft/30 p-6 sm:p-8 text-center space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-3">
        {primary && (
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              const el = document.getElementById(`section-collaboration`)
              if (el) el.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            {primary.label}
          </Button>
        )}
        {secondary && (
          <Button
            variant="outline"
            size="md"
            onClick={() => {
              window.location.href = `mailto:${secondary.email}`
            }}
          >
            {secondary.label} ({secondary.email})
          </Button>
        )}
      </div>

      {data?.governanceNote && (
        <p className="text-[11px] text-subtle-foreground pt-2">{data.governanceNote}</p>
      )}
    </div>
  )
}

// ── 15. Generic Fallback ─────────────────────────────────────────────────────
function renderGeneric(data: any) {
  if (!data || Object.keys(data).length === 0) return null
  return (
    <pre className="rounded-lg border border-border/80 bg-surface-muted p-4 text-xs overflow-x-auto text-muted-foreground">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}
