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
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function SettingsPage() {
  const sections = [
    {
      title: 'Automated Weekly Backups & Google Drive',
      description:
        'Configure multi-sheet Excel (.xlsx) data backups, weekly cron schedule, retention policies, and Google Drive Service Account upload.',
      href: '/settings/backups',
      icon: Database,
      badge: 'P0 Critical',
      tone: 'emerald' as const,
    },
    {
      title: 'Notification Center & Outreach Reminders',
      description:
        'Customise notifications for follow-up reminders, upcoming meetings, new organisation assignments, and weekly backup alerts.',
      href: '/settings/notifications',
      icon: Bell,
      badge: 'P0 Critical',
      tone: 'blue' as const,
    },
    {
      title: 'Security & Audit Trail',
      description:
        'Review immutable audit events for all organisation creations, status changes, assignments, imports, and user logins.',
      href: '/settings/audit',
      icon: Shield,
      badge: 'Compliance',
      tone: 'slate' as const,
    },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="border-b border-border pb-5">
        <div className="flex items-center gap-2.5">
          <Settings className="size-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            System & Workspace Settings
          </h1>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure automated backups, team notification rules, and monitor system security.
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sections.map((sec) => {
          const Icon = sec.icon
          return (
            <Link key={sec.href} href={sec.href} className="group">
              <Card className="h-full border-border bg-surface transition-all duration-200 hover:border-primary/50 hover:shadow-md flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="size-5" />
                    </div>
                    <Badge tone={sec.tone} size="sm">
                      {sec.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-base group-hover:text-primary transition-colors">
                    {sec.title}
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed pt-1">
                    {sec.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary pt-2 border-t border-border/60">
                    <span>Manage Settings</span>
                    <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
