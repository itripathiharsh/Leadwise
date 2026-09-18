import { prisma } from '@/lib/db'
import { assertCan, can } from '@/lib/rbac'
import type { CurrentUser } from '@/lib/auth/current-user'
import { INITIAL_HANDBOOK_SEED } from './seed-data'
import { Prisma } from '@prisma/client'

export const HANDBOOK_SLUG = 'about-sentio-mind'

/**
 * Safely resolves whether a userId exists in the database before setting a foreign key.
 */
async function resolveUserId(userId?: string | null): Promise<string | null> {
  if (!userId) return null
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })
  return u?.id ?? null
}

async function getAnyValidUserId(preferredId?: string | null): Promise<string> {
  const resolved = await resolveUserId(preferredId)
  if (resolved) return resolved
  const fallback = await prisma.user.findFirst({ select: { id: true } })
  return fallback?.id ?? 'system'
}

/**
 * Ensures the initial Sentio Mind handbook and its 14 standard sections exist.
 * Idempotent: If the handbook already exists, it is untouched.
 */
export async function seedHandbookIfEmpty(user?: CurrentUser | null) {
  const existing = await prisma.organisationHandbook.findUnique({
    where: { slug: HANDBOOK_SLUG },
  })

  if (existing) {
    return existing
  }

  const validUserId = await resolveUserId(user?.id)

  const handbook = await prisma.organisationHandbook.create({
    data: {
      slug: INITIAL_HANDBOOK_SEED.slug,
      title: INITIAL_HANDBOOK_SEED.title,
      subtitle: INITIAL_HANDBOOK_SEED.subtitle,
      status: 'PUBLISHED',
      createdById: validUserId,
      updatedById: validUserId,
      publishedById: validUserId,
      publishedAt: new Date(),
      sections: {
        create: INITIAL_HANDBOOK_SEED.sections.map((sec) => ({
          sectionType: sec.sectionType,
          title: sec.title,
          subtitle: sec.subtitle ?? null,
          badge: sec.badge ?? null,
          content: sec.content ?? null,
          sortOrder: sec.sortOrder,
          isVisible: sec.isVisible,
          data: sec.data ? (sec.data as Prisma.InputJsonValue) : Prisma.JsonNull,
          isDraft: false,
        })),
      },
    },
    include: {
      sections: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  })

  return handbook
}

/**
 * Retrieves the handbook with sections.
 * - In 'read' mode (default), returns only published, visible sections.
 * - In 'preview' mode (requires handbook:manage), overlays draft fields so editors see pending changes.
 * - In 'edit' mode (requires handbook:manage), includes all sections (even hidden) and both live + draft fields.
 */
export async function getHandbook(user: CurrentUser, mode: 'read' | 'preview' | 'edit' = 'read') {
  const canManage = can(user, 'handbook:manage')
  const effectiveMode = canManage ? mode : 'read'

  let handbook = await prisma.organisationHandbook.findUnique({
    where: { slug: HANDBOOK_SLUG },
    include: {
      sections: {
        orderBy: { sortOrder: 'asc' },
      },
      publishedBy: {
        select: { id: true, name: true, role: true },
      },
      updatedBy: {
        select: { id: true, name: true, role: true },
      },
    },
  })

  if (!handbook) {
    await seedHandbookIfEmpty(user)
    handbook = await prisma.organisationHandbook.findUnique({
      where: { slug: HANDBOOK_SLUG },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
        },
        publishedBy: {
          select: { id: true, name: true, role: true },
        },
        updatedBy: {
          select: { id: true, name: true, role: true },
        },
      },
    })
  }

  if (!handbook) {
    throw new Error('Failed to initialize handbook')
  }

  const rawSections = handbook.sections

  let formattedSections = rawSections.map((sec) => {
    if (effectiveMode === 'read') {
      return {
        id: sec.id,
        sectionType: sec.sectionType,
        title: sec.title,
        subtitle: sec.subtitle,
        badge: sec.badge,
        content: sec.content,
        data: sec.data,
        sortOrder: sec.sortOrder,
        isVisible: sec.isVisible,
      }
    }

    if (effectiveMode === 'preview') {
      return {
        id: sec.id,
        sectionType: sec.sectionType,
        title: sec.isDraft && sec.draftTitle ? sec.draftTitle : sec.title,
        subtitle: sec.isDraft && sec.draftSubtitle !== null ? sec.draftSubtitle : sec.subtitle,
        badge: sec.badge,
        content: sec.isDraft && sec.draftContent !== null ? sec.draftContent : sec.content,
        data: sec.isDraft && sec.draftData !== null ? sec.draftData : sec.data,
        sortOrder: sec.sortOrder,
        isVisible: sec.isVisible,
        isDraft: sec.isDraft,
      }
    }

    // 'edit' mode: return all fields
    return {
      id: sec.id,
      sectionType: sec.sectionType,
      title: sec.title,
      subtitle: sec.subtitle,
      badge: sec.badge,
      content: sec.content,
      data: sec.data,
      draftTitle: sec.draftTitle,
      draftSubtitle: sec.draftSubtitle,
      draftContent: sec.draftContent,
      draftData: sec.draftData,
      isDraft: sec.isDraft,
      sortOrder: sec.sortOrder,
      isVisible: sec.isVisible,
      effectiveTitle: sec.isDraft && sec.draftTitle ? sec.draftTitle : sec.title,
      effectiveSubtitle: sec.isDraft && sec.draftSubtitle !== null ? sec.draftSubtitle : sec.subtitle,
      effectiveContent: sec.isDraft && sec.draftContent !== null ? sec.draftContent : sec.content,
      effectiveData: sec.isDraft && sec.draftData !== null ? sec.draftData : sec.data,
    }
  })

  if (effectiveMode === 'read') {
    formattedSections = formattedSections.filter((s) => s.isVisible)
  }

  const hasDraftChanges = rawSections.some((s) => s.isDraft)

  return {
    handbook: {
      id: handbook.id,
      slug: handbook.slug,
      title: handbook.title,
      subtitle: handbook.subtitle,
      status: handbook.status,
      version: handbook.version,
      publishedAt: handbook.publishedAt,
      publishedBy: handbook.publishedBy,
      updatedAt: handbook.updatedAt,
      updatedBy: handbook.updatedBy,
      hasDraftChanges,
    },
    sections: formattedSections,
    canManage,
    mode: effectiveMode,
  }
}

