'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Settings,
  Database,
  Bell,
  Shield,
  ArrowRight,
  User,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function SettingsPage() {
  const [role, setRole] = React.useState<string | null>(null)

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d?.user?.role) setRole(d.user.role)
      })
      .catch(() => {})
  }, [])

  const isLeader = role === 'OWNER' || role === 'TL'

  const sections = [
    {
      title: 'Personal Profile & Credentials',
      description:
        'Manage personal rep identity, direct contact details, avatar appearance, and secure password updates.',
      href: '/profile',
      icon: User,
      badge: 'Personal',
      tone: 'violet' as const,
      show: true,
    },
    {
      title: 'Notification Center & Cadence Reminders',
      description:
        'Configure delivery rules for follow-up notifications, daily meeting alerts, and assigned organization updates.',
      href: '/settings/notifications',
      icon: Bell,
      badge: 'Alerts',
      tone: 'blue' as const,
      show: true,
    },
    {
      title: 'Automated Backups & Cloud Sync',
      description:
        'Multi-sheet Excel (.xlsx) CRM export archives, scheduled weekly backups, retention policies, and Google Drive Service integration.',
      href: '/settings/backups',
      icon: Database,
      badge: 'Governance',
      tone: 'emerald' as const,
      show: isLeader,
    },
    {
      title: 'Security State & Audit Trail',
      description:
        'Review immutable audit events for all organization creations, status moves, assignments, CSV imports, and authenticated user logins.',
      href: '/settings/audit',
      icon: Shield,
      badge: 'Compliance',
      tone: 'slate' as const,
      show: isLeader,
    },
  ].filter((s) => s.show)

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <Settings className="size-5" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl tracking-tight text-foreground">
                Workspace Preferences & Governance
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure automated backups, team notification rules, and monitor system security.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sections.map((sec) => {
          const Icon = sec.icon
          return (
            <Link key={sec.href} href={sec.href} className="group block">
              <div className="h-full rounded-lg border border-border bg-surface-panel p-5 hover:border-primary/40 hover:bg-surface-elevated/40 transition-[border-color,background-color] duration-150 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 border border-primary/20 text-primary">
                      <Icon className="size-4" aria-hidden="true" />
                    </div>
                    <Badge tone={sec.tone} size="sm">
                      {sec.badge}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                      {sec.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                      {sec.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-medium text-primary pt-3 border-t border-border">
                  <span>Open Configuration</span>
                  <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
