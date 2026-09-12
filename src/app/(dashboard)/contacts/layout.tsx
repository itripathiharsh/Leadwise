import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contacts',
  description: 'Verified decision-makers and key clinical stakeholders',
}

export default function ContactsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
