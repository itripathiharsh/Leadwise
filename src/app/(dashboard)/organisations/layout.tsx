import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Organizations',
  description: 'Target organizations, health status, and partnership accounts',
}

export default function OrganisationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
