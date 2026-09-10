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
import {
  Building2,
  User,
  UserPlus,
  Compass,
  Tags,
  AlertTriangle,
  Plus,
  Check,
  ChevronDown,
  Search,
  X,
  Sparkles,
  HelpCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CreateContactModal } from './create-contact-modal'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export const CATEGORY_OPTIONS = [
  'Healthcare',
  'Mental Health',
  'Education',
  'Rehabilitation & Recovery',
  'Wellness & Fitness',
  'NGO / Non-Profit',
  'Corporate',
  'Technology',
  'Other',
] as const

// Predefined option lists according to CRM specification
export const DOMAIN_OPTIONS = [
  'Mental Health',
  'Physical Health',
  'Nutrition',
  'Fitness & Wellness',
  'Sleep',
  'Mindfulness & Spirituality',
  'Education & Learning',
  'Financial Wellness',
  'Relationships & Family',
  'Addiction Recovery',
  'Other',
] as const

export const ORG_TYPE_OPTIONS = [
  'NGO / Non-Profit',
  'Private Organization',
  'Government',
  'School / College / University',
  'Hospital / Clinic',
  'Rehabilitation Center',
  'Company / Corporate',
  'Community Organization',
  'Research Institution',
  'Other',
] as const

export const LEAD_SOURCE_OPTIONS = [
  'LinkedIn',
  'Google Search',
  'Website',
  'Referral',
  'Cold Research',
  'Existing Network',
  'Event / Conference',
  'Social Media',
  'Email Outreach',
  'Other',
] as const

export const TAG_SUGGESTIONS = [
  'High Potential',
  'Local',
  'Healthcare',
  'School',
  'NGO',
  'Decision Maker',
  'Follow-up Required',
] as const

interface SearchableSelectProps {
  id?: string
  value: string
  onChange: (value: string) => void
  options: readonly string[] | string[]
  placeholder: string
  searchPlaceholder?: string
  error?: boolean
  disabled?: boolean
  className?: string
}

