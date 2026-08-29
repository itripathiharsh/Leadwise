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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LogActivityModal, type ActivityTypeTab } from '@/components/domain/log-activity-modal'
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Users className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Contacts Directory</h1>
            <Badge tone="slate" size="sm">
              {total} Contacts
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Key stakeholders, decision-makers, and outreach targets across all organisations.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchContacts}
          icon={<RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />}
        >
          Refresh
        </Button>
      </div>

      {/* Search Filter Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by contact name, designation, email, phone..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="w-full rounded-xl border border-border bg-surface pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground shadow-xs outline-none focus:border-primary"
        />
      </div>

      {/* Contacts Table */}
      <div className="rounded-xl border border-border bg-surface shadow-xs overflow-hidden">
        {loading && contacts.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            Loading contacts...
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="size-8 mx-auto text-muted-foreground/60" />
            <p className="font-semibold text-sm">No contacts found</p>
            <p className="text-xs text-muted-foreground">
              Add contacts from any organisation detail page.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-surface-muted/40">
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">Designation / Role</th>
                  <th className="py-3 px-3">Organisation</th>
                  <th className="py-3 px-3">Decision Maker</th>
                  <th className="py-3 px-3">Direct Phone</th>
                  <th className="py-3 px-3">Direct Email</th>
                  <th className="py-3 px-3 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-3 font-semibold text-xs text-foreground">
                      {contact.name}
                    </td>

                    <td className="py-3 px-3 text-xs text-muted-foreground">
                      {contact.designation || '—'} {contact.department ? `(${contact.department})` : ''}
                    </td>

                    <td className="py-3 px-3">
                      <Link
                        href={`/organisations/${contact.organisation.id}`}
                        className="font-medium text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Building2 className="size-3 text-muted-foreground" />
                        {contact.organisation.name}
                      </Link>
                    </td>

                    <td className="py-3 px-3">
                      {contact.isDecisionMaker ? (
                        <Badge tone="amber" size="sm">
                          Decision Maker
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-xs font-mono">
                      {contact.phone ? (
                        <a href={`tel:${contact.phone}`} className="text-foreground hover:text-primary">
                          {contact.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-xs font-mono truncate max-w-[180px]">
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                          {contact.email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => openLog(contact, 'CALL')}
                        icon={<Phone className="size-3 text-blue-500" />}
                        title="Log Call"
                      >
                        Call
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => openLog(contact, 'EMAIL')}
                        icon={<Mail className="size-3 text-indigo-500" />}
                        title="Log Email"
                      >
                        Email
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pageCount > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <div>
              Page {page} of {pageCount} ({total} contacts)
            </div>
            <div className="flex items-center gap-1">
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
    </div>
  )
}
