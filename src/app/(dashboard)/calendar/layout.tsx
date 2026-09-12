import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Calendar',
  description: 'Upcoming meetings and partner calls schedule',
}

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
