import { Metadata } from 'next'
import { requireUser } from '@/lib/auth/current-user'
import { getHandbook } from '@/server/services/handbook/handbook'
import { HandbookClient } from './handbook-client'

export const metadata: Metadata = {
  title: 'About Sentio Mind | Organisation Handbook',
  description:
    'Organisation handbook, mission, vision, ecosystem, and principles for Sentio Mind.',
}

export default async function AboutOrganisationPage() {
  const user = await requireUser()
  const initialData = await getHandbook(user, 'read')

  return (
    <HandbookClient
      initialData={{
        ...initialData,
        handbook: {
          ...initialData.handbook,
          publishedAt: initialData.handbook.publishedAt?.toISOString() ?? null,
          updatedAt: initialData.handbook.updatedAt.toISOString(),
        },
      }}
    />
  )
}
