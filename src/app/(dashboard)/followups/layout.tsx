import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Follow-ups',
  description: 'Scheduled cadences, due actions, and outreach reminders',
}

export default function FollowupsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
