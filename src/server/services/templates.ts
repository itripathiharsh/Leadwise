import { prisma } from '@/lib/db'
import type { CurrentUser } from '@/lib/auth/current-user'
import { assertCan } from '@/lib/rbac'
import { NotFoundError } from '@/server/errors'

export interface TemplateInterpolationContext {
  organisationName?: string
  contactName?: string
  contactDesignation?: string
  senderName?: string
  senderRole?: string
  senderPhone?: string
}

/**
 * Replaces placeholders like {{organisation_name}}, {{contact_name}}, {{sender_name}}
 */
export function interpolateTemplate(
  text: string,
  context: TemplateInterpolationContext,
): string {
  let output = text

  const map: Record<string, string> = {
    '{{organisation_name}}': context.organisationName || '[Organisation Name]',
    '{{contact_name}}': context.contactName || '[Contact Name]',
    '{{contact_designation}}': context.contactDesignation || '[Designation]',
    '{{sender_name}}': context.senderName || '[Your Name]',
    '{{my_name}}': context.senderName || '[Your Name]',
    '{{sender_phone}}': context.senderPhone || '[Phone]',
    '{{sender_role}}': context.senderRole || 'Partnerships Lead',
  }

  for (const [placeholder, value] of Object.entries(map)) {
    output = output.replaceAll(placeholder, value)
  }

  return output
}

export async function listTemplates(
  _user: Pick<CurrentUser, 'id' | 'role'>,
  category?: string,
) {
  return prisma.template.findMany({
    where: {
      isArchived: false,
      ...(category ? { category } : {}),
    },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [{ category: 'asc' }, { title: 'asc' }],
  })
}

export async function createTemplate(
  user: CurrentUser,
  input: {
    title: string
    category: string
    subcategory?: string | null
    subject?: string | null
    body: string
  },
) {
  assertCan(user, 'template:manage')

  return prisma.template.create({
    data: {
      title: input.title.trim(),
      category: input.category,
      subcategory: input.subcategory?.trim() || null,
      subject: input.subject?.trim() || null,
      body: input.body.trim(),
      createdById: user.id,
    },
  })
}

export async function updateTemplate(
  user: CurrentUser,
  id: string,
  input: {
    title?: string
    category?: string
    subcategory?: string | null
    subject?: string | null
    body?: string
    isArchived?: boolean
  },
) {
  assertCan(user, 'template:manage')

  const existing = await prisma.template.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Template')

  return prisma.template.update({
    where: { id },
    data: {
      ...(input.title ? { title: input.title.trim() } : {}),
      ...(input.category ? { category: input.category } : {}),
      ...(input.subcategory !== undefined ? { subcategory: input.subcategory?.trim() || null } : {}),
      ...(input.subject !== undefined ? { subject: input.subject?.trim() || null } : {}),
      ...(input.body ? { body: input.body.trim() } : {}),
      ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
    },
  })
}

export async function deleteTemplate(user: CurrentUser, id: string) {
  assertCan(user, 'template:manage')

  const existing = await prisma.template.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Template')

  return prisma.template.update({
    where: { id },
    data: { isArchived: true },
  })
}
