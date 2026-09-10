import type { ContactStatus, Prisma, Priority } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { CurrentUser } from '@/lib/auth/current-user'
import { assertCan, can, canWriteOrganisation, ForbiddenError, contactScope } from '@/lib/rbac'
import {
  normalizeEmail,
  normalizeLinkedIn,
  normalizeLinkedInUrl,
  normalizePersonName,
  normalizePhone,
} from '@/lib/normalize'
import { CONTACT_STATUS_META } from '@/lib/constants'
import type { ContactCreateInput, ContactUpdateInput } from '@/lib/validation'
import { NotFoundError } from '@/server/errors'
import { writeAudit, writeAuditSafe } from './audit'
import { findContactDuplicates, type ContactDuplicate } from './duplicates'

/**
 * Contact service (spec §6, §7, §20, §22).
 *
 * Contacts hang off exactly one organisation — the schema enforces it, so an
 * orphan contact is impossible. Multiple contacts per organisation is the norm,
 * and the decision-maker flag is a first-class field because it changes who the
 * team calls first.
 */

const listSelect = {
  id: true,
  name: true,
  designation: true,
  department: true,
  email: true,
  phone: true,
  linkedinUrl: true,
  isDecisionMaker: true,
  priority: true,
  status: true,
  lastContactedAt: true,
  createdAt: true,
  organisation: { select: { id: true, name: true, status: true } },
  assignedTo: { select: { id: true, name: true, avatarColor: true } },
  _count: { select: { activities: { where: { deletedAt: null } } } },
} satisfies Prisma.ContactSelect

export type ContactListItem = Prisma.ContactGetPayload<{ select: typeof listSelect }>

export type ContactSort = 'recent' | 'name' | 'lastContacted' | 'organisation' | 'priority'

export interface ContactListParams {
  q?: string
  organisationId?: string
  status?: ContactStatus[]
  priority?: Priority[]
  assignee?: string
  decisionMakersOnly?: boolean
  sort?: ContactSort
  page?: number
  pageSize?: number
}

export const CONTACT_PAGE_SIZE = 25

export function contactSearchClause(raw: string): Prisma.ContactWhereInput | null {
  const q = raw.trim()
  if (q.length < 2) return null

  const digits = q.replace(/\D/g, '')
  const phoneKey = digits.length >= 5 ? normalizePhone(q) : null
  const nameKey = normalizePersonName(q)

  return {
    OR: [
      { name: { contains: q, mode: 'insensitive' } },
      ...(nameKey ? [{ nameNormalized: { contains: nameKey } }] : []),
      { email: { contains: q, mode: 'insensitive' } },
      { designation: { contains: q, mode: 'insensitive' } },
      ...(phoneKey ? [{ phoneNormalized: { contains: phoneKey } }] : []),
      { organisation: { name: { contains: q, mode: 'insensitive' } } },
    ],
  }
}

function orderFor(sort: ContactSort = 'recent'): Prisma.ContactOrderByWithRelationInput[] {
  switch (sort) {
    case 'name':
      return [{ name: 'asc' }]
    case 'lastContacted':
      return [{ lastContactedAt: { sort: 'desc', nulls: 'last' } }]
    case 'organisation':
      return [{ organisation: { name: 'asc' } }, { isDecisionMaker: 'desc' }, { name: 'asc' }]
    case 'priority':
      return [{ priority: 'asc' }, { name: 'asc' }]
    case 'recent':
    default:
      return [{ createdAt: 'desc' }]
  }
}

export async function listContacts(
  user: Pick<CurrentUser, 'id' | 'role'>,
  params: ContactListParams = {},
) {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(100, Math.max(5, params.pageSize ?? CONTACT_PAGE_SIZE))

  const and: Prisma.ContactWhereInput[] = [contactScope(user)]
  if (params.q) {
    const clause = contactSearchClause(params.q)
    if (clause) and.push(clause)
  }
  if (params.assignee === 'UNASSIGNED') and.push({ assignedToId: null })
  else if (params.assignee) and.push({ assignedToId: params.assignee })

  const where: Prisma.ContactWhereInput = {
    deletedAt: null,
    organisation: { deletedAt: null },
    ...(params.organisationId ? { organisationId: params.organisationId } : {}),
    ...(params.status?.length ? { status: { in: params.status } } : {}),
    ...(params.priority?.length ? { priority: { in: params.priority } } : {}),
    ...(params.decisionMakersOnly ? { isDecisionMaker: true } : {}),
    AND: and,
  }

  const [items, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      select: listSelect,
      orderBy: orderFor(params.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.contact.count({ where }),
  ])

  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) }
}

