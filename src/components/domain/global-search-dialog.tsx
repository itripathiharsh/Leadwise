'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Search, Building2, User, Sparkles, ExternalLink, X } from 'lucide-react'
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
      return
    }

    if (query.trim().length < 2) {
      setResults({ organisations: [], contacts: [] })
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

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] animate-in fade-in" />
        <DialogPrimitive.Content className="fixed top-[15%] left-1/2 z-50 w-full max-w-xl -translate-x-1/2 rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl overflow-hidden outline-none animate-in zoom-in-95 duration-150">
          {/* Input Header */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
            <Search className="size-5 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search organisations, contacts, emails, phones, domains... (⌘K)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground outline-none text-foreground"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
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
                {results.organisations.map((org) => (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => handleSelect(`/organisations/${org.id}`)}
                    className="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-muted/70 focus:outline-none"
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
                ))}
              </div>
            )}

            {results.contacts.length > 0 && (
              <div className="py-2 space-y-1">
                <div className="px-3 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Contacts
                </div>
                {results.contacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => handleSelect(`/organisations/${contact.organisation.id}`)}
                    className="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-muted/70 focus:outline-none"
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
                ))}
              </div>
            )}

            {query.trim().length < 2 && (
              <div className="p-6 text-center text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Quick Search</p>
                <p>Type at least 2 characters to search across all records.</p>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
