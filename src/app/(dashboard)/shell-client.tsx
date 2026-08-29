'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Kanban,
  Building2,
  Users,
  Activity,
  CalendarClock,
  CalendarCheck,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  BarChart3,
  Upload,
  Settings,
  Plus,
  Search,
  LogOut,
  Sparkles,
  Menu,
  X,
} from 'lucide-react'
import { NotificationCenter } from '@/components/domain/notification-center'
import { GlobalSearchDialog } from '@/components/domain/global-search-dialog'
import { LogActivityModal } from '@/components/domain/log-activity-modal'
import { CreateOrganisationModal } from '@/components/domain/create-organisation-modal'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { CurrentUser } from '@/lib/auth/current-user'
import { toast } from 'sonner'

export function DashboardShell({
  user,
  children,
}: {
  user: CurrentUser
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [logModalOpen, setLogModalOpen] = React.useState(false)
  const [createOrgOpen, setCreateOrgOpen] = React.useState(false)

  const isOwnerOrTL = user.role === 'OWNER' || user.role === 'TL'

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Pipeline', href: '/pipeline', icon: Kanban },
    { label: 'Organisations', href: '/organisations', icon: Building2 },
    { label: 'Contacts', href: '/contacts', icon: Users },
    { label: 'Activities', href: '/activities', icon: Activity },
    { label: 'Follow-ups', href: '/followups', icon: CalendarClock },
    { label: 'Calendar', href: '/calendar', icon: CalendarCheck },
    { label: 'Templates', href: '/templates', icon: FileText },
    { label: 'Analytics', href: '/analytics', icon: TrendingUp },
    { label: 'AI & Funnel', href: '/analytics/advanced', icon: Sparkles },
    { label: 'EOD Reports', href: '/eod', icon: FileSpreadsheet },
    ...(isOwnerOrTL
      ? [
          { label: 'Team', href: '/team', icon: BarChart3 },
          { label: 'Import Excel', href: '/import', icon: Upload },
        ]
      : []),
    { label: 'Settings', href: '/settings', icon: Settings },
  ]

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      toast.success('Signed out successfully.')
      router.push('/login')
      router.refresh()
    } catch {
      router.push('/login')
    }
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-surface shrink-0">
        {/* Brand */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <Sparkles className="size-4.5" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-foreground">Leadwise</div>
              <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                Outreach CRM
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Action Button */}
        <div className="p-4 border-b border-border/60">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setLogModalOpen(true)}
            className="w-full justify-center shadow-xs font-semibold"
            icon={<Plus className="size-4" />}
          >
            Log Activity
          </Button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Card & Logout Footer */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center justify-between rounded-xl bg-surface-muted/60 p-2.5 border border-border/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar
                name={user.name}
                color={user.avatarColor}
                size="sm"
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-foreground truncate">{user.name}</div>
                <div className="text-[10px] text-muted-foreground capitalize">{user.role.toLowerCase()}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/90 px-4 sm:px-6 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {/* Mobile Nav Toggle */}
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="inline-flex lg:hidden size-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground"
            >
              <Menu className="size-5" />
            </button>

            {/* Quick Global Search Trigger */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border-strong hover:bg-muted shadow-xs w-48 sm:w-72"
            >
              <Search className="size-3.5" />
              <span className="truncate">Search CRM...</span>
              <kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Direct Create Organisation Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateOrgOpen(true)}
              className="hidden sm:inline-flex"
              icon={<Building2 className="size-3.5 text-primary" />}
            >
              + Org
            </Button>

            {/* Notification Center */}
            <NotificationCenter />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-surface-muted/30">
          {children}
        </main>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px]"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative flex w-64 flex-col bg-surface border-r border-border shadow-xl p-4 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Sparkles className="size-4" />
                </div>
                <span className="font-bold text-sm">Leadwise CRM</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setMobileNavOpen(false)
                setLogModalOpen(true)
              }}
              icon={<Plus className="size-4" />}
            >
              Log Activity
            </Button>

            <nav className="flex-1 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const active = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium',
                      active
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <div className="text-xs font-semibold">{user.name}</div>
              <Button variant="ghost" size="xs" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Global Dialog Modals */}
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <LogActivityModal open={logModalOpen} onOpenChange={setLogModalOpen} />
      <CreateOrganisationModal open={createOrgOpen} onOpenChange={setCreateOrgOpen} />
    </div>
  )
}
