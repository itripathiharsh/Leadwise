import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'System configurations, preferences, backups, and audit trail',
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
