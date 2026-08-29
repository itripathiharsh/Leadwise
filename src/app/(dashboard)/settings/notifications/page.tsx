'use client'

import * as React from 'react'
import {
  Bell,
  Clock,
  Calendar,
  Database,
  Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

export default function NotificationSettingsPage() {
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  const [followUpReminders, setFollowUpReminders] = React.useState(true)
  const [followUpReminderTiming, setFollowUpReminderTiming] = React.useState('SAME_DAY')
  const [overdueReminders, setOverdueReminders] = React.useState(true)
  const [meetingReminders, setMeetingReminders] = React.useState(true)
  const [assignmentNotifications, setAssignmentNotifications] = React.useState(true)
  const [backupAlerts, setBackupAlerts] = React.useState(true)

  React.useEffect(() => {
    async function loadPreferences() {
      try {
        const res = await fetch('/api/settings/notifications')
        if (res.ok) {
          const data = await res.json()
          if (data.preferences) {
            setFollowUpReminders(data.preferences.followUpReminders ?? true)
            setFollowUpReminderTiming(data.preferences.followUpReminderTiming ?? 'SAME_DAY')
            setOverdueReminders(data.preferences.overdueReminders ?? true)
            setMeetingReminders(data.preferences.meetingReminders ?? true)
            setAssignmentNotifications(data.preferences.assignmentNotifications ?? true)
            setBackupAlerts(data.preferences.backupAlerts ?? true)
          }
        }
      } catch {
        toast.error('Failed to load notification settings.')
      } finally {
        setLoading(false)
      }
    }

    loadPreferences()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followUpReminders,
          followUpReminderTiming,
          overdueReminders,
          meetingReminders,
          assignmentNotifications,
          backupAlerts,
        }),
      })

      if (res.ok) {
        toast.success('Notification preferences saved successfully.')
      } else {
        toast.error('Failed to save notification preferences.')
      }
    } catch {
      toast.error('Network error saving preferences.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bell className="size-5" />
          </div>
          <div>
            <h1 className="font-bold text-2xl tracking-tight">Notification & Reminder Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure in-app reminders for follow-ups, upcoming meetings, new assignments, and backup alerts.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Outreach & Follow-up Reminders */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-amber-500" />
              <CardTitle className="text-base">Follow-up & Outreach Reminders</CardTitle>
            </div>
            <CardDescription>
              Ensure timely outreach by receiving alerts when follow-ups are due or overdue.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Follow-up Reminders toggle */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <label className="text-sm font-medium text-foreground">Follow-up Reminders</label>
                <p className="text-xs text-muted-foreground">
                  Receive notifications in the CRM when a follow-up is scheduled for action.
                </p>
              </div>
              <input
                type="checkbox"
                checked={followUpReminders}
                onChange={(e) => setFollowUpReminders(e.target.checked)}
                className="size-4 rounded border-border text-primary focus:ring-primary mt-1"
              />
            </div>

            {/* Timing selection */}
            {followUpReminders && (
              <div className="pl-4 border-l-2 border-primary/30 space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Default Reminder Timing</label>
                <select
                  value={followUpReminderTiming}
                  onChange={(e) => setFollowUpReminderTiming(e.target.value)}
                  className="w-full sm:w-64 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground shadow-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="SAME_DAY">On the due date (Morning)</option>
                  <option value="ONE_DAY_BEFORE">1 day before due date</option>
                </select>
              </div>
            )}

            <div className="border-t border-border/60 pt-4 flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <label className="text-sm font-medium text-foreground">Overdue Reminders</label>
                  <span className="text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded">
                    URGENT
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Highlight uncompleted follow-ups that have passed their due date with urgent priority.
                </p>
              </div>
              <input
                type="checkbox"
                checked={overdueReminders}
                onChange={(e) => setOverdueReminders(e.target.checked)}
                className="size-4 rounded border-border text-primary focus:ring-primary mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Meetings & Team Collaboration */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="size-5 text-blue-500" />
              <CardTitle className="text-base">Meetings & Team Assignments</CardTitle>
            </div>
            <CardDescription>
              Alerts for upcoming partner meetings and new organisation assignments.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Meeting reminders */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <label className="text-sm font-medium text-foreground">Meeting Reminders</label>
                <p className="text-xs text-muted-foreground">
                  Receive a notification 1 day in advance for scheduled partnership meetings.
                </p>
              </div>
              <input
                type="checkbox"
                checked={meetingReminders}
                onChange={(e) => setMeetingReminders(e.target.checked)}
                className="size-4 rounded border-border text-primary focus:ring-primary mt-1"
              />
            </div>

            {/* Assignment alerts */}
            <div className="border-t border-border/60 pt-4 flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <label className="text-sm font-medium text-foreground">Assignment Notifications</label>
                <p className="text-xs text-muted-foreground">
                  Get notified whenever an Owner or Team Lead assigns you a new organisation or lead.
                </p>
              </div>
              <input
                type="checkbox"
                checked={assignmentNotifications}
                onChange={(e) => setAssignmentNotifications(e.target.checked)}
                className="size-4 rounded border-border text-primary focus:ring-primary mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* System & Backup Alerts */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="size-5 text-emerald-500" />
              <CardTitle className="text-base">Backup & Data Health Alerts</CardTitle>
            </div>
            <CardDescription>
              Alerts regarding the status and health of the automated weekly CRM backup.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <label className="text-sm font-medium text-foreground">Weekly Backup Status Alerts</label>
                <p className="text-xs text-muted-foreground">
                  Notify Owners and Team Leads upon completion or failure of the weekly database export to Google Drive.
                </p>
              </div>
              <input
                type="checkbox"
                checked={backupAlerts}
                onChange={(e) => setBackupAlerts(e.target.checked)}
                className="size-4 rounded border-border text-primary focus:ring-primary mt-1"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end">
          <Button
            type="submit"
            variant="primary"
            loading={saving}
            icon={<Save className="size-4" />}
          >
            Save Preferences
          </Button>
        </div>
      </form>
    </div>
  )
}
