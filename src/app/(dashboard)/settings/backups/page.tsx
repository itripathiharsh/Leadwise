'use client'

import * as React from 'react'
import {
  Database,
  ExternalLink,
  Download,
  FolderSync,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  RefreshCw,
  Save,
  ShieldCheck,
  Link2,
  Unlink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/field'
import { ManualBackupModal } from '@/components/domain/manual-backup-modal'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface BackupHistoryRecord {
  id: string
  fileName: string
  fileSizeBytes: number
  sizeFormatted: string
  status: 'IN_PROGRESS' | 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED'
  trigger: 'SCHEDULED' | 'MANUAL'
  organisationsCount: number
  contactsCount: number
  activitiesCount: number
  followUpsCount: number
  driveViewUrl?: string | null
  createdAt: string
  errorMessage?: string | null
  createdBy?: { id: string; name: string } | null
}

interface BackupHealth {
  latest: BackupHistoryRecord | null
  scheduleDay: string
  scheduleTime: string
}

export default function BackupsSettingsPage() {
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [testingDrive, setTestingDrive] = React.useState(false)
  const [connectingDrive, setConnectingDrive] = React.useState(false)
  const [disconnectingDrive, setDisconnectingDrive] = React.useState(false)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [showAdvancedCredentials, setShowAdvancedCredentials] = React.useState(false)

  const [history, setHistory] = React.useState<BackupHistoryRecord[]>([])
  const [health, setHealth] = React.useState<BackupHealth | null>(null)

  // Settings form state
  const [scheduleDay, setScheduleDay] = React.useState('Saturday')
  const [scheduleTime, setScheduleTime] = React.useState('19:00')
  const [retentionCount, setRetentionCount] = React.useState('8')
  const [driveFolderId, setDriveFolderId] = React.useState('1Rg8Gr68cwglbsq_HYZphghMADlafrGCg')
  const [oauthClientId, setOauthClientId] = React.useState('')
  const [oauthClientSecret, setOauthClientSecret] = React.useState('')
  const [oauthHasSecret, setOauthHasSecret] = React.useState(false)
  const [oauthConnected, setOauthConnected] = React.useState(false)
  const [oauthUserEmail, setOauthUserEmail] = React.useState('')
  const [driveStatus, setDriveStatus] = React.useState<{
    connected: boolean
    message: string
    folderName?: string
    userEmail?: string
  } | null>(null)

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [backupsRes, settingsRes] = await Promise.all([
        fetch('/api/backups'),
        fetch('/api/settings/backups'),
      ])

      if (backupsRes.status === 403 || settingsRes.status === 403) {
        toast.error('Access Denied: Backup management is reserved for leadership.')
        window.location.href = '/settings'
        return
      }

      if (backupsRes.ok) {
        const bData = await backupsRes.json()
        setHistory(bData.history ?? [])
        setHealth(bData.health ?? null)
      }

      if (settingsRes.ok) {
        const sData = await settingsRes.json()
        setScheduleDay(sData.scheduleDay ?? 'Saturday')
        setScheduleTime(sData.scheduleTime ?? '19:00')
        setRetentionCount(String(sData.retentionCount ?? 8))
        setDriveFolderId(sData.googleDriveFolderId ?? '1Rg8Gr68cwglbsq_HYZphghMADlafrGCg')
        setOauthClientId(sData.googleDriveOAuthClientId ?? '')
        setOauthHasSecret(Boolean(sData.googleDriveOAuthHasSecret))
        setOauthConnected(Boolean(sData.googleDriveOAuthConnected))
        setOauthUserEmail(sData.googleDriveOAuthUserEmail ?? '')
        setDriveStatus(sData.driveStatus ?? null)
      }
    } catch {
      toast.error('Failed to load backup details.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d?.user && d.user.role !== 'OWNER' && d.user.role !== 'TL') {
          toast.error('Access Denied: Backup management is reserved for leadership.')
          window.location.href = '/settings'
        }
      })
      .catch(() => {})

    loadData()

    // Handle OAuth callback parameters in URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('drive_connected') === 'true') {
        toast.success('Google Drive connected! Backups will now be uploaded to your 5 TB My Drive.')
        window.history.replaceState({}, document.title, window.location.pathname)
      } else if (params.get('drive_error')) {
        toast.error(`Google Drive Connection Failed: ${decodeURIComponent(params.get('drive_error')!)}`)
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }
  }, [loadData])

  const handleConnectGoogle = async () => {
    setConnectingDrive(true)
    try {
      const res = await fetch('/api/auth/google/authorize')
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
      } else {
        toast.error(
          data.error ||
            'Failed to initiate Google OAuth. Please ensure your OAuth Client ID & Secret are set.',
        )
      }
    } catch {
      toast.error('Network error connecting to Google.')
    } finally {
      setConnectingDrive(false)
    }
  }

  const handleDisconnectGoogle = async () => {
    if (!confirm('Are you sure you want to disconnect Google Drive? Automated uploads will pause until reconnected.')) {
      return
    }
    setDisconnectingDrive(true)
    try {
      const res = await fetch('/api/auth/google/disconnect', { method: 'POST' })
      if (res.ok) {
        toast.success('Google Drive disconnected.')
        setOauthConnected(false)
        setOauthUserEmail('')
        loadData()
      } else {
        toast.error('Failed to disconnect Google Drive.')
      }
    } catch {
      toast.error('Error disconnecting Google Drive.')
    } finally {
      setDisconnectingDrive(false)
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/settings/backups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleDay,
          scheduleTime,
          retentionCount: parseInt(retentionCount, 10) || 8,
          googleDriveFolderId: driveFolderId,
          googleDriveOAuthClientId: oauthClientId || undefined,
          googleDriveOAuthClientSecret: oauthClientSecret || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Backup settings saved successfully.')
        if (data.driveStatus) setDriveStatus(data.driveStatus)
        setOauthClientSecret('')
        loadData()
      } else {
        toast.error(data.error || 'Failed to save settings.')
      }
    } catch {
      toast.error('Network error saving settings.')
    } finally {
      setSaving(false)
    }
  }

  const handleTestDrive = async () => {
    setTestingDrive(true)
    try {
      const res = await fetch('/api/settings/backups')
      if (res.ok) {
        const data = await res.json()
        setDriveStatus(data.driveStatus)
        if (data.driveStatus?.connected) {
          toast.success('Google Drive connection verified!')
        } else {
          toast.error(data.driveStatus?.message || 'Google Drive connection failed.')
        }
      }
    } catch {
      toast.error('Could not test Google Drive connection.')
    } finally {
      setTestingDrive(false)
    }
  }

  const latest = health?.latest

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Database className="size-5" />
            </div>
            <div>
              <h1 className="font-bold text-2xl tracking-tight">CRM Backups & Protection</h1>
              <p className="text-sm text-muted-foreground">
                Automated multi-sheet Excel backups stored directly in your personal 5 TB Google Drive.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            icon={<RefreshCw className={cn('size-4', loading && 'animate-spin')} />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalOpen(true)}
            icon={<FolderSync className="size-4" />}
          >
            Create Backup Now
          </Button>
        </div>
      </div>

      {/* Hero Health Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" />
                <CardTitle className="text-base">Latest Backup Health</CardTitle>
              </div>
              {latest ? (
                latest.status === 'SUCCESS' ? (
                  <Badge tone="emerald" size="sm">
                    <CheckCircle2 className="size-3.5 mr-1" /> Successful &amp; Stored in Drive
                  </Badge>
                ) : latest.status === 'PARTIAL_SUCCESS' ? (
                  <Badge tone="amber" size="sm">
                    <AlertTriangle className="size-3.5 mr-1" /> Local Backup Ready (Drive Pending)
                  </Badge>
                ) : (
                  <Badge tone="rose" size="sm">
                    <AlertTriangle className="size-3.5 mr-1" /> Attention Required
                  </Badge>
                )
              ) : (
                <Badge tone="slate" size="sm">
                  No Backups Recorded
                </Badge>
              )}
            </div>
            <CardDescription>
              {latest
                ? `Generated on ${new Date(latest.createdAt).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })} at ${new Date(latest.createdAt).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : 'No automated or manual backups have been performed yet.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {latest ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-border/80 bg-muted/40 p-3.5 text-center">
                  <div>
                    <div className="text-xs text-muted-foreground font-medium">Organisations</div>
                    <div className="text-lg font-bold text-foreground mt-0.5">
                      {latest.organisationsCount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-medium">Contacts</div>
                    <div className="text-lg font-bold text-foreground mt-0.5">
                      {latest.contactsCount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-medium">Activities</div>
                    <div className="text-lg font-bold text-foreground mt-0.5">
                      {latest.activitiesCount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-medium">File Size</div>
                    <div className="text-lg font-bold text-foreground mt-0.5">
                      {latest.sizeFormatted}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <HardDrive className="size-4 text-muted-foreground" />
                    <span>File: <span className="font-mono text-foreground font-medium">{latest.fileName}</span></span>
                  </div>

                  <div className="flex items-center gap-2">
                    {latest.driveViewUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(latest.driveViewUrl!, '_blank')}
                        icon={<ExternalLink className="size-3.5" />}
                      >
                        Open in Google Drive
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => window.open(`/api/backups/${latest.id}/download`, '_blank')}
                      icon={<Download className="size-3.5" />}
                    >
                      Download Copy
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Click &quot;Create Backup Now&quot; to execute your first verified database snapshot.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule & Retention Summary */}
        <Card className="border-border shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Automatic Cadence</CardTitle>
            <CardDescription>Scheduled serverless cron execution.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3.5 text-sm">
            <div className="flex justify-between items-center py-1.5 border-b border-border/60">
              <span className="text-muted-foreground text-xs font-medium">Weekly Cadence</span>
              <span className="font-semibold text-foreground text-xs">Every {scheduleDay} at {scheduleTime}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-border/60">
              <span className="text-muted-foreground text-xs font-medium">Monthly Archive</span>
              <span className="font-semibold text-foreground text-xs">1st of every month at 00:00 UTC</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-border/60">
              <span className="text-muted-foreground text-xs font-medium">Retention Policy</span>
              <span className="font-semibold text-foreground text-xs">{retentionCount} weekly archives retained</span>
            </div>

            <div className="flex justify-between items-center py-1.5">
              <span className="text-muted-foreground text-xs font-medium">Drive Destination</span>
              {oauthConnected ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium text-xs">
                  <CheckCircle2 className="size-3.5" /> 5 TB My Drive Active
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium text-xs">
                  <AlertTriangle className="size-3.5" /> Google OAuth Pending
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Google OAuth 2.0 Connection Banner (5 TB My Drive) */}
      <Card className={cn(
        'border transition-all shadow-sm',
        oauthConnected ? 'border-emerald-500/30 bg-emerald-500/[0.02]' : 'border-amber-500/30 bg-amber-500/[0.02]'
      )}>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Google Drive OAuth 2.0 (5 TB Storage)</CardTitle>
                {oauthConnected ? (
                  <Badge tone="emerald" size="sm">
                    <CheckCircle2 className="size-3 mr-1" /> Connected
                  </Badge>
                ) : (
                  <Badge tone="amber" size="sm">
                    <AlertTriangle className="size-3 mr-1" /> Not Connected
                  </Badge>
                )}
              </div>
              <CardDescription>
                Backups are uploaded using your Google account so they are stored directly in your My Drive and consume your 5 TB storage quota.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              {oauthConnected ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestDrive}
                    loading={testingDrive}
                    icon={<RefreshCw className="size-3.5" />}
                  >
                    Test Drive Access
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDisconnectGoogle}
                    loading={disconnectingDrive}
                    icon={<Unlink className="size-3.5" />}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConnectGoogle}
                  loading={connectingDrive}
                  icon={<Link2 className="size-4" />}
                >
                  Connect with Google
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          {oauthConnected ? (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="font-semibold text-emerald-950 dark:text-emerald-200">
                  Google Account: {oauthUserEmail || 'Authenticated User'}
                </div>
                <div className="text-muted-foreground">
                  Target Folder ID: <span className="font-mono text-foreground">{driveFolderId}</span>
                </div>
              </div>
              {driveStatus?.folderName && (
                <Badge tone="slate" size="sm">
                  Folder Name: {driveStatus.folderName}
                </Badge>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-2 text-xs text-muted-foreground">
              <p className="font-medium text-amber-950 dark:text-amber-200">
                To start automated uploads to your My Drive:
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Ensure your Google OAuth 2.0 Web Client ID is configured below (or in Vercel environment variables).</li>
                <li>Click <strong>&quot;Connect with Google&quot;</strong> and authorize Leadwise with the Google account that has the 5 TB quota.</li>
                <li>All automated weekly and monthly backups will immediately sync into your My Drive folder.</li>
              </ol>
            </div>
          )}

          {driveStatus && (
            <div
              className={cn(
                'rounded-lg p-3 text-xs font-medium border',
                driveStatus.connected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300',
              )}
            >
              {driveStatus.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup History Table */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Backup History</CardTitle>
              <CardDescription>All historical full backups, validation statuses, and Google Drive links.</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {history.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No backups recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground font-medium">
                    <th className="py-2.5 px-3">Backup Date</th>
                    <th className="py-2.5 px-3">File Name</th>
                    <th className="py-2.5 px-3">Size</th>
                    <th className="py-2.5 px-3">Records (Org / Contact / Act)</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Google Drive</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-xs">
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        <span className="text-muted-foreground">
                          {new Date(item.createdAt).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-xs text-foreground/90">
                        {item.fileName}
                      </td>

                      <td className="py-3 px-3 text-xs text-muted-foreground">
                        {item.sizeFormatted}
                      </td>

                      <td className="py-3 px-3 text-xs text-foreground/80">
                        {item.organisationsCount.toLocaleString()} / {item.contactsCount.toLocaleString()} / {item.activitiesCount.toLocaleString()}
                      </td>

                      <td className="py-3 px-3">
                        {item.status === 'SUCCESS' ? (
                          <Badge tone="emerald" size="sm">Success</Badge>
                        ) : item.status === 'PARTIAL_SUCCESS' ? (
                          <Badge tone="amber" size="sm">Local Only</Badge>
                        ) : item.status === 'IN_PROGRESS' ? (
                          <Badge tone="blue" size="sm">Processing</Badge>
                        ) : (
                          <Badge tone="rose" size="sm">Failed</Badge>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {item.driveViewUrl ? (
                          <a
                            href={item.driveViewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-xs text-primary hover:underline"
                          >
                            Open <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/api/backups/${item.id}/download`, '_blank')}
                          icon={<Download className="size-3.5" />}
                          title="Download Excel File"
                        >
                          Download
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup Schedule & Advanced Settings Form */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Backup Schedule &amp; Target Folder</CardTitle>
              <CardDescription>
                Configure the weekly automatic backup schedule, retention count, and target folder ID.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Backup Day">
                <select
                  value={scheduleDay}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setScheduleDay(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Saturday">Saturday (Recommended)</option>
                  <option value="Sunday">Sunday</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                </select>
              </Field>

              <Field label="Backup Time (IST)">
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScheduleTime(e.target.value)}
                />
              </Field>

              <Field label="Retention (Weekly Backups)">
                <Input
                  type="number"
                  min="4"
                  max="52"
                  value={retentionCount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRetentionCount(e.target.value)}
                />
              </Field>
            </div>

            <div className="border-t border-border pt-4 space-y-4">
              <Field
                label="Google Drive Target Folder ID"
                hint="ID of the folder in your 5 TB My Drive (default: 1Rg8Gr68cwglbsq_HYZphghMADlafrGCg)"
              >
                <Input
                  placeholder="1Rg8Gr68cwglbsq_HYZphghMADlafrGCg"
                  value={driveFolderId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDriveFolderId(e.target.value)}
                />
              </Field>

              {/* Collapsible Advanced OAuth Credentials */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedCredentials((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  {showAdvancedCredentials ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                  <span>{showAdvancedCredentials ? 'Hide' : 'Show'} Google Cloud OAuth 2.0 Credentials (Optional overrides)</span>
                </button>

                {showAdvancedCredentials && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 p-4 rounded-lg border border-border/70 bg-muted/20">
                    <Field
                      label="OAuth Client ID"
                      hint="From Google Cloud Console (Web Application)"
                    >
                      <Input
                        placeholder="e.g. 123456789-xyz.apps.googleusercontent.com"
                        value={oauthClientId}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOauthClientId(e.target.value)}
                      />
                    </Field>

                    <Field
                      label="OAuth Client Secret"
                      hint={oauthHasSecret ? 'Secret is securely configured. Leave blank to keep.' : 'From Google Cloud Console'}
                    >
                      <Input
                        type="password"
                        placeholder={oauthHasSecret ? '••••••••••••••••••••••••••••' : 'Enter client secret'}
                        value={oauthClientSecret}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOauthClientSecret(e.target.value)}
                      />
                    </Field>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                loading={saving}
                icon={<Save className="size-4" />}
              >
                Save Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Manual Backup Stepper Modal */}
      <ManualBackupModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={loadData}
      />
    </div>
  )
}
