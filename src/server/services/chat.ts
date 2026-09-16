import type { Role, Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ForbiddenError } from '@/lib/rbac'
import { ConflictError, NotFoundError, ValidationError } from '@/server/errors'
import { createNotification } from '@/server/services/notifications'

export function computeDmKey(userA: string, userB: string): string {
  if (userA === userB) {
    throw new ValidationError('Cannot compute DM key for identical user IDs')
  }
  return [userA, userB].sort().join(':')
}

export function extractMentions(content: string): { userMentions: string[]; channelMentions: string[] } {
  const userMatches = content.match(/@([a-zA-Z0-9_.-]+)/g) || []
  const channelMatches = content.match(/#([a-zA-Z0-9_-]+)/g) || []

  return {
    userMentions: [
      ...new Set(
        userMatches
          .map((m) => m.slice(1).replace(/[.,;:!?]+$/, '').toLowerCase())
          .filter(Boolean)
      ),
    ],
    channelMentions: [
      ...new Set(
        channelMatches
          .map((m) => m.slice(1).replace(/[.,;:!?]+$/, '').toLowerCase())
          .filter(Boolean)
      ),
    ],
  }
}

const userCardSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatarColor: true,
  lastLoginAt: true,
} satisfies Prisma.UserSelect

export type ChatUser = Prisma.UserGetPayload<{ select: typeof userCardSelect }>

/**
 * Ensures the company-wide #main channel exists and joins the current user.
 */
export async function ensureMainChannel(currentUserId: string) {
  let mainChannel = await prisma.conversation.findFirst({
    where: {
      type: 'CHANNEL',
      name: { equals: 'main', mode: 'insensitive' },
    },
    include: {
      members: true,
    },
  })

  if (!mainChannel) {
    // Create the default main channel
    mainChannel = await prisma.conversation.create({
      data: {
        type: 'CHANNEL',
        name: 'main',
        description: 'Company-wide team communication and announcements',
        createdById: currentUserId,
        members: {
          create: {
            userId: currentUserId,
            lastReadAt: new Date(),
          },
        },
      },
      include: {
        members: true,
      },
    })

    // Auto-join all other active team members
    const allUsers = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        deletedAt: null,
        isActive: true,
        status: 'APPROVED',
      },
      select: { id: true },
    })

    if (allUsers.length > 0) {
      await prisma.conversationMember.createMany({
        data: allUsers.map((u) => ({
          conversationId: mainChannel!.id,
          userId: u.id,
        })),
        skipDuplicates: true,
      })
    }
  } else {
    // Ensure current user is a member of #main
    const isMember = mainChannel.members.some((m) => m.userId === currentUserId)
    if (!isMember) {
      await prisma.conversationMember.create({
        data: {
          conversationId: mainChannel.id,
          userId: currentUserId,
        },
      }).catch(() => {})
    }
  }

  return mainChannel
}

/**
 * Returns all conversations (DMs and Channels) accessible to the given user.
 */
export async function listUserConversations(userId: string) {
  // Ensure user is in #main channel
  await ensureMainChannel(userId)

  const conversations = await prisma.conversation.findMany({
    where: {
      isArchived: false,
      members: {
        some: { userId },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: userCardSelect,
          },
        },
      },
      messages: {
        where: { deletedAt: null },
        take: 1,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: { id: true, name: true, avatarColor: true },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  // Calculate unread counts for each conversation
  const enhanced = await Promise.all(
    conversations.map(async (conv) => {
      const myMembership = conv.members.find((m) => m.userId === userId)
      const lastReadAt = myMembership?.lastReadAt ?? new Date(0)

      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conv.id,
          senderId: { not: userId },
          createdAt: { gt: lastReadAt },
          deletedAt: null,
        },
      })

      const lastMessage = conv.messages[0] ?? null
      const otherMember =
        conv.type === 'DM'
          ? conv.members.find((m) => m.userId !== userId)?.user ?? null
          : null

      return {
        id: conv.id,
        type: conv.type,
        name: conv.name,
        description: conv.description,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        unreadCount,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
              senderId: lastMessage.senderId,
              senderName: lastMessage.sender.name,
            }
          : null,
        memberCount: conv.members.length,
        members: conv.members.map((m) => m.user),
        otherMember,
      }
    })
  )

  const dms = enhanced.filter((c) => c.type === 'DM')
  const channels = enhanced.filter((c) => c.type === 'CHANNEL')

  return { dms, channels }
}

/**
 * Creates or retrieves an existing DM conversation between current user and recipient.
 */
