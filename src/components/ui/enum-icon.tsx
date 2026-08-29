import {
  AlertTriangle,
  Building2,
  Calendar,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  CircleDot,
  Handshake,
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
  Users,
  XCircle,
  Linkedin,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tone } from '@/lib/constants'

/**
 * Resolves the icon *names* stored in `@/lib/constants` (kept as strings so the
 * constants module stays free of React imports) into real components.
 */

const ICONS: Record<string, LucideIcon> = {
  Phone,
  Mail,
  Linkedin,
  Users,
  CalendarClock,
  StickyNote,
  AlertTriangle,
  CalendarPlus,
  Calendar,
  Building2,
  Handshake,
  MessageSquare,
  CheckCircle2,
  XCircle,
  CircleDot,
}

export function EnumIcon({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const Icon = ICONS[name] ?? CircleDot
  return <Icon className={className} aria-hidden />
}

const TILE_TONES: Record<Tone, string> = {
  slate:
    'bg-slate-100 text-slate-600 dark:bg-slate-400/12 dark:text-slate-300',
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-400/12 dark:text-blue-300',
  indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-400/12 dark:text-indigo-300',
  violet: 'bg-violet-100 text-violet-600 dark:bg-violet-400/12 dark:text-violet-300',
  cyan: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-400/12 dark:text-cyan-300',
  sky: 'bg-sky-100 text-sky-600 dark:bg-sky-400/12 dark:text-sky-300',
  teal: 'bg-teal-100 text-teal-600 dark:bg-teal-400/12 dark:text-teal-300',
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-400/12 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-400/12 dark:text-amber-300',
  orange: 'bg-orange-100 text-orange-600 dark:bg-orange-400/12 dark:text-orange-300',
  rose: 'bg-rose-100 text-rose-600 dark:bg-rose-400/12 dark:text-rose-300',
}

/** Rounded icon tile used in timelines and metric cards. */
export function IconTile({
  name,
  tone = 'slate',
  size = 'md',
  className,
}: {
  name: string
  tone?: Tone
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg',
        size === 'sm' && 'size-7 [&_svg]:size-3.5',
        size === 'md' && 'size-9 [&_svg]:size-4.5',
        size === 'lg' && 'size-11 [&_svg]:size-5',
        TILE_TONES[tone],
        className,
      )}
    >
      <EnumIcon name={name} />
    </span>
  )
}
