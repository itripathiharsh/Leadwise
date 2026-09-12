import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Awaiting Approval',
  description: 'Account pending administrative review',
}

export default function AwaitingApprovalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
