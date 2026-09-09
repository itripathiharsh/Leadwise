'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Settings,
  Database,
  Bell,
  Shield,
  ArrowRight,
  Sparkles,
  Layers,
  User,
  Sliders,
  Lock,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function SettingsPage() {
  const sections = [
    {
      title: 'Personal Profile & Credentials',
      description:
        'Manage personal rep identity, direct contact details, avatar appearance, and secure password updates.',
      href: '/profile',
      icon: User,
      badge: 'Personal',
      tone: 'violet' as const,
      accent: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    },
    {
      title: 'Automated Backups & Cloud Sync',
      description:
        'Multi-sheet Excel (.xlsx) CRM export archives, scheduled weekly backups, retention policies, and Google Drive Service integration.',
      href: '/settings/backups',
      icon: Database,
      badge: 'Automated',
      tone: 'emerald' as const,
      accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Notification Center & Cadence Reminders',
      description:
        'Configure delivery rules for follow-up notifications, daily meeting alerts, and assigned entity updates.',
      href: '/settings/notifications',
      icon: Bell,
      badge: 'Alerts',
      tone: 'blue' as const,
      accent: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    },
    {
      title: 'Security State & Audit Trail',
      description:
        'Review immutable audit events for all entity creations, status moves, assignments, CSV imports, and authenticated user logins.',
      href: '/settings/audit',
      icon: Shield,
      badge: 'Compliance',
      tone: 'slate' as const,
      accent: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Executive Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
              <Settings className="size-5" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-2xl tracking-tight text-foreground">
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
              <div className="h-full glass-card rounded-2xl border border-border/80 bg-surface/75 backdrop-blur-xl p-6 shadow-sm hover:border-primary/50 hover:shadow-xl transition-all duration-200 flex flex-col justify-between space-y-5 rim-highlight">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex size-11 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-105 ${sec.accent}`}
                    >
                      <Icon className="size-5" />
                    </div>
                    <Badge tone={sec.tone} size="sm">
                      {sec.badge}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                      {sec.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                      {sec.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary pt-3 border-t border-border/60">
                  <span>Open Configuration</span>
                  <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
