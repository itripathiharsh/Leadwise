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
import { Field, Input } from '@/components/ui/field'
import { User, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface CreateContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organisationId?: string
  organisationName?: string
  onSuccess?: () => void
}

export function CreateContactModal({
  open,
  onOpenChange,
  organisationId: initialOrgId = '',
  organisationName = 'Organisation',
  onSuccess,
}: CreateContactModalProps) {
  const [organisationId, setOrganisationId] = React.useState(initialOrgId)
  const [orgList, setOrgList] = React.useState<Array<{ id: string; name: string }>>([])
  const [name, setName] = React.useState('')
  const [designation, setDesignation] = React.useState('')
  const [department, setDepartment] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [linkedinUrl, setLinkedinUrl] = React.useState('')
  const [isDecisionMaker, setIsDecisionMaker] = React.useState(false)
  const [priority, setPriority] = React.useState('MEDIUM')
  const [notes, setNotes] = React.useState('')
  const [assignedToId, setAssignedToId] = React.useState('')

  const [currentUser, setCurrentUser] = React.useState<{ id: string; name: string; role?: string } | null>(null)
  const [usersList, setUsersList] = React.useState<Array<{ id: string; name: string; role?: string }>>([])
  const [loading, setLoading] = React.useState(false)

  const isLeader = currentUser?.role === 'OWNER' || currentUser?.role === 'TL'

  React.useEffect(() => {
    if (open) {
      fetch('/api/auth/me')
        .then((r) => r.json())
        .then((data) => {
          if (data.user) {
            setCurrentUser(data.user)
            if (data.user.role === 'OWNER' || data.user.role === 'TL') {
              fetch('/api/users')
                .then((res) => res.json())
                .then((uData) => {
                  if (uData.users) setUsersList(uData.users)
                })
                .catch(() => {})
            }
          }
        })
        .catch(() => {})

      if (initialOrgId) {
        setOrganisationId(initialOrgId)
      } else {
        fetch('/api/organisations?pageSize=100')
          .then((r) => r.json())
          .then((data) => {
            if (data.items) setOrgList(data.items.map((it: any) => ({ id: it.id, name: it.name })))
          })
          .catch(() => {})
      }
    }
  }, [open, initialOrgId])

  React.useEffect(() => {
    if (!open) {
      if (!initialOrgId) setOrganisationId('')
      setName('')
      setDesignation('')
      setDepartment('')
      setEmail('')
      setPhone('')
      setLinkedinUrl('')
      setIsDecisionMaker(false)
      setNotes('')
      setAssignedToId('')
    }
  }, [open, initialOrgId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    if (!organisationId) {
      toast.error('Please select an organisation for this lead/contact.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organisationId,
          name: name.trim(),
          designation: designation.trim() || undefined,
          department: department.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          linkedinUrl: linkedinUrl.trim() || undefined,
          isDecisionMaker,
          priority,
          notes: notes.trim() || undefined,
          assignedToId: assignedToId || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        toast.error(data.error || 'Failed to add contact.')
        setLoading(false)
        return
      }

      toast.success(`Added contact "${name}"`)
      onOpenChange(false)
      onSuccess?.()
    } catch {
      toast.error('Network error creating contact.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <User className="size-5" />
            </div>
            <div>
              <DialogTitle>Add Contact / Lead</DialogTitle>
              <DialogDescription>
                {initialOrgId ? `Add a key stakeholder or lead under ${organisationName}.` : 'Add a new contact or lead to an outreach organisation.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <DialogBody className="space-y-4">
            {!initialOrgId && (
              <Field label="Target Organisation" required>
                <select
                  value={organisationId}
                  onChange={(e) => setOrganisationId(e.target.value)}
                  required
                  className="h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- Select Organisation --</option>
                  {orgList.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name" required>
                <Input
                  placeholder="e.g. John Doe"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10"
                />
              </Field>

              <Field label="Designation / Role">
                <Input
                  placeholder="e.g. Head of Partnerships"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="h-10"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Direct Email">
                <Input
                  type="email"
                  placeholder="john.doe@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10"
                />
              </Field>

              <Field label="Direct Phone">
                <Input
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="LinkedIn Profile URL">
                <Input
                  placeholder="https://linkedin.com/in/johndoe"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="h-10"
                />
              </Field>

              <Field label="Department">
                <Input
                  placeholder="e.g. Management / Clinical / HR"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="h-10"
                />
              </Field>
            </div>

            {/* Decision Maker switch / checkbox */}
            <div className="rounded-xl border border-border/80 bg-surface-muted/50 p-3.5 flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-xs font-semibold text-foreground">Decision Maker</label>
                <p className="text-[11px] text-muted-foreground">
                  Flags this contact as a key authority (CEO, Director, Founder, Partnership Head).
                </p>
              </div>
              <input
                type="checkbox"
                checked={isDecisionMaker}
                onChange={(e) => setIsDecisionMaker(e.target.checked)}
                className="size-4 rounded border-border text-primary focus:ring-primary"
              />
            </div>

            {isLeader && (
              <Field label="Assign Contact / Lead Handler">
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="">Default to Organisation Handler</option>
                  {currentUser && (
                    <option value={currentUser.id}>
                      Assign to Me ({currentUser.name})
                    </option>
                  )}
                  <optgroup label="Team Members">
                    {usersList
                      .filter((u) => u.id !== currentUser?.id)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} {u.role ? `(${u.role})` : ''}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </Field>
            )}

            <Field label="Contact Notes">
              <textarea
                rows={3}
                placeholder="Background, best time to reach, referral source..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface p-3 text-sm text-foreground shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y min-h-[72px]"
              />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={loading}
              icon={<Plus className="size-4" />}
            >
              Add Contact
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
