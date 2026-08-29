'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { User, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface CreateContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organisationId: string
  organisationName?: string
  onSuccess?: () => void
}

export function CreateContactModal({
  open,
  onOpenChange,
  organisationId,
  organisationName = 'Organisation',
  onSuccess,
}: CreateContactModalProps) {
  const [name, setName] = React.useState('')
  const [designation, setDesignation] = React.useState('')
  const [department, setDepartment] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [linkedinUrl, setLinkedinUrl] = React.useState('')
  const [isDecisionMaker, setIsDecisionMaker] = React.useState(false)
  const [priority, setPriority] = React.useState('MEDIUM')
  const [notes, setNotes] = React.useState('')

  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setName('')
      setDesignation('')
      setDepartment('')
      setEmail('')
      setPhone('')
      setLinkedinUrl('')
      setIsDecisionMaker(false)
      setNotes('')
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

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
      <DialogContent size="md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <User className="size-5 text-primary" />
            <DialogTitle>Add Contact Person</DialogTitle>
          </div>
          <DialogDescription>
            Add a team member or stakeholder under {organisationName}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name" required>
              <Input
                placeholder="e.g. John Doe"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>

            <Field label="Designation / Role">
              <Input
                placeholder="e.g. Head of Partnerships"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
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
              />
            </Field>

            <Field label="Direct Phone">
              <Input
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="LinkedIn Profile URL">
              <Input
                placeholder="https://linkedin.com/in/johndoe"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
              />
            </Field>

            <Field label="Department">
              <Input
                placeholder="e.g. Management / Clinical / HR"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </Field>
          </div>

          {/* Decision Maker switch / checkbox */}
          <div className="rounded-lg border border-border/80 bg-surface-muted/50 p-3 flex items-center justify-between">
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

          <Field label="Contact Notes">
            <textarea
              rows={2}
              placeholder="Background, best time to reach, referral source..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-border bg-surface p-3 text-sm text-foreground shadow-xs focus:border-primary focus:outline-none"
            />
          </Field>

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
