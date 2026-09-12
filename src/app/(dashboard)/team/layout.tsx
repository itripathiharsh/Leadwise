import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Team Management',
  description: 'Team directory, rep allocation, and member approvals',
}

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