export async function createOrGetDm(currentUserId: string, recipientId: string) {
  if (currentUserId === recipientId) {
    throw new ValidationError('You cannot start a direct message conversation with yourself.')
  }

  // Verify recipient exists and is active
  const recipient = await prisma.user.findFirst({
    where: {
      id: recipientId,
      deletedAt: null,
      isActive: true,
      status: 'APPROVED',
    },
    select: userCardSelect,
  })

  if (!recipient) {
    throw new NotFoundError('Recipient user was not found or is currently inactive.')
  }

  const dmKey = computeDmKey(currentUserId, recipientId)

  // Look for existing DM
  let conversation = await prisma.conversation.findUnique({
    where: { dmKey },
    include: {
      members: {
        include: {
          user: { select: userCardSelect },
        },
      },
    },
  })

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        type: 'DM',
        dmKey,
        createdById: currentUserId,
        members: {
          create: [
            { userId: currentUserId, lastReadAt: new Date() },
            { userId: recipientId },
          ],
        },
      },
      include: {
        members: {
          include: {
            user: { select: userCardSelect },
          },
        },
      },
    })
  } else {
    // Ensure both users are members
    const memberIds = conversation.members.map((m) => m.userId)
    if (!memberIds.includes(currentUserId)) {
      await prisma.conversationMember.create({
        data: { conversationId: conversation.id, userId: currentUserId, lastReadAt: new Date() },
      }).catch(() => {})
    }
    if (!memberIds.includes(recipientId)) {
      await prisma.conversationMember.create({
        data: { conversationId: conversation.id, userId: recipientId },
      }).catch(() => {})
    }
  }

  return {
    id: conversation.id,
    type: conversation.type,
    name: conversation.name,
    description: conversation.description,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    dmKey: conversation.dmKey,
    otherMember: recipient,
    members: conversation.members.map((m) => m.user),
  }
}

/**
 * Creates a new team channel. Only TL and OWNER can create channels.
 */
export async function createChannel(
  currentUserId: string,
  userRole: Role,
  input: { name: string; description?: string; memberIds?: string[] }
) {
  if (userRole === 'INTERN') {
    throw new ForbiddenError('Interns do not have permission to create channels.')
  }

  const cleanName = input.name
    .toLowerCase()
    .replace(/^#+/, '')
    .trim()
    .replace(/\s+/g, '-')

  if (cleanName.length < 2) {
    throw new ValidationError('Channel name must be at least 2 characters.')
  }

  // Check unique channel name
  const existing = await prisma.conversation.findFirst({
    where: {
      type: 'CHANNEL',
      name: { equals: cleanName, mode: 'insensitive' },
      isArchived: false,
    },
  })

  if (existing) {
    throw new ConflictError(`Channel #${cleanName} already exists.`)
  }

  const targetMemberIds = Array.from(new Set([currentUserId, ...(input.memberIds || [])]))

  const channel = await prisma.conversation.create({
    data: {
      type: 'CHANNEL',
      name: cleanName,
      description: input.description?.trim() || null,
      createdById: currentUserId,
      members: {
        create: targetMemberIds.map((uId) => ({
          userId: uId,
          lastReadAt: uId === currentUserId ? new Date() : null,
        })),
      },
    },
    include: {
      members: {
        include: {
          user: { select: userCardSelect },
        },
      },
    },
  })

  return {
    id: channel.id,
    type: channel.type,
    name: channel.name,
    description: channel.description,
    createdAt: channel.createdAt,
    updatedAt: channel.updatedAt,
    memberCount: channel.members.length,
    members: channel.members.map((m) => m.user),
  }
}

/**
 * Returns conversation details and verifies membership.
 */
export async function getConversation(userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      members: {
        include: {
          user: { select: userCardSelect },
        },
      },
    },
  })

  if (!conversation || conversation.isArchived) {
    throw new NotFoundError('Conversation not found or has been archived.')
  }

  const isMember = conversation.members.some((m) => m.userId === userId)
  if (!isMember) {
    // If it's the main channel, auto-join
    if (conversation.type === 'CHANNEL' && conversation.name?.toLowerCase() === 'main') {
      await prisma.conversationMember.create({
        data: { conversationId, userId, lastReadAt: new Date() },
      }).catch(() => {})
    } else {
      throw new ForbiddenError('You do not have access to this conversation.')
    }
  }

  const otherMember =
    conversation.type === 'DM'
      ? conversation.members.find((m) => m.userId !== userId)?.user ?? null
      : null

  return {
    id: conversation.id,
    type: conversation.type,
    name: conversation.name,
    description: conversation.description,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    memberCount: conversation.members.length,
    members: conversation.members.map((m) => m.user),
    otherMember,
  }
}

/**
 * Retrieves paginated messages for a conversation.
 */
