import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { isEmojiOnly, QUICK_REACTIONS, EMOJI_LIST } from '../../src/components/chat/emoji-data'
import { formatReactions, toggleMessageReaction, getMessageReactions } from '../../src/server/services/chat'
import { prisma } from '../../src/lib/db'
import { ValidationError, NotFoundError } from '../../src/server/errors'

describe('Chat Emoji & Reactions Unit & Integration Tests', () => {
  describe('isEmojiOnly helper', () => {
    it('identifies single emoji message as emoji-only', () => {
      const result = isEmojiOnly('👍')
      expect(result.isOnly).toBe(true)
      expect(result.count).toBe(1)
    })

    it('identifies multiple emojis with whitespace as emoji-only', () => {
      const result = isEmojiOnly('🔥  🚀   🎉  ❤️')
      expect(result.isOnly).toBe(true)
      expect(result.count).toBe(4)
    })

    it('identifies continuous emojis without spaces as emoji-only', () => {
      const result = isEmojiOnly('😂😂😂')
      expect(result.isOnly).toBe(true)
      expect(result.count).toBe(3)
    })

    it('identifies text mixed with emojis as NOT emoji-only', () => {
      const result = isEmojiOnly('Awesome job on the release! 🚀')
      expect(result.isOnly).toBe(false)
      expect(result.count).toBe(1)
    })

    it('returns isOnly: false for plain text messages', () => {
      const result = isEmojiOnly('Let us sync on the pipeline at 3pm')
      expect(result.isOnly).toBe(false)
      expect(result.count).toBe(0)
    })

    it('returns isOnly: false for empty strings and whitespace', () => {
      expect(isEmojiOnly('').isOnly).toBe(false)
      expect(isEmojiOnly('   \n  \t ').isOnly).toBe(false)
    })

    it('supports complex compound emojis with ZWJ and skin tones', () => {
      const result = isEmojiOnly('🧑‍💻')
      expect(result.isOnly).toBe(true)
      expect(result.count).toBeGreaterThanOrEqual(1)
    })
  })

  describe('formatReactions helper', () => {
    it('aggregates multiple reactions by emoji and flags hasReacted for current user', () => {
      const reactions = [
        { emoji: '👍', userId: 'user_1', user: { id: 'user_1', name: 'Alice' } },
        { emoji: '👍', userId: 'user_2', user: { id: 'user_2', name: 'Bob' } },
        { emoji: '❤️', userId: 'user_1', user: { id: 'user_1', name: 'Alice' } },
        { emoji: '🎉', userId: 'user_3', user: { id: 'user_3', name: 'Charlie' } },
      ]

      const formattedForAlice = formatReactions(reactions, 'user_1')
      expect(formattedForAlice).toHaveLength(3)

      const thumbsUp = formattedForAlice.find((r) => r.emoji === '👍')
      expect(thumbsUp).toBeDefined()
      expect(thumbsUp?.count).toBe(2)
      expect(thumbsUp?.hasReacted).toBe(true)
      expect(thumbsUp?.users).toEqual([
        { id: 'user_1', name: 'Alice' },
        { id: 'user_2', name: 'Bob' },
      ])

      const heart = formattedForAlice.find((r) => r.emoji === '❤️')
      expect(heart?.count).toBe(1)
      expect(heart?.hasReacted).toBe(true)

      const party = formattedForAlice.find((r) => r.emoji === '🎉')
      expect(party?.count).toBe(1)
      expect(party?.hasReacted).toBe(false)
    })

    it('returns empty array when reactions list is empty', () => {
      const result = formatReactions([], 'user_1')
      expect(result).toEqual([])
    })
  })

  describe('Emoji Datasets & Quick Reactions', () => {
    it('contains all standard Slack/WhatsApp quick reactions', () => {
      expect(QUICK_REACTIONS).toEqual(['👍', '❤️', '😂', '😮', '😢', '🎉'])
    })

    it('contains valid curated emojis with name and category', () => {
      expect(EMOJI_LIST.length).toBeGreaterThan(50)
      for (const item of EMOJI_LIST) {
        expect(item.emoji).toBeTruthy()
        expect(item.name).toBeTruthy()
        expect(item.category).toBeTruthy()
        expect(item.keywords.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Database Reaction Toggle Integration', () => {
    let testUser1: any
    let testUser2: any
    let testConversation: any
    let testMessage: any

    beforeEach(async () => {
      // Create test users
      testUser1 = await prisma.user.create({
        data: {
          name: 'Emoji Tester 1',
          email: `emoji_tester_1_${Date.now()}@test.com`,
          passwordHash: 'dummy',
          role: 'TL',
        },
      })

      testUser2 = await prisma.user.create({
        data: {
          name: 'Emoji Tester 2',
          email: `emoji_tester_2_${Date.now()}@test.com`,
          passwordHash: 'dummy',
          role: 'INTERN',
        },
      })

      // Create conversation and join both users
      testConversation = await prisma.conversation.create({
        data: {
          type: 'CHANNEL',
          name: `test-emoji-${Date.now()}`,
          createdById: testUser1.id,
          members: {
            create: [
              { userId: testUser1.id },
              { userId: testUser2.id },
            ],
          },
        },
      })

      // Create a test message
      testMessage = await prisma.message.create({
        data: {
          conversationId: testConversation.id,
          senderId: testUser1.id,
          content: 'Testing reactions on this message!',
        },
      })
    })

    afterEach(async () => {
      // Clean up test data
      if (testMessage?.id) {
        await prisma.messageReaction.deleteMany({ where: { messageId: testMessage.id } })
        await prisma.message.deleteMany({ where: { id: testMessage.id } })
      }
      if (testConversation?.id) {
        await prisma.conversationMember.deleteMany({ where: { conversationId: testConversation.id } })
        await prisma.conversation.deleteMany({ where: { id: testConversation.id } })
      }
      if (testUser1?.id) await prisma.user.deleteMany({ where: { id: testUser1.id } })
      if (testUser2?.id) await prisma.user.deleteMany({ where: { id: testUser2.id } })
    })

    it('adds reaction when not previously reacted', async () => {
      const result = await toggleMessageReaction(testUser1.id, testMessage.id, '👍')
      expect(result.success).toBe(true)
      expect(result.reactions).toHaveLength(1)
      expect(result.reactions[0].emoji).toBe('👍')
      expect(result.reactions[0].count).toBe(1)
      expect(result.reactions[0].hasReacted).toBe(true)

      const dbReactions = await prisma.messageReaction.findMany({
        where: { messageId: testMessage.id },
      })
      expect(dbReactions).toHaveLength(1)
      expect(dbReactions[0].emoji).toBe('👍')
      expect(dbReactions[0].userId).toBe(testUser1.id)
    })

    it('removes reaction when toggled a second time by same user', async () => {
      // Add reaction
      await toggleMessageReaction(testUser1.id, testMessage.id, '🔥')
      let reactions = await getMessageReactions(testUser1.id, testMessage.id)
      expect(reactions).toHaveLength(1)
      expect(reactions[0].emoji).toBe('🔥')

      // Toggle off (remove)
      const toggleOffResult = await toggleMessageReaction(testUser1.id, testMessage.id, '🔥')
      expect(toggleOffResult.success).toBe(true)
      expect(toggleOffResult.reactions).toHaveLength(0)

      const count = await prisma.messageReaction.count({
        where: { messageId: testMessage.id },
      })
      expect(count).toBe(0)
    })

    it('allows multiple users to react with the same emoji', async () => {
      await toggleMessageReaction(testUser1.id, testMessage.id, '❤️')
      await toggleMessageReaction(testUser2.id, testMessage.id, '❤️')

      const reactions = await getMessageReactions(testUser1.id, testMessage.id)
      expect(reactions).toHaveLength(1)
      expect(reactions[0].emoji).toBe('❤️')
      expect(reactions[0].count).toBe(2)
      expect(reactions[0].hasReacted).toBe(true)
      expect(reactions[0].users).toHaveLength(2)

      // When checked from user 2's perspective
      const reactionsForUser2 = await getMessageReactions(testUser2.id, testMessage.id)
      expect(reactionsForUser2[0].hasReacted).toBe(true)
    })

    it('rejects empty emoji with ValidationError', async () => {
      await expect(toggleMessageReaction(testUser1.id, testMessage.id, '')).rejects.toThrow(ValidationError)
    })

    it('rejects non-existent message with NotFoundError', async () => {
      await expect(toggleMessageReaction(testUser1.id, 'non_existent_msg_id', '👍')).rejects.toThrow(NotFoundError)
    })
  })
})
