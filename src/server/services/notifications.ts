import { prisma } from '@/lib/db'
import type { Notification, NotificationPriority, NotificationType } from '@prisma/client'
import { NOTIFICATION_TYPE_META } from '@/lib/constants'
import { endOfDayUtc, startOfDayUtc, todayKey } from '@/lib/dates'

export interface CreateNotificationParams {
  userId: string
  type: NotificationType
  priority?: NotificationPriority
  title: string
  message: string
  linkUrl?: string | null
  entityType?: string | null
  entityId?: string | null
}

/**
 * Creates a single notification for a user.
 */
export async function createNotification(params: CreateNotificationParams): Promise<Notification> {
  const priority =
    params.priority ?? NOTIFICATION_TYPE_META[params.type]?.defaultPriority ?? 'INFO'

  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      priority,
      title: params.title,
      message: params.message,
      linkUrl: params.linkUrl,
      entityType: params.entityType,
      entityId: params.entityId,
    },
  })
}

/**
 * Sends a notification to all active Owners and Team Leads (e.g., backup alerts, system issues).
 */
export async function notifyOwnersAndTLs(
  params: Omit<CreateNotificationParams, 'userId'>,
): Promise<number> {
  const leaders = await prisma.user.findMany({
    where: {
      role: { in: ['OWNER', 'TL'] },
      isActive: true,
      deletedAt: null,
    },
    select: { id: true, notificationPreference: true },
  })

  let count = 0
  for (const leader of leaders) {
    if (params.type === 'BACKUP_COMPLETED' || params.type === 'BACKUP_FAILED') {
      if (leader.notificationPreference && !leader.notificationPreference.backupAlerts) {
        continue
      }
    }

    await createNotification({
      ...params,
      userId: leader.id,
    })
    count++
  }

  return count
}

/**
 * Retrieves the notification feed for a user.
 */
export async function getUserNotifications(
  userId: string,
  options?: { limit?: number; onlyUnread?: boolean },
) {
  const limit = options?.limit ?? 30
  const where: { userId: string; isRead?: boolean } = { userId }
  if (options?.onlyUnread) {
    where.isRead = false
  }

  return prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/**
 * Counts total unread notifications for the badge counter.
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  })
}

/**
 * Marks a notification as read.
 */
export async function markNotificationAsRead(userId: string, notificationId: string) {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })
}

/**
 * Marks all notifications for a user as read.
 */
export async function markAllNotificationsAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })
}

export async function deleteNotification(userId: string, notificationId: string) {
  return prisma.notification.deleteMany({
    where: {
      id: notificationId,
      userId,
    },
  })
}

export async function clearAllNotifications(userId: string) {
  return prisma.notification.deleteMany({
    where: { userId },
  })
}

/**
 * Gets or creates notification preferences for a user.
 */
export async function getNotificationPreferences(userId: string) {
  let pref = await prisma.notificationPreference.findUnique({
    where: { userId },
  })

  if (!pref) {
    pref = await prisma.notificationPreference.create({
      data: {
        userId,
        followUpReminders: true,
        followUpReminderTiming: 'SAME_DAY',
        overdueReminders: true,
        meetingReminders: true,
        assignmentNotifications: true,
        backupAlerts: true,
      },
    })
  }

  return pref
}

/**
 * Updates notification preferences.
 */
export async function updateNotificationPreferences(
  userId: string,
  data: {
    followUpReminders?: boolean
    followUpReminderTiming?: string
    overdueReminders?: boolean
    meetingReminders?: boolean
    assignmentNotifications?: boolean
    backupAlerts?: boolean
  },
) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    create: {
      userId,
      ...data,
    },
    update: data,
  })
}

/**
 * Scans the database for due and overdue follow-ups, upcoming meetings, and dispatches reminders.
 * Avoids spamming duplicate reminders on the same day.
 */
