import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contacts',
  description: 'Verified decision-makers and key contacts',
}

export default function ContactsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
