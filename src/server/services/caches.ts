import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

type Client = Prisma.TransactionClient | typeof prisma

/**
 * Derived-cache maintenance.
 *
 * `Organisation.lastContactedAt`, `nextFollowupAt` and `activityCount` are
 * caches — activities and follow-ups are the truth (spec §2). Rather than
 * incrementally patching them (which drifts the moment an activity is edited,
 * backdated or soft-deleted) we recompute from source after every mutation.
 * Three indexed aggregates per write is nothing at this scale, and the numbers
 * are then correct by construction.
 *
 * A NOTE is internal bookkeeping, not outreach, so it never moves
 * `lastContactedAt`.
 */
export async function recomputeOrganisationCaches(
  client: Client,
  organisationId: string,
): Promise<void> {
  const [activityAgg, contactedAgg, followUpAgg] = await Promise.all([
    client.activity.aggregate({
      where: { organisationId, deletedAt: null },
      _count: { _all: true },
    }),
    client.activity.aggregate({
      where: { organisationId, deletedAt: null, type: { not: 'NOTE' } },
      _max: { activityDate: true },
    }),
    client.followUp.aggregate({
      where: { organisationId, deletedAt: null, status: 'PENDING' },
      _min: { dueDate: true },
    }),
  ])

  await client.organisation.update({
    where: { id: organisationId },
    data: {
      activityCount: activityAgg._count._all,
      lastContactedAt: contactedAgg._max.activityDate ?? null,
      nextFollowupAt: followUpAgg._min.dueDate ?? null,
    },
  })
}

/** Same idea for a contact: last time we actually reached out to this person. */
export async function recomputeContactCache(client: Client, contactId: string): Promise<void> {
  const agg = await client.activity.aggregate({
    where: { contactId, deletedAt: null, type: { not: 'NOTE' } },
    _max: { activityDate: true },
  })

  await client.contact.update({
    where: { id: contactId },
    data: { lastContactedAt: agg._max.activityDate ?? null },
  })
}