function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = 'Search options...',
  error,
  disabled,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [highlightIndex, setHighlightIndex] = React.useState(0)

  const containerRef = React.useRef<HTMLDivElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // Drag-to-scroll refs
  const isDragging = React.useRef(false)
  const startY = React.useRef(0)
  const scrollTop = React.useRef(0)
  const hasMoved = React.useRef(false)

  const filtered = React.useMemo(() => {
    if (!search.trim()) return options
    const q = search.toLowerCase().trim()
    return options.filter((opt) => opt.toLowerCase().includes(q))
  }, [options, search])

  // Reset highlight index when filtered list changes
  React.useEffect(() => {
    setHighlightIndex(0)
  }, [search])

  // Click outside to close
  React.useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Focus search input on open
  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
  }, [open])

  // Drag-to-scroll handlers
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!listRef.current) return
    isDragging.current = true
    hasMoved.current = false
    startY.current = e.pageY
    scrollTop.current = listRef.current.scrollTop
  }

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current || !listRef.current) return
    const deltaY = e.pageY - startY.current
    if (Math.abs(deltaY) > 4) {
      hasMoved.current = true
    }
    listRef.current.scrollTop = scrollTop.current - deltaY
  }

  const onMouseUpOrLeave = () => {
    isDragging.current = false
  }

  const handleSelectOption = (opt: string) => {
    if (hasMoved.current) {
      hasMoved.current = false
      return
    }
    onChange(opt)
    setOpen(false)
    setSearch('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      setSearch('')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[highlightIndex]) {
        handleSelectOption(filtered[highlightIndex])
      }
    }
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', open && 'z-40')}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-surface px-3 py-2 text-left text-sm text-foreground shadow-xs transition-colors outline-none cursor-pointer select-none',
          'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20',
          error ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20' : 'border-border',
          disabled && 'cursor-not-allowed opacity-60',
          className,
        )}
      >
        <span className={cn('truncate', !value && 'text-muted-foreground')}>
          {value || placeholder}
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180 text-primary',
          )}
        />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1.5 w-full min-w-[240px] rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl outline-none z-50 animate-[scale-in_0.14s_cubic-bezier(0.16,1,0.3,1)]"
          onKeyDown={handleKeyDown}
        >
          {/* Search Box */}
          <div className="p-2 border-b border-border/70 bg-surface/50">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/80 text-xs">
              <Search className="size-3.5 text-muted-foreground shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options List with Native Scroll, Drag-to-Scroll, Wheel-Scroll */}
          <div
            ref={listRef}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUpOrLeave}
            onMouseLeave={onMouseUpOrLeave}
            style={{
              scrollbarWidth: 'thin',
              overscrollBehavior: 'contain',
            }}
            className="max-h-60 overflow-y-auto p-1.5 overscroll-contain select-none scrollbar-slim cursor-grab active:cursor-grabbing"
          >
            {filtered.length === 0 ? (
              <div className="py-5 text-center text-xs text-muted-foreground">
                No matching options found
              </div>
            ) : (
              filtered.map((opt, idx) => {
                const isSelected = value === opt
                const isHighlighted = highlightIndex === idx
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectOption(opt)}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-left transition-colors cursor-pointer',
                      isSelected
                        ? 'bg-primary/10 text-primary font-semibold'
                        : isHighlighted
                          ? 'bg-muted text-foreground'
                          : 'text-foreground hover:bg-muted/70',
                    )}
                  >
                    <span className="truncate pr-2">{opt}</span>
                    {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface CreateOrganisationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  usersList?: Array<{ id: string; name: string }>
  onSuccess?: (org: { id: string; name: string }) => void
  onOpenAddContact?: (orgId: string, orgName: string) => void
}

export function CreateOrganisationModal({
  open,
  onOpenChange,
  usersList = [],
  onSuccess,
  onOpenAddContact,
}: CreateOrganisationModalProps) {
  // ── Section 1: Organization Information ──
  const [name, setName] = React.useState('')
  const [category, setCategory] = React.useState('Healthcare')
  const [customCategory, setCustomCategory] = React.useState('')
  const [domain, setDomain] = React.useState('Mental Health')
  const [customDomain, setCustomDomain] = React.useState('')
  const [website, setWebsite] = React.useState('')
  const [numberOfProfessionals, setNumberOfProfessionals] = React.useState('')
  const [orgType, setOrgType] = React.useState('')
  const [customOrgType, setCustomOrgType] = React.useState('')

  // ── Section 2: Primary Contact (Optional) ──
  const [contactName, setContactName] = React.useState('')
  const [contactDesignation, setContactDesignation] = React.useState('')
  const [contactEmail, setContactEmail] = React.useState('')
  const [contactPhone, setContactPhone] = React.useState('')
  const [contactLinkedin, setContactLinkedin] = React.useState('')

  // ── Section 3: Outreach Details ──
  const [leadSource, setLeadSource] = React.useState('LinkedIn')
  const [customLeadSource, setCustomLeadSource] = React.useState('')
  const [orgPriority, setOrgPriority] = React.useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM')
  const [contactPriority, setContactPriority] = React.useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM')
  const [decisionMaker, setDecisionMaker] = React.useState<'YES' | 'NO' | 'UNKNOWN'>('UNKNOWN')
  const [initialStatus, setInitialStatus] = React.useState('ASSIGNED')
  const [assignedToId, setAssignedToId] = React.useState('')

  // ── Section 4: Additional ──
  const [tags, setTags] = React.useState<string[]>([])
  const [tagInput, setTagInput] = React.useState('')
  const [notes, setNotes] = React.useState('')

  // ── UI States ──
  const [loading, setLoading] = React.useState(false)
  const [currentUser, setCurrentUser] = React.useState<{ id: string; name: string; role: string } | null>(null)
  const [duplicates, setDuplicates] = React.useState<any[]>([])
  const [confirmDuplicate, setConfirmDuplicate] = React.useState(false)
  const [fallbackAddContact, setFallbackAddContact] = React.useState<{ id: string; name: string } | null>(null)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const handleAddContactToExisting = (existingId: string, existingName: string) => {
    if (onOpenAddContact) {
      onOpenChange(false)
      onOpenAddContact(existingId, existingName)
    } else {
      setFallbackAddContact({ id: existingId, name: existingName })
    }
  }

  // Live debounced duplicate check on organisation name
  React.useEffect(() => {
    if (!open || !name.trim() || name.trim().length < 2) {
      if (duplicates.length > 0 && !confirmDuplicate) {
        setDuplicates([])
      }
      return
    }

    const timer = setTimeout(() => {
      fetch(
        `/api/organisations/check-duplicate?name=${encodeURIComponent(name.trim())}&website=${encodeURIComponent(website.trim())}`,
      )
        .then((r) => r.json())
        .then((d) => {
          if (d.duplicates && Array.isArray(d.duplicates)) {
            setDuplicates(d.duplicates)
          }
        })
        .catch(() => {})
    }, 350)

    return () => clearTimeout(timer)
  }, [name, website, open, confirmDuplicate])

  const [availableUsers, setAvailableUsers] = React.useState<Array<{ id: string; name: string; role?: string; avatarColor?: string }>>(usersList)

  React.useEffect(() => {
    if (open) {
      fetch('/api/auth/me')
        .then((r) => r.json())
        .then((data) => {
          if (data.user) {
            setCurrentUser(data.user)
            setAssignedToId((prev) => prev || data.user.id)
          }
        })
        .catch(() => {})

      if (usersList.length > 0) {
        setAvailableUsers(usersList)
      } else {
        fetch('/api/users')
          .then((r) => r.json())
          .then((data) => {
            if (data.users) setAvailableUsers(data.users)
          })
          .catch(() => {})
      }
    }
  }, [open, usersList])

  React.useEffect(() => {
    if (!open) {
      // Reset form
      setName('')
      setCategory('Healthcare')
      setCustomCategory('')
      setDomain('Mental Health')
      setCustomDomain('')
      setWebsite('')
      setNumberOfProfessionals('')
      setOrgType('')
      setCustomOrgType('')

      setContactName('')
      setContactDesignation('')
      setContactEmail('')
      setContactPhone('')
      setContactLinkedin('')

      setLeadSource('LinkedIn')
      setCustomLeadSource('')
      setOrgPriority('MEDIUM')
      setContactPriority('MEDIUM')
      setDecisionMaker('UNKNOWN')
      setInitialStatus('NEW')
      setAssignedToId('')

      setTags([])
      setTagInput('')
      setNotes('')

      setErrors({})
      setDuplicates([])
      setConfirmDuplicate(false)
    }
  }, [open])

  // Clear specific error on field change
  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  // Tag helper
  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim()
    if (!trimmed) return
    if (!tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed])
    }
    setTagInput('')
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove))
  }

  const validateForm = () => {
    const errs: Record<string, string> = {}

    // Required: Org Name
    if (!name.trim()) {
      errs.name = 'Organization name is required.'
    } else if (name.trim().length < 2) {
      errs.name = 'Organization name must be at least 2 characters.'
    }

    // Required: Category
    if (!category) {
      errs.category = 'Category is required.'
    } else if (category === 'Other' && !customCategory.trim()) {
      errs.customCategory = 'Please specify the category.'
    }

    // Required: Domain
    if (!domain) {
      errs.domain = 'Domain is required.'
    } else if (domain === 'Other' && !customDomain.trim()) {
      errs.customDomain = 'Please specify the domain.'
    }

    // Required: Lead Source
    if (!leadSource) {
      errs.leadSource = 'Lead source is required.'
    } else if (leadSource === 'Other' && !customLeadSource.trim()) {
      errs.customLeadSource = 'Please specify the lead source.'
    }

    // Optional Org Type: If Other, require customOrgType
    if (orgType === 'Other' && !customOrgType.trim()) {
      errs.customOrgType = 'Please specify the organization type.'
    }

    // Number of Professionals validation (optional)
    if (numberOfProfessionals.trim()) {
      const val = Number(numberOfProfessionals.trim())
      if (isNaN(val) || !Number.isInteger(val) || val < 0) {
        errs.numberOfProfessionals = 'Enter a valid number of professionals (0 or more).'
      }
    }

    // Website format validation (optional)
    if (website.trim()) {
      const candidate = /^https?:\/\//i.test(website.trim()) ? website.trim() : `https://${website.trim()}`
      try {
        const url = new URL(candidate)
        if (!url.hostname.includes('.')) {
          errs.website = 'Enter a valid website URL (e.g. https://example.com).'
        }
      } catch {
        errs.website = 'Enter a valid website URL (e.g. https://example.com).'
      }
    }

    // Contact Email format validation (optional)
    if (contactEmail.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
        errs.contactEmail = 'Enter a valid email address.'
      }
    }

    // Contact Phone format validation (optional)
    if (contactPhone.trim()) {
      const digitsOnly = contactPhone.replace(/[\s\-\(\)\.]/g, '')
      if (!/^\+?[0-9]{6,16}$/.test(digitsOnly)) {
        errs.contactPhone = 'Enter a valid phone number (e.g. +91 9876543210).'
      }
    }

    // Contact LinkedIn format validation (optional)
    if (contactLinkedin.trim()) {
      const candidate = /^https?:\/\//i.test(contactLinkedin.trim()) ? contactLinkedin.trim() : `https://${contactLinkedin.trim()}`
      try {
        const url = new URL(candidate)
        if (!url.hostname.includes('.')) {
          errs.contactLinkedin = 'Enter a valid LinkedIn URL.'
        }
      } catch {
        errs.contactLinkedin = 'Enter a valid LinkedIn URL.'
      }
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Please fix the errors in the form before submitting.')
      return
    }

    setLoading(true)
    try {
      const finalCategory = category === 'Other' ? customCategory.trim() : category
      const finalDomain = domain === 'Other' ? customDomain.trim() : domain
      const finalLeadSource = leadSource === 'Other' ? customLeadSource.trim() : leadSource
      const finalOrgType = orgType === 'Other' ? customOrgType.trim() : (orgType || undefined)
      const finalProfessionals =
        numberOfProfessionals.trim() !== '' && !isNaN(Number(numberOfProfessionals.trim()))
          ? parseInt(numberOfProfessionals.trim(), 10)
          : undefined

      let finalAssignedToId: string | undefined | null = undefined
      if (assignedToId === 'UNASSIGNED') {
        finalAssignedToId = null
      } else if (assignedToId) {
        finalAssignedToId = assignedToId
      } else if (currentUser) {
        finalAssignedToId = currentUser.id
      }

      const payload: Record<string, any> = {
        name: name.trim(),
        category: finalCategory || undefined,
        domain: finalDomain,
        leadSource: finalLeadSource,
        website: website.trim() || undefined,
        numberOfProfessionals: finalProfessionals,
        organisationType: finalOrgType,
        priority: orgPriority,
        status: initialStatus,
        assignedToId: finalAssignedToId,
        notes: notes.trim() || undefined,
        confirmDuplicate,
        tags: tags.length > 0 ? tags : undefined,
      }

      // Add primary contact if any field provided
      if (contactName.trim() || contactEmail.trim() || contactPhone.trim()) {
        payload.primaryContact = {
          name: contactName.trim() || 'Primary Contact',
          designation: contactDesignation.trim() || undefined,
          email: contactEmail.trim() || undefined,
          phone: contactPhone.trim() || undefined,
          linkedinUrl: contactLinkedin.trim() || undefined,
          isDecisionMaker: decisionMaker === 'YES',
          priority: contactPriority,
        }
      }

      const res = await fetch('/api/organisations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        toast.error(data.error || 'Failed to create organization.')
        setLoading(false)
        return
      }

      if (data.status === 'DUPLICATE') {
        setDuplicates(data.duplicates || [])
        toast.warning('Possible duplicate organization detected.')
        setLoading(false)
        return
      }

      toast.success(`Organization "${name}" added successfully!`)
      onOpenChange(false)
      onSuccess?.({ id: data.id, name })
    } catch {
      toast.error('Network error creating organization.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="xl" className="max-w-4xl max-h-[92dvh] flex flex-col p-0 overflow-hidden">
        {/* Sticky Header */}
        <DialogHeader className="px-6 py-4.5 border-b border-border/80 bg-surface/80 backdrop-blur-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 ring-1 ring-primary/20">
              <Building2 className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                Add Organization
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Add a new organization or lead to the CRM. Fast, compact, and optimized for outreach workflows.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <DialogBody className="space-y-6 overflow-y-auto px-6 py-5 flex-1 min-h-0 scrollbar-slim">
            {/* Duplicate Warning Box */}
            {duplicates.length > 0 && !confirmDuplicate && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm text-amber-900 dark:text-amber-200">
                      Organisation Already Exists
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground mt-0.5">
                      We found an existing organisation matching this name in Leadwise. You can add a new contact to the existing organisation instead of creating a duplicate:
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {duplicates.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-lg border border-border bg-surface p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-xs text-foreground flex items-center gap-2">
                          <Building2 className="size-3.5 text-primary shrink-0" />
                          <span>{d.name}</span>
                          {d.status && <Badge tone="blue" size="sm">{d.status}</Badge>}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                          <span>
                            Assigned to: <strong className="text-foreground font-medium">{d.assignedTo?.name || 'Unassigned'}</strong>
                          </span>
                          <span>•</span>
                          <span>{d.contactCount || 0} existing contacts</span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        onClick={() => handleAddContactToExisting(d.id, d.name)}
                        icon={<UserPlus className="size-3.5" />}
                        className="shrink-0 font-semibold cursor-pointer"
                      >
                        Add New Contact in this Org
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={confirmDuplicate}
                      onChange={(e) => setConfirmDuplicate(e.target.checked)}
                      className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                    />
                    <span>Confirm and create duplicate organisation anyway</span>
                  </label>
                </div>
              </div>
            )}

            {/* ── SECTION 1: ORGANIZATION INFORMATION ── */}
            <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-border/70 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-primary shrink-0" />
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    1. Organization Information
                  </h3>
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">
                  Fields with <span className="text-destructive font-bold">*</span> are required
                </span>
              </div>

              {/* Row 1: Org Name */}
              <div>
                <label htmlFor="org-name" className="block text-xs font-semibold text-foreground mb-1.5">
                  Organization Name <span className="text-destructive">*</span>
                </label>
                <input
                  id="org-name"
                  type="text"
                  required
                  placeholder="Enter organization name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    clearError('name')
                  }}
                  className={cn(
                    'h-10 w-full rounded-lg border bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-colors outline-none',
                    'placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20',
                    errors.name ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : 'border-border',
                  )}
                />
                {errors.name && <p className="text-[11px] font-medium text-destructive mt-1">{errors.name}</p>}
              </div>

              {/* Row 2: Category & Domain */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label htmlFor="org-category" className="block text-xs font-semibold text-foreground mb-1.5">
                    Category <span className="text-destructive">*</span>
                  </label>
                  <SearchableSelect
                    id="org-category"
                    value={category}
                    onChange={(val) => {
                      setCategory(val)
                      clearError('category')
                    }}
                    options={CATEGORY_OPTIONS}
                    placeholder="Select Category"
                    searchPlaceholder="Search categories..."
                    error={!!errors.category}
                  />
                  {errors.category && <p className="text-[11px] font-medium text-destructive mt-1">{errors.category}</p>}

                  {/* Specify category if Other */}
                  {category === 'Other' && (
                    <div className="mt-2.5 animate-[fade-in_0.18s_ease-out]">
                      <label htmlFor="custom-category" className="block text-xs font-medium text-muted-foreground mb-1">
                        Specify category <span className="text-destructive">*</span>
                      </label>
                      <input
                        id="custom-category"
                        type="text"
                        placeholder="Enter custom category"
                        value={customCategory}
                        onChange={(e) => {
                          setCustomCategory(e.target.value)
                          clearError('customCategory')
                        }}
                        className={cn(
                          'h-9.5 w-full rounded-lg border bg-surface px-3 py-2 text-xs text-foreground shadow-xs transition-colors outline-none',
                          'placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20',
                          errors.customCategory ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : 'border-border',
                        )}
                        autoFocus
                      />
                      {errors.customCategory && (
                        <p className="text-[11px] font-medium text-destructive mt-1">{errors.customCategory}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Domain */}
                <div>
                  <label htmlFor="org-domain" className="block text-xs font-semibold text-foreground mb-1.5">
                    Domain <span className="text-destructive">*</span>
                  </label>
                  <SearchableSelect
                    id="org-domain"
                    value={domain}
                    onChange={(val) => {
                      setDomain(val)
                      clearError('domain')
                    }}
                    options={DOMAIN_OPTIONS}
                    placeholder="Select Domain"
                    searchPlaceholder="Search domains..."
                    error={!!errors.domain}
                  />
                  {errors.domain && <p className="text-[11px] font-medium text-destructive mt-1">{errors.domain}</p>}

                  {/* Specify domain if Other */}
                  {domain === 'Other' && (
                    <div className="mt-2.5 animate-[fade-in_0.18s_ease-out]">
                      <label htmlFor="custom-domain" className="block text-xs font-medium text-muted-foreground mb-1">
                        Specify domain <span className="text-destructive">*</span>
                      </label>
                      <input
                        id="custom-domain"
                        type="text"
                        placeholder="Enter custom domain"
                        value={customDomain}
                        onChange={(e) => {
                          setCustomDomain(e.target.value)
                          clearError('customDomain')
                        }}
                        className={cn(
                          'h-9.5 w-full rounded-lg border bg-surface px-3 py-2 text-xs text-foreground shadow-xs transition-colors outline-none',
                          'placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20',
                          errors.customDomain ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : 'border-border',
                        )}
                        autoFocus
                      />
                      {errors.customDomain && (
                        <p className="text-[11px] font-medium text-destructive mt-1">{errors.customDomain}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3: Organization Type & Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Organization Type */}
                <div>
                  <label htmlFor="org-type" className="block text-xs font-semibold text-foreground mb-1.5">
                    Organization Type <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                  </label>
                  <SearchableSelect
                    id="org-type"
                    value={orgType}
                    onChange={(val) => {
                      setOrgType(val)
                      clearError('customOrgType')
                    }}
                    options={ORG_TYPE_OPTIONS}
                    placeholder="Select Organization Type"
                    searchPlaceholder="Search types..."
                  />

                  {/* Specify org type if Other */}
                  {orgType === 'Other' && (
                    <div className="mt-2.5 animate-[fade-in_0.18s_ease-out]">
                      <label htmlFor="custom-org-type" className="block text-xs font-medium text-muted-foreground mb-1">
                        Specify organization type
                      </label>
                      <input
                        id="custom-org-type"
                        type="text"
                        placeholder="Enter organization type"
                        value={customOrgType}
                        onChange={(e) => {
                          setCustomOrgType(e.target.value)
                          clearError('customOrgType')
                        }}
                        className={cn(
                          'h-9.5 w-full rounded-lg border bg-surface px-3 py-2 text-xs text-foreground shadow-xs transition-colors outline-none',
                          'placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20',
                          errors.customOrgType ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : 'border-border',
                        )}
                        autoFocus
                      />
                      {errors.customOrgType && (
                        <p className="text-[11px] font-medium text-destructive mt-1">{errors.customOrgType}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3: Website & Number of Professionals */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Website */}
                <div>
                  <label htmlFor="org-website" className="block text-xs font-semibold text-foreground mb-1.5">
                    Website <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                  </label>
                  <input
                    id="org-website"
                    type="text"
                    placeholder="https://example.com"
                    value={website}
                    onChange={(e) => {
                      setWebsite(e.target.value)
                      clearError('website')
                    }}
                    className={cn(
                      'h-10 w-full rounded-lg border bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-colors outline-none',
                      'placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20',
                      errors.website ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : 'border-border',
                    )}
                  />
                  {errors.website && <p className="text-[11px] font-medium text-destructive mt-1">{errors.website}</p>}
                </div>

                {/* Number of Professionals */}
                <div>
                  <label htmlFor="org-professionals" className="block text-xs font-semibold text-foreground mb-1.5">
                    Number of Professionals <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                  </label>
                  <input
                    id="org-professionals"
                    type="number"
                    min={0}
                    step={1}
                    placeholder="e.g. 15"
                    value={numberOfProfessionals}
                    onChange={(e) => {
                      setNumberOfProfessionals(e.target.value)
                      clearError('numberOfProfessionals')
                    }}
                    className={cn(
                      'h-10 w-full rounded-lg border bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-colors outline-none',
                      'placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20',
                      errors.numberOfProfessionals ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : 'border-border',
                    )}
                  />
                  {errors.numberOfProfessionals && (
                    <p className="text-[11px] font-medium text-destructive mt-1">{errors.numberOfProfessionals}</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── SECTION 2: PRIMARY CONTACT (OPTIONAL) ── */}
            <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/70 pb-3 gap-1.5">
                <div className="flex items-center gap-2">
                  <User className="size-4 text-primary shrink-0" />
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    2. Primary Contact
                  </h3>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground tracking-wide uppercase">
                    Optional
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Can be added now or populated later. Multiple contacts supported.
                </p>
              </div>

              {/* Row 1: Contact Name & Designation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-name" className="block text-xs font-semibold text-foreground mb-1.5">
                    Contact Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    placeholder="Enter contact name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label htmlFor="contact-designation" className="block text-xs font-semibold text-foreground mb-1.5">
                    Designation / Title
                  </label>
                  <input
                    id="contact-designation"
                    type="text"
                    placeholder="e.g. Director, HR Manager, Founder"
                    value={contactDesignation}
                    onChange={(e) => setContactDesignation(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Row 2: Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-email" className="block text-xs font-semibold text-foreground mb-1.5">
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    placeholder="contact@organisation.com"
                    value={contactEmail}
                    onChange={(e) => {
                      setContactEmail(e.target.value)
                      clearError('contactEmail')
                    }}
                    className={cn(
                      'h-10 w-full rounded-lg border bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-colors outline-none',
                      'placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20',
                      errors.contactEmail ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : 'border-border',
                    )}
                  />
                  {errors.contactEmail && (
                    <p className="text-[11px] font-medium text-destructive mt-1">{errors.contactEmail}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="contact-phone" className="block text-xs font-semibold text-foreground mb-1.5">
                    Phone <span className="text-xs font-normal text-muted-foreground">(with country code)</span>
                  </label>
                  <input
                    id="contact-phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={contactPhone}
                    onChange={(e) => {
                      setContactPhone(e.target.value)
                      clearError('contactPhone')
                    }}
                    className={cn(
                      'h-10 w-full rounded-lg border bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-colors outline-none',
                      'placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20',
                      errors.contactPhone ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : 'border-border',
                    )}
                  />
                  {errors.contactPhone && (
                    <p className="text-[11px] font-medium text-destructive mt-1">{errors.contactPhone}</p>
                  )}
                </div>
              </div>

              {/* Row 3: LinkedIn */}
              <div>
                <label htmlFor="contact-linkedin" className="block text-xs font-semibold text-foreground mb-1.5">
                  LinkedIn Profile
                </label>
                <input
                  id="contact-linkedin"
                  type="text"
                  placeholder="https://linkedin.com/in/profile"
                  value={contactLinkedin}
                  onChange={(e) => {
                    setContactLinkedin(e.target.value)
                    clearError('contactLinkedin')
                  }}
                  className={cn(
                    'h-10 w-full rounded-lg border bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-colors outline-none',
                    'placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20',
                    errors.contactLinkedin ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : 'border-border',
                  )}
                />
                {errors.contactLinkedin && (
                  <p className="text-[11px] font-medium text-destructive mt-1">{errors.contactLinkedin}</p>
                )}
              </div>
            </div>

            {/* ── SECTION 3: OUTREACH DETAILS ── */}
            <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-border/70 pb-3">
                <div className="flex items-center gap-2">
                  <Compass className="size-4 text-primary shrink-0" />
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    3. Outreach Details
                  </h3>
                </div>
              </div>

              {/* Row 1: Lead Source & Handler */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Lead Source */}
                <div>
                  <label htmlFor="lead-source" className="block text-xs font-semibold text-foreground mb-1.5">
                    Lead Source <span className="text-destructive">*</span>
                  </label>
                  <SearchableSelect
                    id="lead-source"
                    value={leadSource}
                    onChange={(val) => {
                      setLeadSource(val)
                      clearError('leadSource')
                    }}
                    options={LEAD_SOURCE_OPTIONS}
                    placeholder="Select Lead Source"
                    searchPlaceholder="Search sources..."
                    error={!!errors.leadSource}
                  />
                  {errors.leadSource && (
                    <p className="text-[11px] font-medium text-destructive mt-1">{errors.leadSource}</p>
                  )}

                  {leadSource === 'Other' && (
                    <div className="mt-2.5 animate-[fade-in_0.18s_ease-out]">
                      <label htmlFor="custom-lead-source" className="block text-xs font-medium text-muted-foreground mb-1">
                        Specify lead source <span className="text-destructive">*</span>
                      </label>
                      <input
                        id="custom-lead-source"
                        type="text"
                        placeholder="Enter custom lead source"
                        value={customLeadSource}
                        onChange={(e) => {
                          setCustomLeadSource(e.target.value)
                          clearError('customLeadSource')
                        }}
                        className={cn(
                          'h-9.5 w-full rounded-lg border bg-surface px-3 py-2 text-xs text-foreground shadow-xs transition-colors outline-none',
                          'placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20',
                          errors.customLeadSource ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : 'border-border',
                        )}
                        autoFocus
                      />
                      {errors.customLeadSource && (
                        <p className="text-[11px] font-medium text-destructive mt-1">{errors.customLeadSource}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Lead Handler / Assigned To */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-foreground">
                      Assign Entity / Lead To
                    </label>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {currentUser?.role === 'INTERN' ? 'Auto-assigned' : 'Self or Others'}
                    </span>
                  </div>
                  {currentUser?.role === 'INTERN' ? (
                    <div className="flex h-10 items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      <Check className="size-4 shrink-0" />
                      <span className="truncate">Assigned to You ({currentUser.name})</span>
                    </div>
                  ) : (
                    <select
                      value={assignedToId}
                      onChange={(e) => setAssignedToId(e.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                      {currentUser && (
                        <option value={currentUser.id}>
                          Assign to Me ({currentUser.name} — {currentUser.role})
                        </option>
                      )}
                      <option value="UNASSIGNED">Unassigned (Leave in Open Pool)</option>
                      <optgroup label="All Team Members">
                        {availableUsers
                          .filter((u) => u.id !== currentUser?.id)
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} {u.role ? `(${u.role})` : ''}
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {currentUser?.role === 'INTERN'
                      ? 'Interns automatically own and work the leads they create.'
                      : 'As Team Lead or Owner, you can assign to yourself, delegate to any intern, or keep unassigned.'}
                  </p>
                </div>
              </div>

              {/* Row 2: Priorities & Decision Maker & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Org Priority */}
                <div>
                  <label htmlFor="org-priority" className="block text-xs font-semibold text-foreground mb-1.5">
                    Org Priority
                  </label>
                  <select
                    id="org-priority"
                    value={orgPriority}
                    onChange={(e) => setOrgPriority(e.target.value as 'HIGH' | 'MEDIUM' | 'LOW')}
                    className="h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    <option value="HIGH">High Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="LOW">Low Priority</option>
                  </select>
                </div>

                {/* Contact Priority */}
                <div>
                  <label htmlFor="contact-priority" className="block text-xs font-semibold text-foreground mb-1.5">
                    Contact Priority
                  </label>
                  <select
                    id="contact-priority"
                    value={contactPriority}
                    onChange={(e) => setContactPriority(e.target.value as 'HIGH' | 'MEDIUM' | 'LOW')}
                    className="h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    <option value="HIGH">High Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="LOW">Low Priority</option>
                  </select>
                </div>

                {/* Decision Maker */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Decision Maker?
                  </label>
                  <div className="flex h-10 items-center rounded-lg border border-border bg-muted/40 p-1">
                    {(['YES', 'NO', 'UNKNOWN'] as const).map((dm) => (
                      <button
                        key={dm}
                        type="button"
                        onClick={() => setDecisionMaker(dm)}
                        className={cn(
                          'flex-1 h-full rounded-md text-xs font-medium transition-all cursor-pointer capitalize',
                          decisionMaker === dm
                            ? 'bg-surface text-foreground shadow-xs font-semibold'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {dm === 'UNKNOWN' ? 'Unknown' : dm === 'YES' ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Initial Status */}
                <div>
                  <label htmlFor="initial-status" className="block text-xs font-semibold text-foreground mb-1.5">
                    Initial Status
                  </label>
                  <select
                    id="initial-status"
                    value={initialStatus}
                    onChange={(e) => setInitialStatus(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    <option value="ASSIGNED">Assigned</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="RESPONDED">Responded</option>
                    <option value="MEETING">Meeting Scheduled</option>
                    <option value="INTERESTED">Warm / Interested</option>
                    <option value="PARTNERSHIP">Partnership Signed</option>
                    <option value="REJECTED">Disqualified / Cold</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── SECTION 4: ADDITIONAL ── */}
            <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-border/70 pb-3">
                <div className="flex items-center gap-2">
                  <Tags className="size-4 text-primary shrink-0" />
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    4. Additional Information
                  </h3>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-foreground">
                  Tags <span className="text-xs font-normal text-muted-foreground">(Quick multi-select or create custom)</span>
                </label>

                {/* Tag Suggestion Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground mr-1">Suggestions:</span>
                  {TAG_SUGGESTIONS.map((sug) => {
                    const active = tags.includes(sug)
                    return (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => (active ? handleRemoveTag(sug) : handleAddTag(sug))}
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer',
                          active
                            ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                            : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60',
                        )}
                      >
                        {active ? `✓ ${sug}` : `+ ${sug}`}
                      </button>
                    )
                  })}
                </div>

                {/* Custom Tag Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Type a tag and press Enter..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddTag(tagInput)
                      }
                    }}
                    className="h-9 flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground shadow-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddTag(tagInput)}
                    disabled={!tagInput.trim()}
                    className="h-9 px-3 text-xs"
                  >
                    Add Tag
                  </Button>
                </div>

                {/* Selected Tag Pills */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/25 px-3 py-1 text-xs font-semibold text-primary"
                      >
                        <span>{t}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="text-primary/70 hover:text-primary transition-colors p-0.5 rounded-full"
                          aria-label={`Remove tag ${t}`}
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="org-notes" className="block text-xs font-semibold text-foreground mb-1.5">
                  Notes / Context <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                </label>
                <textarea
                  id="org-notes"
                  rows={3}
                  placeholder="Add any useful context, research notes, or outreach information..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface p-3 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y min-h-[76px]"
                />
              </div>
            </div>
          </DialogBody>

          {/* Sticky Footer */}
          <DialogFooter className="px-6 py-4 border-t border-border/80 bg-surface/80 backdrop-blur-xs shrink-0 flex items-center justify-between">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              <span>Optimized for fast outreach entry</span>
            </div>
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                loading={loading}
                icon={<Plus className="size-4" />}
                className="shadow-sm cursor-pointer font-semibold"
              >
                Add Organization
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {fallbackAddContact && (
      <CreateContactModal
        open={Boolean(fallbackAddContact)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setFallbackAddContact(null)
          }
        }}
        organisationId={fallbackAddContact.id}
        organisationName={fallbackAddContact.name}
      />
    )}
  </>
  )
}
