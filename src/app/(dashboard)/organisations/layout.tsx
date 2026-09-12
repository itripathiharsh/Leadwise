import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Organisations',
  description: 'Target organisations, health status, and partnership accounts',
}

export default function OrganisationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
