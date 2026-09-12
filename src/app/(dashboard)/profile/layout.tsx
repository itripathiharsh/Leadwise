import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Profile',
  description: 'User profile, credentials, and notification preferences',
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
