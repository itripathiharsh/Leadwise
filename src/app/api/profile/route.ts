import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { prisma } from '@/lib/db'
import { profileUpdateSchema } from '@/lib/validation'
import { getPersonMetrics, getTeamMetrics } from '@/server/services/metrics'
import { changeOwnPassword } from '@/server/services/users'
import { addDaysToKey, startOfDayUtc, todayKey } from '@/lib/dates'
import { writeAudit } from '@/server/services/audit'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = todayKey()
  const weekStart = addDaysToKey(today, -6)
  const startOfToday = startOfDayUtc(today)
  const isOwner = user.role === 'OWNER'

  const [dbUser, overdueFollowUps, todayMetrics, weekMetrics, recentActivities, teamCounts] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          avatarColor: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          target: {
            select: {
              dailyOrganisations: true,
              dailyCalls: true,
              dailyEmails: true,
              dailyLinkedin: true,
              dailyMeetings: true,
            },
          },
          _count: {
            select: {
              organisationsAssigned: { where: { deletedAt: null } },
              contactsAssigned: { where: { deletedAt: null } },
              activities: { where: { deletedAt: null } },
              followUpsAssigned: { where: { deletedAt: null, status: 'PENDING' } },
              followUpsCompleted: { where: { deletedAt: null } },
            },
          },
        },
      }),
      prisma.followUp.count({
        where: {
          ...(isOwner ? {} : { assignedToId: user.id }),
          deletedAt: null,
          status: 'PENDING',
          dueDate: { lt: startOfToday },
          organisation: { deletedAt: null },
        },
      }),
      isOwner ? getTeamMetrics(today, today) : getPersonMetrics(user.id, today, today),
      isOwner ? getTeamMetrics(weekStart, today) : getPersonMetrics(user.id, weekStart, today),
      prisma.activity.findMany({
        where: isOwner
          ? { deletedAt: null, organisation: { deletedAt: null } }
          : { performedById: user.id, deletedAt: null, organisation: { deletedAt: null } },
        select: {
          id: true,
          type: true,
          outcome: true,
          emailSubject: true,
          notes: true,
          activityDate: true,
          organisation: { select: { id: true, name: true } },
          contact: { select: { id: true, name: true } },
          performedBy: { select: { id: true, name: true, avatarColor: true } },
        },
        orderBy: { activityDate: 'desc' },
        take: 10,
      }),
      isOwner
        ? Promise.all([
            prisma.organisation.count({ where: { deletedAt: null } }),
            prisma.contact.count({ where: { deletedAt: null } }),
            prisma.activity.count({ where: { deletedAt: null } }),
            prisma.followUp.count({ where: { deletedAt: null, status: 'PENDING' } }),
            prisma.followUp.count({ where: { deletedAt: null, status: 'DONE' } }),
          ])
        : Promise.resolve(null),
    ])

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({
    profile: {
      ...dbUser,
      counts: isOwner && teamCounts
        ? {
            assignedOrganisations: teamCounts[0],
            assignedContacts: teamCounts[1],
            totalActivities: teamCounts[2],
            pendingFollowUps: teamCounts[3],
            completedFollowUps: teamCounts[4],
            overdueFollowUps,
          }
        : {
            assignedOrganisations: dbUser._count.organisationsAssigned,
            assignedContacts: dbUser._count.contactsAssigned,
            totalActivities: dbUser._count.activities,
            pendingFollowUps: dbUser._count.followUpsAssigned,
            completedFollowUps: dbUser._count.followUpsCompleted,
            overdueFollowUps,
          },
      metrics: {
        today: todayMetrics,
        week: weekMetrics,
      },
      recentActivities,
    },
  })
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const raw = await req.json()
    const parsed = profileUpdateSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid profile data', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { name, phone, avatarColor, currentPassword, newPassword } = parsed.data

    // If changing password, verify both fields are present
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to set a new password.' },
          { status: 400 },
        )
      }
      await changeOwnPassword(user, { currentPassword, newPassword })
    }

    // Update profile information
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        phone: phone ?? null,
        ...(avatarColor ? { avatarColor } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarColor: true,
      },
    })

    await writeAudit({
      userId: user.id,
      action: 'user.updated',
      entityType: 'user',
      entityId: user.id,
      entityLabel: user.name,
      summary: `${user.name} updated their profile settings`,
      after: { name: updated.name, phone: updated.phone, avatarColor: updated.avatarColor },
    })

    return NextResponse.json({
      ok: true,
      message: 'Profile updated successfully.',
      user: updated,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