/**
 * Updates handbook level title/subtitle.
 */
export async function updateHandbookMetadata(
  user: CurrentUser,
  input: { title?: string; subtitle?: string },
) {
  assertCan(user, 'handbook:manage')

  const validUserId = await resolveUserId(user.id)
  const updated = await prisma.organisationHandbook.update({
    where: { slug: HANDBOOK_SLUG },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.subtitle !== undefined && { subtitle: input.subtitle }),
      updatedById: validUserId,
    },
  })

  return updated
}

/**
 * Creates a new section.
 */
export async function createSection(
  user: CurrentUser,
  input: {
    sectionType: string
    title: string
    subtitle?: string | null
    badge?: string | null
    content?: string | null
    data?: any
    isVisible?: boolean
    sortOrder?: number
  },
) {
  assertCan(user, 'handbook:manage')

  const handbook = await prisma.organisationHandbook.findUnique({
    where: { slug: HANDBOOK_SLUG },
  })
  if (!handbook) throw new Error('Handbook not found')

  let sortOrder = input.sortOrder
  if (sortOrder === undefined) {
    const last = await prisma.handbookSection.findFirst({
      where: { handbookId: handbook.id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })
    sortOrder = (last?.sortOrder ?? -1) + 1
  }

  const section = await prisma.handbookSection.create({
    data: {
      handbookId: handbook.id,
      sectionType: input.sectionType,
      title: input.title,
      subtitle: input.subtitle ?? null,
      badge: input.badge ?? null,
      content: input.content ?? null,
      data: input.data ? (input.data as Prisma.InputJsonValue) : Prisma.JsonNull,
      sortOrder,
      isVisible: input.isVisible ?? true,
      isDraft: false,
    },
  })

  const validUserId = await resolveUserId(user.id)
  await prisma.organisationHandbook.update({
    where: { id: handbook.id },
    data: { updatedById: validUserId },
  })

  return section
}

/**
 * Updates a section (storing changes in draft or updating live).
 */
export async function updateSection(
  user: CurrentUser,
  sectionId: string,
  input: {
    title?: string
    subtitle?: string | null
    badge?: string | null
    content?: string | null
    data?: any
    isVisible?: boolean
    saveAsDraft?: boolean
  },
) {
  assertCan(user, 'handbook:manage')

  const section = await prisma.handbookSection.findUnique({
    where: { id: sectionId },
  })
  if (!section) throw new Error('Section not found')

  const saveAsDraft = input.saveAsDraft ?? true

  let updateData: Prisma.HandbookSectionUpdateInput

  if (saveAsDraft) {
    updateData = {
      ...(input.title !== undefined && { draftTitle: input.title }),
      ...(input.subtitle !== undefined && { draftSubtitle: input.subtitle }),
      ...(input.badge !== undefined && { badge: input.badge }),
      ...(input.content !== undefined && { draftContent: input.content }),
      ...(input.data !== undefined && {
        draftData: input.data ? (input.data as Prisma.InputJsonValue) : Prisma.JsonNull,
      }),
      ...(input.isVisible !== undefined && { isVisible: input.isVisible }),
      isDraft: true,
    }
  } else {
    // Direct live update
    updateData = {
      ...(input.title !== undefined && { title: input.title, draftTitle: null }),
      ...(input.subtitle !== undefined && { subtitle: input.subtitle, draftSubtitle: null }),
      ...(input.badge !== undefined && { badge: input.badge }),
      ...(input.content !== undefined && { content: input.content, draftContent: null }),
      ...(input.data !== undefined && {
        data: input.data ? (input.data as Prisma.InputJsonValue) : Prisma.JsonNull,
        draftData: Prisma.JsonNull,
      }),
      ...(input.isVisible !== undefined && { isVisible: input.isVisible }),
      isDraft: false,
    }
  }

  const updated = await prisma.handbookSection.update({
    where: { id: sectionId },
    data: updateData,
  })

  const validUserId = await resolveUserId(user.id)
  await prisma.organisationHandbook.update({
    where: { id: section.handbookId },
    data: { updatedById: validUserId },
  })

  return updated
}

/**
 * Deletes a section.
 */
export async function deleteSection(user: CurrentUser, sectionId: string) {
  assertCan(user, 'handbook:manage')

  const section = await prisma.handbookSection.findUnique({
    where: { id: sectionId },
  })
  if (!section) throw new Error('Section not found')

  await prisma.handbookSection.delete({
    where: { id: sectionId },
  })

  const validUserId = await resolveUserId(user.id)
  await prisma.organisationHandbook.update({
    where: { id: section.handbookId },
    data: { updatedById: validUserId },
  })

  return { success: true }
}

/**
 * Reorders sections by updating their sortOrder according to provided array of IDs.
 */
export async function reorderSections(user: CurrentUser, sectionIds: string[]) {
  assertCan(user, 'handbook:manage')

  const handbook = await prisma.organisationHandbook.findUnique({
    where: { slug: HANDBOOK_SLUG },
  })
  if (!handbook) throw new Error('Handbook not found')

  await prisma.$transaction(
    sectionIds.map((id, index) =>
      prisma.handbookSection.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  )

  const validUserId = await resolveUserId(user.id)
  await prisma.organisationHandbook.update({
    where: { id: handbook.id },
    data: { updatedById: validUserId },
  })

  return { success: true }
}

/**
 * Publishes all draft changes to live and creates an immutable snapshot revision.
 */
export async function publishHandbook(user: CurrentUser, changeSummary?: string) {
  assertCan(user, 'handbook:manage')

  const handbook = await prisma.organisationHandbook.findUnique({
    where: { slug: HANDBOOK_SLUG },
    include: {
      sections: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  })
  if (!handbook) throw new Error('Handbook not found')

  const validUserId = await resolveUserId(user.id)
  const validAuthorId = await getAnyValidUserId(user.id)

  const result = await prisma.$transaction(async (tx) => {
    for (const section of handbook.sections) {
      if (section.isDraft) {
        await tx.handbookSection.update({
          where: { id: section.id },
          data: {
            title: section.draftTitle || section.title,
            subtitle: section.draftSubtitle !== null ? section.draftSubtitle : section.subtitle,
            content: section.draftContent !== null ? section.draftContent : section.content,
            data:
              section.draftData !== null
                ? (section.draftData as Prisma.InputJsonValue)
                : section.data !== null
                  ? (section.data as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
            draftTitle: null,
            draftSubtitle: null,
            draftContent: null,
            draftData: Prisma.JsonNull,
            isDraft: false,
          },
        })
      }
    }

    const updatedSections = await tx.handbookSection.findMany({
      where: { handbookId: handbook.id },
      orderBy: { sortOrder: 'asc' },
    })

    const newVersion = handbook.version + 1

    const updatedHandbook = await tx.organisationHandbook.update({
      where: { id: handbook.id },
      data: {
        version: newVersion,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        publishedById: validUserId,
        updatedById: validUserId,
      },
    })

    await tx.handbookRevision.create({
      data: {
        handbookId: handbook.id,
        version: newVersion,
        contentSnapshot: updatedSections as unknown as Prisma.InputJsonValue,
        changeSummary: changeSummary ?? `Version ${newVersion} published by ${user.name}`,
        createdById: validAuthorId,
      },
    })

    return { handbook: updatedHandbook, sections: updatedSections }
  })

  return result
}

/**
 * Discards all uncommitted draft changes, resetting sections to their live state.
 */
export async function discardDraft(user: CurrentUser) {
  assertCan(user, 'handbook:manage')

  const handbook = await prisma.organisationHandbook.findUnique({
    where: { slug: HANDBOOK_SLUG },
  })
  if (!handbook) throw new Error('Handbook not found')

  await prisma.handbookSection.updateMany({
    where: { handbookId: handbook.id, isDraft: true },
    data: {
      draftTitle: null,
      draftSubtitle: null,
      draftContent: null,
      draftData: Prisma.JsonNull,
      isDraft: false,
    },
  })

  return { success: true }
}
