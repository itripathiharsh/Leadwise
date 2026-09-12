'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Building2,
  User,
  Sparkles,
  ExternalLink,
  X,
  LayoutDashboard,
  Kanban,
  CalendarClock,
  CalendarCheck,
  Settings,
  BarChart3,
  Users,
  FileText,
  ArrowRight,
} from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface SearchResultsState {
  organisations: Array<{
    id: string
    name: string
    status: string
    category: string | null
    location: string | null
  }>
  contacts: Array<{
    id: string
    name: string
    designation: string | null
    email: string | null
    phone: string | null
    isDecisionMaker: boolean
    organisation: { id: string; name: string }
  }>
}

const QUICK_LINKS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, shortcut: 'G D' },
  { label: 'Organisations', href: '/organisations', icon: Building2, shortcut: 'G O' },
  { label: 'Contacts', href: '/contacts', icon: Users, shortcut: 'G C' },
  { label: 'Pipeline', href: '/pipeline', icon: Kanban, shortcut: 'G P' },
  { label: 'Follow-ups', href: '/followups', icon: CalendarClock, shortcut: 'G F' },
  { label: 'Calendar', href: '/calendar', icon: CalendarCheck, shortcut: 'G A' },
  { label: 'Settings', href: '/settings', icon: Settings, shortcut: 'G S' },
]

export function GlobalSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [query, setQuery] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [results, setResults] = React.useState<SearchResultsState>({
    organisations: [],
    contacts: [],
  })
  const [focusIndex, setFocusIndex] = React.useState(-1)

  // Keyboard shortcut listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  React.useEffect(() => {
    if (!open) {
      setQuery('')
      setResults({ organisations: [], contacts: [] })
      setFocusIndex(-1)
      return
    }

    if (query.trim().length < 2) {
      setResults({ organisations: [], contacts: [] })
      setFocusIndex(-1)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&take=6`)
        if (res.ok) {
          const data = await res.json()
          setResults({
            organisations: data.organisations ?? [],
            contacts: data.contacts ?? [],
          })
          setFocusIndex(-1)
        }
      } catch (err) {
        console.error('Search failed', err)
      } finally {
        setLoading(false)
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [query, open])

  const handleSelect = (url: string) => {
    onOpenChange(false)
    router.push(url)
  }

  const hasResults = results.organisations.length > 0 || results.contacts.length > 0
  const showQuickLinks = query.trim().length < 2

  // Build flat list of all selectable items for keyboard navigation
  const allItems = React.useMemo(() => {
    if (showQuickLinks) {
      return QUICK_LINKS.map((link) => ({ type: 'quick' as const, url: link.href, label: link.label }))
    }
    const items: Array<{ type: 'org' | 'contact'; url: string; label: string }> = []
    for (const org of results.organisations) {
      items.push({ type: 'org', url: `/organisations/${org.id}`, label: org.name })
    }
    for (const contact of results.contacts) {
      items.push({ type: 'contact', url: `/organisations/${contact.organisation.id}`, label: contact.name })
    }
    return items
  }, [showQuickLinks, results])

  const handleDialogKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusIndex((prev) => Math.min(prev + 1, allItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusIndex((prev) => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter' && focusIndex >= 0 && focusIndex < allItems.length) {
      e.preventDefault()
      handleSelect(allItems[focusIndex]!.url)
    }
  }

  let itemCounter = 0

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] animate-in fade-in" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onKeyDown={handleDialogKeyDown}
          className="fixed top-[15%] left-1/2 z-50 w-full max-w-xl -translate-x-1/2 rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl overflow-hidden outline-none animate-in zoom-in-95 duration-150"
        >
          <DialogPrimitive.Title className="sr-only">Global Search</DialogPrimitive.Title>
          {/* Input Header */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
            <Search className="size-5 text-muted-foreground shrink-0" />
            <input
              type="text"
              aria-label="Search records, contacts, and organisations"
              placeholder="Search organisations, contacts, or navigate... (⌘K)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground outline-none text-foreground"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search query"
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Results View */}
          <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-border/40">
            {query.trim().length >= 2 && !hasResults && !loading && (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No organisations or contacts match &ldquo;{query}&rdquo;.
              </div>
            )}

            {results.organisations.length > 0 && (
              <div className="py-2 space-y-1">
                <div className="px-3 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Organisations
                </div>
                {results.organisations.map((org) => {
                  const idx = itemCounter++
                  return (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => handleSelect(`/organisations/${org.id}`)}
                      className={cn(
                        'w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors focus:outline-none',
                        focusIndex === idx
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted/70',
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                          <Building2 className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground truncate">{org.name}</div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {org.category || org.location || 'Organisation'}
                          </div>
                        </div>
                      </div>
                      <Badge tone="slate" size="sm">
                        {org.status}
                      </Badge>
                    </button>
                  )
                })}
              </div>
            )}

            {results.contacts.length > 0 && (
              <div className="py-2 space-y-1">
                <div className="px-3 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Contacts
                </div>
                {results.contacts.map((contact) => {
                  const idx = itemCounter++
                  return (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => handleSelect(`/organisations/${contact.organisation.id}`)}
                      className={cn(
                        'w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors focus:outline-none',
                        focusIndex === idx
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted/70',
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex size-7 items-center justify-center rounded-md bg-teal-500/10 text-teal-600 shrink-0">
                          <User className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground truncate">{contact.name}</span>
                            {contact.isDecisionMaker && (
                              <Badge tone="amber" size="sm">DM</Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {contact.designation ? `${contact.designation} • ` : ''}{contact.organisation.name}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {contact.phone || contact.email || ''}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Quick Navigation Links (when no query) */}
            {showQuickLinks && (
              <div className="py-2 space-y-1">
                <div className="px-3 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Quick Navigation
                </div>
                {QUICK_LINKS.map((link) => {
                  const idx = itemCounter++
                  const Icon = link.icon
                  return (
                    <button
                      key={link.href}
                      type="button"
                      onClick={() => handleSelect(link.href)}
                      className={cn(
                        'w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-xs transition-colors focus:outline-none',
                        focusIndex === idx
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted/70',
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 items-center justify-center rounded-md bg-surface-elevated text-muted-foreground shrink-0">
                          <Icon className="size-4" />
                        </div>
                        <span className="font-medium text-foreground">{link.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <kbd className="text-[10px] font-mono font-semibold text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded">
                          {link.shortcut}
                        </kbd>
                        <ArrowRight className="size-3 text-muted-foreground/60" />
                      </div>
                    </button>
                  )
                })}

                <div className="px-3 pt-2 mt-1 border-t border-border/40">
                  <p className="text-[11px] text-muted-foreground">
                    Type to search across all records, or use arrow keys to navigate.
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
