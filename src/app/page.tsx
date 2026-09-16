import type { Metadata } from 'next'
import LandingPage from './landing/page'

export const metadata: Metadata = {
  title: 'Leadwise — High-Velocity B2B Outreach Intelligence Platform',
  description:
    'Engineering-grade sales pipeline, automated cadence optimization, and contact discovery for high-velocity outreach teams.',
}

export default function HomePage() {
  return <LandingPage />
}