export async function getConversationMessages(
  userId: string,
  conversationId: string,
  options: { limit?: number; before?: string } = {}
) {
  // Verify access
  await getConversation(userId, conversationId)

  const limit = Math.min(Math.max(options.limit || 50, 1), 100)
  const where: Prisma.MessageWhereInput = {
    conversationId,
    deletedAt: null,
  }

  if (options.before) {
    const beforeDate = new Date(options.before)
    if (!isNaN(beforeDate.getTime())) {
      where.createdAt = { lt: beforeDate }
    }
  }

  const messages = await prisma.message.findMany({
    where,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      sender: {
        select: userCardSelect,
      },
    },
  })

  // Return chronological order
  return messages.reverse().map((msg) => ({
    id: msg.id,
    conversationId: msg.conversationId,
    content: msg.content,
    createdAt: msg.createdAt,
    senderId: msg.senderId,
    sender: msg.sender,
  }))
}

/**
 * Sends a message in a conversation.
 */
export async function sendMessage(userId: string, conversationId: string, content: string) {
  const trimmed = content.trim()
  if (!trimmed) {
    throw new ValidationError('Message content cannot be empty.')
  }
  if (trimmed.length > 4000) {
    throw new ValidationError('Message cannot exceed 4000 characters.')
  }

  // Verify access & not archived
  await getConversation(userId, conversationId)

  const now = new Date()

  // Create message and touch conversation
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: trimmed,
        createdAt: now,
      },
      include: {
        sender: {
          select: userCardSelect,
        },
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: now },
    }),
    prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        lastReadAt: now,
      },
    }),
  ])

  // Fire mention notifications asynchronously in a safe fail-closed block
  try {
    const { userMentions } = extractMentions(trimmed)
    if (userMentions.length > 0) {
      const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: {
          name: true,
          type: true,
          members: {
            where: {
              userId: { not: userId },
              user: { isActive: true },
            },
            select: {
              userId: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      })

      if (conv) {
        const channelLabel = conv.type === 'CHANNEL' ? `#${conv.name || 'channel'}` : 'Direct Message'
        const senderName = message.sender.name || 'A teammate'

        for (const member of conv.members) {
          const namePart = (member.user.name || '').toLowerCase()
          const emailPrefix = member.user.email.split('@')[0].toLowerCase()

          const isMentioned = userMentions.some((mention) => {
            const m = mention.toLowerCase()
            return namePart === m || namePart.includes(m) || emailPrefix === m
          })

          if (isMentioned) {
            await createNotification({
              userId: member.userId,
              type: 'SYSTEM',
              title: `${senderName} mentioned you in ${channelLabel}`,
              message: trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed,
              linkUrl: '/chat',
              entityType: 'Conversation',
              entityId: conversationId,
            }).catch(() => {})
          }
        }
      }
    }
  } catch (mentionErr) {
    console.error('Non-blocking: Failed to dispatch mention notifications:', mentionErr)
  }

  return {
    id: message.id,
    conversationId: message.conversationId,
    content: message.content,
    createdAt: message.createdAt,
    senderId: message.senderId,
    sender: message.sender,
  }
}

/**
 * Marks a conversation as read for the user.
 */
export async function markConversationAsRead(userId: string, conversationId: string) {
  try {
    await prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    })
    return { success: true }
  } catch {
    // If record doesn't exist, ignore safely
    return { success: false }
  }
}

/**
 * Returns total unread message count across all joined conversations.
 */
export async function getGlobalUnreadChatCount(userId: string): Promise<number> {
  const memberships = await prisma.conversationMember.findMany({
    where: {
      userId,
      conversation: { isArchived: false },
    },
    select: {
      conversationId: true,
      lastReadAt: true,
    },
  })

  if (memberships.length === 0) return 0

  let totalUnread = 0

  await Promise.all(
    memberships.map(async (m) => {
      const count = await prisma.message.count({
        where: {
          conversationId: m.conversationId,
          senderId: { not: userId },
          createdAt: { gt: m.lastReadAt ?? new Date(0) },
          deletedAt: null,
        },
      })
      totalUnread += count
    })
  )

  return totalUnread
}

/**
 * Returns team members available for new direct messages.
 */
export async function listEligibleDmUsers(currentUserId: string, search?: string) {
  const where: Prisma.UserWhereInput = {
    id: { not: currentUserId },
    deletedAt: null,
    isActive: true,
    status: 'APPROVED',
  }

  if (search?.trim()) {
    const q = search.trim()
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ]
  }

  return prisma.user.findMany({
    where,
    select: userCardSelect,
    orderBy: { name: 'asc' },
  })
}