export async function getContact(user: Pick<CurrentUser, 'id' | 'role'>, id: string) {
  return prisma.contact.findFirst({
    where: { id, deletedAt: null, AND: [contactScope(user)] },
    include: {
      organisation: {
        select: {
          id: true,
          name: true,
          status: true,
          priority: true,
          website: true,
          domain: true,
          location: true,
          assignedToId: true,
          createdById: true,
          assignedTo: { select: { id: true, name: true, avatarColor: true } },
        },
      },
      assignedTo: { select: { id: true, name: true, avatarColor: true } },
      createdBy: { select: { id: true, name: true } },
      _count: {
        select: {
          activities: { where: { deletedAt: null } },
          followUps: { where: { deletedAt: null, status: 'PENDING' } },
        },
      },
    },
  })
}

export type ContactDetail = NonNullable<Awaited<ReturnType<typeof getContact>>>

/** Lightweight options for the "who did you speak to?" picker in the log drawer. */
export async function getContactOptions(organisationId: string) {
  return prisma.contact.findMany({
    where: { organisationId, deletedAt: null },
    select: { id: true, name: true, designation: true, isDecisionMaker: true },
    orderBy: [{ isDecisionMaker: 'desc' }, { name: 'asc' }],
  })
}

// ── Create / update ──────────────────────────────────────────────────────────

export type CreateContactResult =
  | { status: 'DUPLICATE'; duplicates: ContactDuplicate[] }
  | { status: 'CREATED'; id: string; name: string }

async function assertOrganisationWritable(user: CurrentUser, organisationId: string) {
  const org = await prisma.organisation.findFirst({
    where: { id: organisationId, deletedAt: null },
    select: { id: true, name: true, assignedToId: true, createdById: true },
  })
  if (!org) throw new NotFoundError('Organisation')
  if (!canWriteOrganisation(user, org)) throw new ForbiddenError()
  return org
}

export async function createContact(
  user: CurrentUser,
  input: ContactCreateInput,
): Promise<CreateContactResult> {
  assertCan(user, 'contact:create')
  const org = await assertOrganisationWritable(user, input.organisationId)

  if (!input.confirmDuplicate) {
    const duplicates = await findContactDuplicates({
      organisationId: input.organisationId,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      linkedinUrl: input.linkedinUrl ?? null,
    })
    if (duplicates.length > 0) return { status: 'DUPLICATE', duplicates }
  }

  // Whoever works the organisation works its contacts unless told otherwise by TL/Owner.
  // Whosoever gets/creates the lead handles the person throughout.
  const assignedToId = can(user, 'org:assign')
    ? (input.assignedToId ?? org.assignedToId ?? user.id)
    : (org.assignedToId ?? user.id)

  if (!org.assignedToId && assignedToId) {
    await prisma.organisation.update({
      where: { id: org.id },
      data: { assignedToId, status: 'ASSIGNED' },
    })
  }

  const created = await prisma.contact.create({
    data: {
      organisationId: input.organisationId,
      name: input.name,
      nameNormalized: normalizePersonName(input.name),
      designation: input.designation ?? null,
      department: input.department ?? null,
      email: input.email ?? null,
      emailNormalized: normalizeEmail(input.email),
      phone: input.phone ?? null,
      phoneNormalized: normalizePhone(input.phone),
      linkedinUrl: normalizeLinkedInUrl(input.linkedinUrl),
      linkedinHandle: normalizeLinkedIn(input.linkedinUrl),
      isDecisionMaker: input.isDecisionMaker,
      priority: input.priority,
      status: input.status ?? 'NEW',
      notes: input.notes ?? null,
      assignedToId,
      createdById: user.id,
    },
    select: { id: true, name: true, isDecisionMaker: true },
  })

  await writeAuditSafe({
    userId: user.id,
    action: 'contact.created',
    entityType: 'contact',
    entityId: created.id,
    entityLabel: `${created.name} · ${org.name}`,
    summary: `Added contact ${created.name}${
      created.isDecisionMaker ? ' (decision maker)' : ''
    } at ${org.name}`,
    after: { organisationId: org.id, isDecisionMaker: created.isDecisionMaker },
  })

  return { status: 'CREATED', id: created.id, name: created.name }
}

