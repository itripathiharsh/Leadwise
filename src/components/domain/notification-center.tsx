'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bell,
  CheckCheck,
  Clock,
  AlertCircle,
  Calendar,
  UserCheck,
  Database,
  AlertTriangle,
  Info,
  Settings,
  ExternalLink,
} from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface NotificationItem {
  id: string
  type: string
  priority: 'INFO' | 'WARNING' | 'URGENT'
  title: string
  message: string
  linkUrl?: string | null
  isRead: boolean
  createdAt: string
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'FOLLOW_UP_DUE':
      return <Clock className="size-4 text-amber-500" />
    case 'FOLLOW_UP_OVERDUE':
      return <AlertCircle className="size-4 text-rose-500" />
    case 'MEETING_REMINDER':
      return <Calendar className="size-4 text-blue-500" />
    case 'ASSIGNMENT':
      return <UserCheck className="size-4 text-indigo-500" />
    case 'BACKUP_COMPLETED':
      return <Database className="size-4 text-emerald-500" />
    case 'BACKUP_FAILED':
      return <AlertTriangle className="size-4 text-rose-500" />
    default:
      return <Info className="size-4 text-slate-500" />
  }
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / (60 * 1000))
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function NotificationCenter() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [loading, setLoading] = React.useState(false)

  const fetchUnreadCount = React.useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/unread-count')
      if (res.ok) {
        const data = await res.json()
        setUnreadCount(data.count ?? 0)
      }
    } catch {
      // Gracefully ignore network errors on poll
    }
  }, [])

  const fetchNotifications = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications?limit=25')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.items ?? [])
        const unread = (data.items ?? []).filter((n: NotificationItem) => !n.isRead).length
        setUnreadCount(unread)
      }
    } catch (err) {
      console.error('Failed to load notifications', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial poll + interval
  React.useEffect(() => {
    fetchUnreadCount()
    const timer = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(timer)
  }, [fetchUnreadCount])

  // Fetch full list on popover open
  React.useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open, fetchNotifications])

  const handleMarkAsRead = async (id: string, linkUrl?: string | null) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))

      if (linkUrl) {
        setOpen(false)
        router.push(linkUrl)
      }
    } catch (err) {
      console.error('Failed to mark read', err)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all read', err)
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Open notifications"
          className={cn(
            'relative inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground transition-colors hover:bg-muted hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none',
            open && 'bg-muted border-border-strong',
          )}
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground shadow-xs animate-in zoom-in">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[380px] max-w-[calc(100vw-1.5rem)] rounded-xl border border-border bg-popover text-popover-foreground shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <Badge tone="blue" size="sm">
                  {unreadCount} new
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Mark all as read"
                >
                  <CheckCheck className="size-3.5" />
                  Mark all read
                </button>
              )}
              <Link
                href="/settings/notifications"
                onClick={() => setOpen(false)}
                className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Notification Settings"
              >
                <Settings className="size-3.5" />
              </Link>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/60">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-muted">
                  <Bell className="size-5 text-muted-foreground" />
                </div>
                <p className="font-medium text-sm">All caught up</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  No notifications or reminders right now.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const priorityBadge =
                  item.priority === 'URGENT' ? (
                    <Badge tone="rose" size="sm">
                      Urgent
                    </Badge>
                  ) : item.priority === 'WARNING' ? (
                    <Badge tone="amber" size="sm">
                      Due
                    </Badge>
                  ) : null

                return (
                  <div
                    key={item.id}
                    onClick={() => handleMarkAsRead(item.id, item.linkUrl)}
                    className={cn(
                      'group relative flex cursor-pointer items-start gap-3 p-3.5 text-left transition-colors hover:bg-muted/70',
                      !item.isRead && 'bg-primary-soft/20',
                    )}
                  >
                    <div className="mt-0.5 shrink-0">{getNotificationIcon(item.type)}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={cn('text-xs font-semibold truncate', !item.isRead && 'text-foreground')}>
                          {item.title}
                        </span>
                        {priorityBadge}
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>

                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground/80">
                        <span>{formatRelativeTime(item.createdAt)}</span>
                        {item.linkUrl && (
                          <span className="inline-flex items-center gap-0.5 font-medium text-primary text-[11px] opacity-0 group-hover:opacity-100 transition-opacity">
                            View <ExternalLink className="size-3" />
                          </span>
                        )}
                      </div>
                    </div>

                    {!item.isRead && (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border bg-muted/40 p-2 text-center">
            <Link
              href="/settings/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Configure reminder preferences →
            </Link>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
