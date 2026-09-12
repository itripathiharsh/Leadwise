import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reports & Executive Intelligence',
  description: 'AI-assisted outreach analytics, weekly velocity, and executive reports',
}

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
