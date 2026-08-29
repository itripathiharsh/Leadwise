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
import { Building2, AlertTriangle, Plus, Check } from 'lucide-react'
import { toast } from 'sonner'

interface CreateOrganisationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  usersList?: Array<{ id: string; name: string }>
  onSuccess?: (org: { id: string; name: string }) => void
}

export function CreateOrganisationModal({
  open,
  onOpenChange,
  usersList = [],
  onSuccess,
}: CreateOrganisationModalProps) {
  const [name, setName] = React.useState('')
  const [category, setCategory] = React.useState('Behavioural Health')
  const [website, setWebsite] = React.useState('')
  const [generalEmail, setGeneralEmail] = React.useState('')
  const [generalPhone, setGeneralPhone] = React.useState('')
  const [location, setLocation] = React.useState('')
  const [priority, setPriority] = React.useState('MEDIUM')
  const [assignedToId, setAssignedToId] = React.useState('')
  const [notes, setNotes] = React.useState('')

  const [loading, setLoading] = React.useState(false)
  const [duplicates, setDuplicates] = React.useState<any[]>([])
  const [confirmDuplicate, setConfirmDuplicate] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setName('')
      setWebsite('')
      setGeneralEmail('')
      setGeneralPhone('')
      setLocation('')
      setNotes('')
      setDuplicates([])
      setConfirmDuplicate(false)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const res = await fetch('/api/organisations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category: category || undefined,
          website: website.trim() || undefined,
          generalEmail: generalEmail.trim() || undefined,
          generalPhone: generalPhone.trim() || undefined,
          location: location.trim() || undefined,
          priority,
          assignedToId: assignedToId || undefined,
          notes: notes.trim() || undefined,
          confirmDuplicate,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        toast.error(data.error || 'Failed to create organisation.')
        setLoading(false)
        return
      }

      if (data.status === 'DUPLICATE') {
        setDuplicates(data.duplicates || [])
        toast.warning('Possible duplicate organisation detected.')
        setLoading(false)
        return
      }

      toast.success(`Created organisation "${name}"`)
      onOpenChange(false)
      onSuccess?.({ id: data.id, name })
    } catch {
      toast.error('Network error creating organisation.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-primary" />
            <DialogTitle>Add New Organisation</DialogTitle>
          </div>
          <DialogDescription>
            Enter details to add an organisation to the partnership outreach pipeline.
          </DialogDescription>
        </DialogHeader>

        {duplicates.length > 0 && !confirmDuplicate && (
          <div className="my-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="size-4 text-amber-600" />
              <span>Potential Duplicate Warning</span>
            </div>
            <p>
              We found {duplicates.length} existing organisation(s) with similar name or domain:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              {duplicates.map((d) => (
                <li key={d.id}>
                  <strong>{d.name}</strong> ({d.matchReason})
                </li>
              ))}
            </ul>
            <div className="pt-1">
              <label className="flex items-center gap-2 font-medium text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmDuplicate}
                  onChange={(e) => setConfirmDuplicate(e.target.checked)}
                  className="size-3.5 rounded border-border text-primary"
                />
                Confirm and create anyway
              </label>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Organisation Name" required>
              <Input
                placeholder="e.g. Athena Behavioural Health"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>

            <Field label="Sector / Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs focus:border-primary focus:outline-none"
              >
                <option value="Behavioural Health">Behavioural Health</option>
                <option value="Mental Health Clinic">Mental Health Clinic</option>
                <option value="Hospital">Hospital</option>
                <option value="School / Education">School / Education</option>
                <option value="Corporate / HR">Corporate / HR</option>
                <option value="NGO / Non-Profit">NGO / Non-Profit</option>
                <option value="Wellness Studio">Wellness Studio</option>
                <option value="Other">Other</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Website">
              <Input
                placeholder="https://athenabehavioural.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </Field>

            <Field label="General Email">
              <Input
                type="email"
                placeholder="info@organisation.com"
                value={generalEmail}
                onChange={(e) => setGeneralEmail(e.target.value)}
              />
            </Field>

            <Field label="General Phone">
              <Input
                placeholder="+91 1234567890"
                value={generalPhone}
                onChange={(e) => setGeneralPhone(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Location / City">
              <Input
                placeholder="e.g. New Delhi, India"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </Field>

            <Field label="Priority">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs focus:border-primary focus:outline-none"
              >
                <option value="HIGH">High Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="LOW">Low Priority</option>
              </select>
            </Field>

            <Field label="Assign To (Optional)">
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs focus:border-primary focus:outline-none"
              >
                <option value="">Unassigned (New Lead)</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Initial Notes">
            <textarea
              rows={2}
              placeholder="Initial context, partnership suitability, or source..."
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
              Create Organisation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
