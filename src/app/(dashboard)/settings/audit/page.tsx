'use client'

import * as React from 'react'
import Link from 'next/link'
import { Shield, ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { formatDateTime } from '@/lib/dates'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function AuditLogPage() {
  const [loading, setLoading] = React.useState(true)
  const [logs, setLogs] = React.useState<any[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [pageCount, setPageCount] = React.useState(1)

  const fetchLogs = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/audit?page=${page}`)
      if (res.ok) {
        const d = await res.json()
        setLogs(d.items ?? [])
        setTotal(d.total ?? 0)
        setPageCount(d.pageCount ?? 1)
      }
    } catch {
      toast.error('Failed to load audit logs.')
    } finally {
      setLoading(false)
    }
  }, [page])

  React.useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Back and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="size-3.5" /> Back to Settings
          </Link>
          <div className="flex items-center gap-2.5">
            <Shield className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Security & Audit Trail
            </h1>
            <Badge tone="slate" size="sm">
              {total} Events
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable log of all user activities, status changes, assignments, and data imports.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          icon={<RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />}
        >
          Refresh
        </Button>
      </div>

      {/* Table */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-surface-muted/40">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Performer</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-4 text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      {log.user ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={log.user.name} color={log.user.avatarColor} size="xs" />
                          <span className="text-xs font-medium text-foreground">{log.user.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">System</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge tone="slate" size="sm">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-foreground">
                      {log.entityLabel || log.entityType}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs truncate">
                      {log.summary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <div>
                Page {page} of {pageCount}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="xs"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