export async function scanAndGenerateReminders(): Promise<{
  scanned: number
  created: number
}> {
  const now = new Date()
  const todayKeyStr = todayKey()
  const todayStart = startOfDayUtc(todayKeyStr)
  const todayEnd = endOfDayUtc(todayKeyStr)

  // 1. Find all active users with their preferences
  const users = await prisma.user.findMany({
    where: { isActive: true, deletedAt: null },
    include: { notificationPreference: true },
  })

  const userPrefMap = new Map(
    users.map((u) => [
      u.id,
      u.notificationPreference ?? {
        followUpReminders: true,
        followUpReminderTiming: 'SAME_DAY',
        overdueReminders: true,
        meetingReminders: true,
        assignmentNotifications: true,
        backupAlerts: true,
      },
    ]),
  )

  let createdCount = 0

  // 2. Fetch all pending follow-ups with related org & contact details
  const pendingFollowUps = await prisma.followUp.findMany({
    where: {
      status: 'PENDING',
      reminderEnabled: true,
      deletedAt: null,
      organisation: { deletedAt: null },
    },
    include: {
      organisation: { select: { id: true, name: true } },
      contact: { select: { id: true, name: true, designation: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  })

  for (const item of pendingFollowUps) {
    const pref = userPrefMap.get(item.assignedToId)
    if (!pref) continue

    const dueDate = new Date(item.dueDate)
    const isOverdue = dueDate < todayStart
    const isDueToday = dueDate >= todayStart && dueDate <= todayEnd

    // Check if a reminder was already sent today (within last 18 hours)
    const recentlySent =
      item.lastReminderSentAt &&
      now.getTime() - new Date(item.lastReminderSentAt).getTime() < 18 * 60 * 60 * 1000

    if (recentlySent) continue

    const contactStr = item.contact
      ? `${item.contact.name}${item.contact.designation ? ` (${item.contact.designation})` : ''}`
      : 'Contact'

    if (isOverdue && pref.overdueReminders) {
      const daysOverdue = Math.max(
        1,
        Math.floor((todayStart.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000)),
      )

      await createNotification({
        userId: item.assignedToId,
        type: 'FOLLOW_UP_OVERDUE',
        priority: 'URGENT',
        title: `⚠️ Follow-up overdue by ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}`,
        message: `${item.organisation.name} • ${contactStr}: ${item.note || 'Action required'}`,
        linkUrl: `/organisations/${item.organisationId}`,
        entityType: 'followup',
        entityId: item.id,
      })

      await prisma.followUp.update({
        where: { id: item.id },
        data: { lastReminderSentAt: now },
      })
      createdCount++
    } else if (isDueToday && pref.followUpReminders) {
      await createNotification({
        userId: item.assignedToId,
        type: 'FOLLOW_UP_DUE',
        priority: 'WARNING',
        title: `🔔 Follow-up due today`,
        message: `${item.organisation.name} • ${contactStr}: ${item.note || 'Follow-up scheduled for today'}`,
        linkUrl: `/organisations/${item.organisationId}`,
        entityType: 'followup',
        entityId: item.id,
      })

      await prisma.followUp.update({
        where: { id: item.id },
        data: { lastReminderSentAt: now },
      })
      createdCount++
    }
  }

  // 3. Scan upcoming meetings for tomorrow
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
  const tomorrowEnd = new Date(todayEnd.getTime() + 24 * 60 * 60 * 1000)

  const upcomingMeetings = await prisma.activity.findMany({
    where: {
      type: 'MEETING',
      meetingDate: { gte: tomorrowStart, lte: tomorrowEnd },
      deletedAt: null,
    },
    include: {
      organisation: { select: { id: true, name: true } },
      contact: { select: { id: true, name: true } },
      performedBy: { select: { id: true } },
    },
  })

  for (const meeting of upcomingMeetings) {
    const pref = userPrefMap.get(meeting.performedById)
    if (pref && pref.meetingReminders) {
      // Check if not already alerted
      const existing = await prisma.notification.findFirst({
        where: {
          userId: meeting.performedById,
          type: 'MEETING_REMINDER',
          entityId: meeting.id,
          createdAt: { gte: todayStart },
        },
      })

      if (!existing) {
        await createNotification({
          userId: meeting.performedById,
          type: 'MEETING_REMINDER',
          priority: 'INFO',
          title: `📅 Meeting tomorrow with ${meeting.organisation.name}`,
          message: `${meeting.contact?.name ? `With ${meeting.contact.name}. ` : ''}Location: ${
            meeting.meetingLocation || 'Online / Specified in calendar'
          }`,
          linkUrl: `/organisations/${meeting.organisationId}`,
          entityType: 'activity',
          entityId: meeting.id,
        })
        createdCount++
      }
    }
  }

  return {
    scanned: pendingFollowUps.length + upcomingMeetings.length,
    created: createdCount,
  }
}