export async function updateContact(
  user: CurrentUser,
  input: ContactUpdateInput,
): Promise<CreateContactResult> {
  assertCan(user, 'contact:edit')

  const existing = await prisma.contact.findFirst({
    where: { id: input.id, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      isDecisionMaker: true,
      designation: true,
      assignedToId: true,
      organisationId: true,
      organisation: { select: { id: true, name: true, assignedToId: true, createdById: true } },
    },
  })
  if (!existing) throw new NotFoundError('Contact')
  if (!canWriteOrganisation(user, existing.organisation)) throw new ForbiddenError()

  const identityChanged =
    (input.email ?? null) !== existing.email ||
    (input.phone ?? null) !== existing.phone ||
    input.name.trim() !== existing.name.trim()

  if (identityChanged && !input.confirmDuplicate) {
    const duplicates = await findContactDuplicates({
      organisationId: existing.organisationId,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      linkedinUrl: input.linkedinUrl ?? null,
      excludeId: existing.id,
    })
    if (duplicates.length > 0) return { status: 'DUPLICATE', duplicates }
  }

  const updated = await prisma.contact.update({
    where: { id: existing.id },
    data: {
      name: input.name,
      nameNormalized: normalizePersonName(input.name),
      designation: input.designation ?? null,
      department: input.department ?? null,
      email: input.email ?? null,
      emailNormalized: normalizeEmail(input.email),
      phone: input.phone ?? null,
      phoneNormalized: normalizePhone(input.phone),
      linkedinUrl: normalizeLinkedInUrl(input.linkedinUrl),
      linkedinHandle: normalizeLinkedIn(input.linkedinUrl),
      isDecisionMaker: input.isDecisionMaker,
      priority: input.priority,
      notes: input.notes ?? null,
      ...(input.status ? { status: input.status } : {}),
      ...(can(user, 'org:assign') ? { assignedToId: input.assignedToId ?? null } : {}),
    },
    select: { id: true, name: true, status: true, isDecisionMaker: true },
  })

  await writeAuditSafe({
    userId: user.id,
    action: 'contact.updated',
    entityType: 'contact',
    entityId: updated.id,
    entityLabel: `${updated.name} · ${existing.organisation.name}`,
    summary: `Updated contact ${updated.name}`,
    before: {
      name: existing.name,
      email: existing.email,
      phone: existing.phone,
      designation: existing.designation,
      isDecisionMaker: existing.isDecisionMaker,
    },
    after: { name: updated.name, isDecisionMaker: updated.isDecisionMaker },
  })

  if (existing.status !== updated.status) {
    await writeAuditSafe({
      userId: user.id,
      action: 'contact.status_changed',
      entityType: 'contact',
      entityId: updated.id,
      entityLabel: `${updated.name} · ${existing.organisation.name}`,
      summary: `Contact status ${CONTACT_STATUS_META[existing.status].label} → ${
        CONTACT_STATUS_META[updated.status].label
      }`,
      before: { status: existing.status },
      after: { status: updated.status },
    })
  }

  return { status: 'CREATED', id: existing.id, name: input.name }
}

export async function setDecisionMaker(
  user: CurrentUser,
  input: { id: string; isDecisionMaker: boolean },
): Promise<void> {
  assertCan(user, 'contact:edit')

  const contact = await prisma.contact.findFirst({
    where: { id: input.id, deletedAt: null },
    select: {
      id: true,
      name: true,
      organisation: { select: { id: true, name: true, assignedToId: true, createdById: true } },
    },
  })
  if (!contact) throw new NotFoundError('Contact')
  if (!canWriteOrganisation(user, contact.organisation)) throw new ForbiddenError()

  await prisma.contact.update({
    where: { id: contact.id },
    data: { isDecisionMaker: input.isDecisionMaker },
  })
  await writeAuditSafe({
    userId: user.id,
    action: 'contact.updated',
    entityType: 'contact',
    entityId: contact.id,
    entityLabel: `${contact.name} · ${contact.organisation.name}`,
    summary: input.isDecisionMaker
      ? `Marked ${contact.name} as decision maker`
      : `Removed decision-maker flag from ${contact.name}`,
    after: { isDecisionMaker: input.isDecisionMaker },
  })
}

export async function softDeleteContact(user: CurrentUser, id: string): Promise<void> {
  assertCan(user, 'contact:delete')

  const contact = await prisma.contact.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true, organisation: { select: { name: true } } },
  })
  if (!contact) throw new NotFoundError('Contact')

  // The contact is archived; its activities stay on the organisation timeline
  // so history is never lost (spec §32).
  await prisma.contact.update({ where: { id }, data: { deletedAt: new Date() } })
  await prisma.followUp.updateMany({
    where: { contactId: id, status: 'PENDING', deletedAt: null },
    data: { contactId: null },
  })

  await writeAuditSafe({
    userId: user.id,
    action: 'contact.deleted',
    entityType: 'contact',
    entityId: id,
    entityLabel: `${contact.name} · ${contact.organisation.name}`,
    summary: `Archived contact ${contact.name} (activity history retained)`,
  })
}
