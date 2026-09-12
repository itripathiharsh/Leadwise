'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Users,
  Search,
  Phone,
  Mail,
  Linkedin,
  Building2,
  RefreshCw,
  Plus,
  Star,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DecisionMakerBadge } from '@/components/domain/badges'
import { LogActivityModal, type ActivityTypeTab } from '@/components/domain/log-activity-modal'
import { CreateContactModal } from '@/components/domain/create-contact-modal'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ContactItem {
  id: string
  name: string
  designation: string | null
  department: string | null
  email: string | null
  phone: string | null
  linkedinUrl: string | null
  isDecisionMaker: boolean
  status: string
  priority: string
  lastContactedAt: string | null
  organisation: { id: string; name: string }
  assignedTo: { id: string; name: string } | null
}

export default function ContactsPage() {
  const [loading, setLoading] = React.useState(true)
  const [contacts, setContacts] = React.useState<ContactItem[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [pageCount, setPageCount] = React.useState(1)
  const [search, setSearch] = React.useState('')

  const [logModalOpen, setLogModalOpen] = React.useState(false)
  const [logType, setLogType] = React.useState<ActivityTypeTab>('CALL')
  const [activeContact, setActiveContact] = React.useState<ContactItem | null>(null)
  const [createContactOpen, setCreateContactOpen] = React.useState(false)

  const fetchContacts = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('q', search.trim())
      params.set('page', String(page))

      const res = await fetch(`/api/contacts?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setContacts(data.items ?? [])
        setTotal(data.total ?? 0)
        setPageCount(data.pageCount ?? 1)
      }
    } catch {
      toast.error('Failed to load contacts.')
    } finally {
      setLoading(false)
    }
  }, [search, page])

  React.useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const openLog = (contact: ContactItem, type: ActivityTypeTab) => {
    setActiveContact(contact)
    setLogType(type)
    setLogModalOpen(true)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Executive Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
              <Users className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-display font-extrabold text-2xl tracking-tight text-foreground">
                  Contacts & Decision Makers
                </h1>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-surface-elevated text-primary border border-primary/20 font-bold">
                  {total} Key Stakeholders
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Institutional authority mapping, verified direct channels, and outreach logs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchContacts}
            icon={<RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />}
            className="border-border hover:bg-surface-elevated"
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateContactOpen(true)}
            icon={<Plus className="size-4" />}
            className="shadow-md shadow-primary/20 font-semibold"
          >
            + Add Contact Person
          </Button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="glass-panel rounded-2xl border border-border/80 bg-surface/70 backdrop-blur-xl p-3 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by stakeholder name, designation, email, phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full rounded-xl border border-border bg-surface-elevated/60 pl-10 pr-9 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:bg-surface transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setPage(1)
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
              title="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Contacts Intelligence Table */}
      <div className="glass-card rounded-2xl border border-border/90 bg-surface/80 shadow-md overflow-hidden rim-highlight">
        {loading && contacts.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="size-6 mx-auto text-primary animate-spin" />
            <div className="font-semibold text-sm text-foreground">Syncing Stakeholders...</div>
            <p className="text-xs text-muted-foreground">Fetching decision maker hierarchy and communication channels.</p>
          </div>
        ) : contacts.length === 0 ? (
          search.trim() ? (
            <div className="p-16 text-center space-y-4">
              <div className="flex size-14 mx-auto items-center justify-center rounded-2xl bg-surface-elevated border border-border/80 text-muted-foreground">
                <Users className="size-7 text-primary/70" />
              </div>
              <div className="space-y-1">
                <p className="font-display font-bold text-base text-foreground">No contacts match your search</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  No stakeholders found matching &ldquo;{search.trim()}&rdquo;. Try another term or clear the search.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setPage(1)
                }}
                icon={<RefreshCw className="size-3.5" />}
              >
                Reset Search
              </Button>
            </div>
          ) : (
            <div className="p-16 text-center space-y-4">
              <div className="flex size-14 mx-auto items-center justify-center rounded-2xl bg-surface-elevated border border-border/80 text-muted-foreground">
                <Users className="size-7" />
              </div>
              <div className="space-y-1">
                <p className="font-display font-bold text-base text-foreground">No contacts yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Add stakeholders or decision makers from any organization dossier to begin mapping authority.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCreateContactOpen(true)}
                icon={<Plus className="size-4" />}
              >
                + Add First Contact
              </Button>
            </div>
          )
        ) : (
          <>
            {/* Mobile Card Feed (< md) */}
            <div className="md:hidden divide-y divide-border/60">
              {contacts.map((contact) => (
                <div key={`mobile-${contact.id}`} className="p-4 space-y-3 hover:bg-surface-elevated/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-xs font-mono">
                        {contact.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-foreground block truncate">
                          {contact.name}
                        </span>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {contact.designation || 'Stakeholder'} {contact.department ? `· ${contact.department}` : ''}
                        </div>
                      </div>
                    </div>

                    {contact.isDecisionMaker && (
                      <span className="shrink-0 inline-flex items-center gap-1 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <Star className="size-2.5 fill-amber-400 text-amber-400" /> DM
                      </span>
                    )}
                  </div>

                  <div className="text-xs">
                    <Link
                      href={`/organisations/${contact.organisation.id}`}
                      className="font-semibold text-xs text-primary hover:underline inline-flex items-center gap-1.5"
                    >
                      <Building2 className="size-3 text-muted-foreground" />
                      <span>{contact.organisation.name}</span>
                    </Link>
                  </div>

                  {(contact.phone || contact.email) && (
                    <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[11px] pt-1 border-t border-border/40 text-muted-foreground">
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="hover:text-primary transition-colors flex items-center gap-1">
                          <Phone className="size-2.5" /> {contact.phone}
                        </a>
                      )}
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="text-primary hover:underline flex items-center gap-1 truncate max-w-[200px]">
                          <Mail className="size-2.5" /> {contact.email}
                        </a>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => openLog(contact, 'CALL')}
                      icon={<Phone className="size-3 text-sky-400" />}
                      className="hover:bg-primary/10 text-xs font-semibold"
                    >
                      Call
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => openLog(contact, 'EMAIL')}
                      icon={<Mail className="size-3 text-indigo-400" />}
                      className="hover:bg-primary/10 text-xs font-semibold"
                    >
                      Email
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-[11px] font-mono uppercase tracking-wider text-muted-foreground bg-surface-elevated/40">
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Role & Department</th>
                  <th className="py-3.5 px-4">Entity</th>
                  <th className="py-3.5 px-4">Authority Level</th>
                  <th className="py-3.5 px-4">Direct Phone</th>
                  <th className="py-3.5 px-4">Direct Email</th>
                  <th className="py-3.5 px-4 text-right">Cadence Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="group hover:bg-surface-elevated/60 transition-colors duration-150"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-xs font-mono">
                          {contact.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-foreground block truncate">
                            {contact.name}
                          </span>
                          {contact.linkedinUrl && (
                            <a
                              href={contact.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-sky-400 hover:underline inline-flex items-center gap-1 mt-0.5"
                            >
                              <Linkedin className="size-2.5" /> LinkedIn
                            </a>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-muted-foreground">
                      <div className="font-medium text-foreground/90">{contact.designation || '—'}</div>
                      {contact.department && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {contact.department}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <Link
                        href={`/organisations/${contact.organisation.id}`}
                        className="font-semibold text-xs text-primary hover:underline flex items-center gap-1.5 truncate max-w-[170px]"
                      >
                        <Building2 className="size-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{contact.organisation.name}</span>
                      </Link>
                    </td>

                    <td className="py-3.5 px-4">
                      {contact.isDecisionMaker ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <Star className="size-2.5 fill-amber-400 text-amber-400" />
                          Decision Maker
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/60 font-mono text-[11px]">Staff</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs font-mono text-[11px]">
                      {contact.phone ? (
                        <a href={`tel:${contact.phone}`} className="text-foreground hover:text-primary transition-colors">
                          {contact.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs font-mono text-[11px] truncate max-w-[190px]">
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                          {contact.email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => openLog(contact, 'CALL')}
                          icon={<Phone className="size-3 text-sky-400" />}
                          className="hover:bg-primary/10 text-xs font-semibold"
                        >
                          Call
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => openLog(contact, 'EMAIL')}
                          icon={<Mail className="size-3 text-indigo-400" />}
                          className="hover:bg-primary/10 text-xs font-semibold"
                        >
                          Email
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* Pagination footer */}
        {pageCount > 1 && (
          <div className="flex items-center justify-between border-t border-border/80 px-4 py-3 text-xs text-muted-foreground bg-surface-elevated/30">
            <div className="font-mono text-[11px]">
              Showing page <span className="text-foreground font-bold">{page}</span> of {pageCount} ({total} contacts)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="xs"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {activeContact && (
        <LogActivityModal
          open={logModalOpen}
          onOpenChange={setLogModalOpen}
          initialType={logType}
          initialOrganisationId={activeContact.organisation.id}
          initialContactId={activeContact.id}
          onSuccess={fetchContacts}
        />
      )}

      <CreateContactModal
        open={createContactOpen}
        onOpenChange={setCreateContactOpen}
        onSuccess={fetchContacts}
      />
    </div>
  )
}
