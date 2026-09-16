'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Kanban,
  Building2,
  Users,
  Activity,
  CalendarClock,
  CalendarCheck,
  FileText,
  TrendingUp,
  BarChart3,
  Settings,
  User,
  Plus,
  ChevronDown,
  Search,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Keyboard,
} from 'lucide-react'
import { NotificationCenter } from '@/components/domain/notification-center'
import { GlobalSearchDialog } from '@/components/domain/global-search-dialog'
import { LogActivityModal } from '@/components/domain/log-activity-modal'
import { CreateOrganisationModal } from '@/components/domain/create-organisation-modal'
import { CreateContactModal } from '@/components/domain/create-contact-modal'
import { KeyboardShortcutsModal } from '@/components/domain/keyboard-shortcuts-modal'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
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
  const [createContactOpen, setCreateContactOpen] = React.useState(false)
  const [preselectedOrg, setPreselectedOrg] = React.useState<{ id: string; name: string } | null>(null)
  const [isDark, setIsDark] = React.useState(true)
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false)

  React.useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggleTheme = () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('leadwise_theme', 'light')
      setIsDark(false)
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('leadwise_theme', 'dark')
      setIsDark(true)
    }
  }

  const isOwnerOrTL = user.role === 'OWNER' || user.role === 'TL'

  // Global keyboard shortcuts
  React.useEffect(() => {
    let gPending = false
    let gTimer: ReturnType<typeof setTimeout> | null = null

    const isEditable = () => {
      const el = document.activeElement
      if (!el) return false
      const tag = el.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
      if ((el as HTMLElement).isContentEditable) return true
      return false
    }

    const NAV_MAP: Record<string, string> = {
      d: '/dashboard',
      o: '/organisations',
      c: '/contacts',
      p: '/pipeline',
      f: '/followups',
      a: '/calendar',
      r: '/analytics',
      s: '/settings',
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K → global search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
        return
      }

      if (isEditable()) return

      // ? → help modal
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setShortcutsOpen((prev) => !prev)
        return
      }

      // N → log activity
      if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault()
        setLogModalOpen(true)
        return
      }

      // G+letter chord navigation
      if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (!gPending) {
          gPending = true
          gTimer = setTimeout(() => { gPending = false }, 600)
          return
        }
      }

      if (gPending) {
        const target = NAV_MAP[e.key.toLowerCase()]
        if (target) {
          e.preventDefault()
          router.push(target)
        }
        gPending = false
        if (gTimer) clearTimeout(gTimer)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (gTimer) clearTimeout(gTimer)
    }
  }, [router])

  const navGroups = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Outreach',
      items: [
        { label: 'Organizations', href: '/organisations', icon: Building2 },
        { label: 'Contacts', href: '/contacts', icon: Users },
        { label: 'Pipeline', href: '/pipeline', icon: Kanban },
        { label: 'Activities', href: '/activities', icon: Activity },
        { label: 'Follow-ups', href: '/followups', icon: CalendarClock },
        { label: 'Calendar', href: '/calendar', icon: CalendarCheck },
      ],
    },
    {
      title: 'Resources',
      items: [
        { label: 'Templates', href: '/templates', icon: FileText },
        ...(isOwnerOrTL ? [{ label: 'Team', href: '/team', icon: BarChart3 }] : []),
      ],
    },
  ...(isOwnerOrTL
    ? [
        {
          title: 'Insights',
          items: [
            { label: 'Analytics', href: '/analytics', icon: TrendingUp },
          ],
        },
      ]
    : []),
    {
      title: 'System',
      items: [
        { label: 'Settings', href: '/settings', icon: Settings },
      ],
    },
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
      <aside className="hidden lg:flex w-60 flex-col border-r border-border bg-surface shrink-0 z-20">
        {/* Brand */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-border">
          <Link href="/dashboard" prefetch={true} className="flex items-center gap-2.5 group">
            <Image
              src="/logo-white-text.png"
              alt="Leadwise"
              width={140}
              height={32}
              priority
              className="h-8 w-auto max-w-[140px] object-contain hidden dark:block"
            />
            <Image
              src="/logo-dark-text.png"
              alt="Leadwise"
              width={140}
              height={32}
              priority
              className="h-8 w-auto max-w-[140px] object-contain block dark:hidden"
            />
          </Link>
        </div>

        {/* Quick Action Button */}
        <div className="p-3 border-b border-border/70">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setLogModalOpen(true)}
            className="w-full justify-center font-semibold h-8 text-xs"
            icon={<Plus className="size-3.5" />}
          >
            Log Activity
          </Button>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto p-2.5 space-y-3.5 scrollbar-slim">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-0.5">
              <div className="px-2.5 py-1 text-[11px] font-semibold text-muted-foreground/80">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href))
                  const Icon = item.icon

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      className={cn(
                        'relative flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium transition-[background-color,color] duration-120',
                        active
                          ? 'bg-primary/10 text-primary font-semibold border-l-2 border-primary rounded-r-md rounded-l-none pl-2'
                          : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground rounded-md border-l-2 border-transparent',
                      )}
                    >
                      <Icon className={cn('size-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Card & Logout Footer */}
        <div className="p-2.5 border-t border-border">
          <div className="flex items-center justify-between rounded-lg bg-surface-muted p-2 border border-border">
            <Link
              href="/profile"
              prefetch={true}
              className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-85 transition-opacity"
              title="View my profile"
            >
              <Avatar
                name={user.name}
                color={user.avatarColor}
                size="sm"
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-foreground truncate">{user.name}</div>
                <div className="text-[10px] text-muted-foreground capitalize">{user.role.toLowerCase()}</div>
              </div>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-destructive transition-colors shrink-0"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>

          {/* Keyboard Shortcuts Help Button */}
          <div className="pt-2 px-1">
            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              className="w-full flex items-center justify-between rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
              title="Keyboard shortcuts (?)"
            >
              <span className="flex items-center gap-1.5">
                <Keyboard className="size-3.5" />
                <span>Shortcuts</span>
              </span>
              <kbd className="rounded bg-surface-muted px-1.5 py-0.2 text-[9px] font-mono text-muted-foreground border border-border">?</kbd>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile Nav Toggle */}
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="inline-flex lg:hidden size-8 items-center justify-center rounded-md border border-border bg-surface text-foreground"
            >
              <Menu className="size-4" />
            </button>

            {/* Quick Global Search Trigger */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-muted-foreground transition-[border-color,background-color] duration-120 hover:border-border-strong hover:bg-surface-hover shadow-xs w-48 sm:w-64"
            >
              <Search className="size-3.5" />
              <span className="truncate">Search Command (Cmd+K)...</span>
              <kbd className="ml-auto rounded bg-surface-muted px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground border border-border">
                ⌘K
              </kbd>
            </button>

            {/* Operational Sync State */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border border-border bg-surface-muted text-[11px] font-mono text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <span>Synced</span>
            </div>
          </div>

          {/* Right Header Actions: Unified Global Quick Action & Notification Center */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="primary"
                  size="sm"
                  className="font-semibold shadow-xs flex items-center gap-1.5 px-3 py-1 h-8 text-xs cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>New</span>
                  <ChevronDown className="size-3 opacity-70 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 space-y-0.5">
                <DropdownMenuItem
                  onClick={() => setLogModalOpen(true)}
                  className="flex items-center gap-3 py-2 px-2.5 rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                >
                  <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                    <Activity className="size-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-foreground">Log Activity</div>
                    <div className="text-[10.5px] text-muted-foreground">Calls, emails, meetings, notes</div>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setCreateOrgOpen(true)}
                  className="flex items-center gap-3 py-2 px-2.5 rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                >
                  <div className="flex size-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Building2 className="size-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-foreground">Add Organisation</div>
                    <div className="text-[10.5px] text-muted-foreground">New partnership target</div>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setCreateContactOpen(true)}
                  className="flex items-center gap-3 py-2 px-2.5 rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                >
                  <div className="flex size-7 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                    <Users className="size-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-foreground">Add Contact</div>
                    <div className="text-[10.5px] text-muted-foreground">Contact or decision maker</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notification Center */}
            <NotificationCenter />

            {/* Theme Switcher Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-border/80 bg-surface/80 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all duration-150 shadow-xs cursor-pointer active:scale-95"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? (
                <Sun className="size-4 text-amber-400 hover:rotate-45 transition-transform duration-200" />
              ) : (
                <Moon className="size-4 text-primary hover:-rotate-12 transition-transform duration-200" />
              )}
            </button>

            {/* User Profile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`${user.name} account menu`}
                  className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-primary/30 transition-all focus-visible:outline-none cursor-pointer"
                  title={`${user.name} (${user.role})`}
                >
                  <Avatar name={user.name} color={user.avatarColor} size="sm" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 p-1.5 space-y-0.5">
                <div className="px-2.5 py-2 border-b border-border/80 mb-1">
                  <div className="font-semibold text-xs text-foreground truncate">{user.name}</div>
                  <div className="text-[10.5px] text-muted-foreground truncate">{user.email}</div>
                  <div className="mt-1.5 inline-flex items-center text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    {user.role}
                  </div>
                </div>
                <DropdownMenuItem asChild>
                  <Link href="/profile" prefetch={true} className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs cursor-pointer rounded-md hover:bg-muted">
                    <User className="size-3.5 text-muted-foreground" />
                    <span>My Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" prefetch={true} className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs cursor-pointer rounded-md hover:bg-muted">
                    <Settings className="size-3.5 text-muted-foreground" />
                    <span>Settings & Preferences</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive-soft cursor-pointer mt-1 border-t border-border/60 rounded-md"
                >
                  <LogOut className="size-3.5" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main id="main-content" className="flex-1 overflow-y-auto bg-surface-muted/30 outline-none pb-20 lg:pb-0" tabIndex={-1}>
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar for rapid thumb access */}
        <nav
          aria-label="Mobile Navigation Bar"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around border-t border-border bg-surface px-3 shadow-lg"
        >
          <Link
            href="/dashboard"
            prefetch={true}
            className={cn(
              'flex flex-col items-center gap-1 text-[10px] font-medium transition-colors',
              pathname === '/dashboard' ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <LayoutDashboard className="size-4" />
            <span>Overview</span>
          </Link>

          <Link
            href="/organisations"
            prefetch={true}
            className={cn(
              'flex flex-col items-center gap-1 text-[10px] font-medium transition-colors',
              pathname.startsWith('/organisations') ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Building2 className="size-4" />
            <span>Orgs</span>
          </Link>

          {/* Quick Center Action */}
          <button
            type="button"
            onClick={() => setLogModalOpen(true)}
            className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform active:scale-95 cursor-pointer shadow-xs"
            aria-label="Log activity"
            title="Log Touchpoint"
          >
            <Plus className="size-4" />
          </button>

          <Link
            href="/pipeline"
            prefetch={true}
            className={cn(
              'flex flex-col items-center gap-1 text-[10px] font-medium transition-colors',
              pathname.startsWith('/pipeline') ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Kanban className="size-4" />
            <span>Pipeline</span>
          </Link>

          <Link
            href="/followups"
            prefetch={true}
            className={cn(
              'flex flex-col items-center gap-1 text-[10px] font-medium transition-colors',
              pathname.startsWith('/followups') ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <CalendarClock className="size-4" />
            <span>Cadence</span>
          </Link>
        </nav>
      </div>

      {/* Mobile Navigation Drawer */}
      <DialogPrimitive.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs animate-in fade-in" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-surface border-r border-border shadow-xl p-4 space-y-4 outline-none animate-in slide-in-from-left duration-200"
          >
            <DialogPrimitive.Title className="sr-only">Navigation Menu</DialogPrimitive.Title>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Image
                  src="/logo-white-text.png"
                  alt="Leadwise"
                  width={124}
                  height={26}
                  className="h-6 w-auto max-w-[124px] object-contain hidden dark:block"
                />
                <Image
                  src="/logo-dark-text.png"
                  alt="Leadwise"
                  width={124}
                  height={26}
                  className="h-6 w-auto max-w-[124px] object-contain block dark:hidden"
                />
              </div>
              <DialogPrimitive.Close
                aria-label="Close navigation menu"
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="size-5" />
              </DialogPrimitive.Close>
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

            <nav className="flex-1 space-y-3 overflow-y-auto scrollbar-slim" aria-label="Mobile Navigation">
              {navGroups.map((group) => (
                <div key={group.title} className="space-y-1">
                  <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {group.title}
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const active =
                        pathname === item.href ||
                        (item.href !== '/dashboard' && pathname.startsWith(item.href))
                      const Icon = item.icon

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={true}
                          onClick={() => setMobileNavOpen(false)}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                            active
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          )}
                        >
                          <Icon className={cn('size-4', active ? 'text-primary' : 'text-muted-foreground')} />
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <Link
                href="/profile"
                prefetch={true}
                onClick={() => setMobileNavOpen(false)}
                className="text-xs font-semibold text-foreground hover:underline"
              >
                {user.name}
              </Link>
              <Button variant="ghost" size="xs" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Global Dialog Modals */}
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <LogActivityModal open={logModalOpen} onOpenChange={setLogModalOpen} />
      <CreateOrganisationModal
        open={createOrgOpen}
        onOpenChange={setCreateOrgOpen}
        onOpenAddContact={(orgId, orgName) => {
          setCreateOrgOpen(false)
          setPreselectedOrg({ id: orgId, name: orgName })
          setCreateContactOpen(true)
        }}
      />
      <KeyboardShortcutsModal
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
      <CreateContactModal
        open={createContactOpen}
        onOpenChange={(open) => {
          setCreateContactOpen(open)
          if (!open) setPreselectedOrg(null)
        }}
        organisationId={preselectedOrg?.id}
        organisationName={preselectedOrg?.name}
      />
    </div>
  )
}
