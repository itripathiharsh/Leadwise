import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Request Access',
  description: 'Request access to the Leadwise Partnership Outreach Command Center',
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
