import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Activities',
  description: 'Outreach logs, calls, emails, and meetings',
}

export default function ActivitiesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
