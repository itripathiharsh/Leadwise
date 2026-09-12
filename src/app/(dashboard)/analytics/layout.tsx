import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Analytics',
  description: 'Team performance, conversion funnel, and outreach velocity metrics',
}

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
