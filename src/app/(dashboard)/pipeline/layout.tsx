import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pipeline',
  description: 'Partnership pipeline progression and deal flow',
}

export default function PipelineLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
