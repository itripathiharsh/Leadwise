import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Templates',
  description: 'Outreach scripts, messaging playbooks, and email templates',
}

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
