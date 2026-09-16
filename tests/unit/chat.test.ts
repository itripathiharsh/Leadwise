import { describe, it, expect } from 'vitest'
import { computeDmKey, extractMentions } from '../../src/server/services/chat'
import {
  createDmSchema,
  createChannelSchema,
  createConversationSchema,
  sendMessageSchema,
  chatMessagesQuerySchema,
} from '../../src/lib/validation'
import { can, assertCan, ForbiddenError } from '../../src/lib/rbac'
import type { CurrentUser } from '../../src/lib/auth/current-user'

describe('Chat Unit & Contract Tests', () => {
  describe('computeDmKey deterministic generation', () => {
    it('produces identical keys regardless of user ID order', () => {
      const userA = 'cmu000000000000000000001'
      const userB = 'cmu000000000000000000002'

      const key1 = computeDmKey(userA, userB)
      const key2 = computeDmKey(userB, userA)

      expect(key1).toBe(key2)
      expect(key1).toBe(`${userA}:${userB}`)
    })

    it('rejects self-DM when both user IDs are identical', () => {
      const userA = 'cmu000000000000000000001'
      expect(() => computeDmKey(userA, userA)).toThrow('Cannot compute DM key for identical user IDs')
    })
  })

  describe('Chat Validation Schemas', () => {
    describe('createDmSchema', () => {
      it('accepts valid recipient ID', () => {
        const result = createDmSchema.safeParse({ recipientId: 'user_target_123' })
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.recipientId).toBe('user_target_123')
        }
      })

      it('rejects missing or empty recipient ID', () => {
        expect(createDmSchema.safeParse({}).success).toBe(false)
        expect(createDmSchema.safeParse({ recipientId: '' }).success).toBe(false)
        expect(createDmSchema.safeParse({ recipientId: '   ' }).success).toBe(false)
      })
    })

    describe('createChannelSchema', () => {
      it('accepts valid channel name and trims/normalizes', () => {
        const result = createChannelSchema.safeParse({
          type: 'CHANNEL',
          name: 'outreach-team',
          description: 'Channel for outreach discussion',
          memberIds: ['user_1', 'user_2'],
        })
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.name).toBe('outreach-team')
          expect(result.data.description).toBe('Channel for outreach discussion')
          expect(result.data.memberIds).toEqual(['user_1', 'user_2'])
        }
      })

      it('rejects channel names shorter than 2 characters or longer than 50', () => {
        expect(createChannelSchema.safeParse({ type: 'CHANNEL', name: 'a' }).success).toBe(false)
        expect(createChannelSchema.safeParse({ type: 'CHANNEL', name: 'x'.repeat(51) }).success).toBe(false)
      })

      it('rejects channel descriptions exceeding 250 characters', () => {
        const result = createChannelSchema.safeParse({
          type: 'CHANNEL',
          name: 'general',
          description: 'x'.repeat(251),
        })
        expect(result.success).toBe(false)
      })
    })

    describe('createConversationSchema union', () => {
      it('discriminates DM payload', () => {
        const result = createConversationSchema.safeParse({
          type: 'DM',
          recipientId: 'user_recipient_456',
        })
        expect(result.success).toBe(true)
        if (result.success && result.data.type === 'DM') {
          expect(result.data.recipientId).toBe('user_recipient_456')
        }
      })

      it('discriminates CHANNEL payload', () => {
        const result = createConversationSchema.safeParse({
          type: 'CHANNEL',
          name: 'announcements',
        })
        expect(result.success).toBe(true)
        if (result.success && result.data.type === 'CHANNEL') {
          expect(result.data.name).toBe('announcements')
        }
      })
    })

    describe('sendMessageSchema', () => {
      it('accepts non-empty message content', () => {
        const result = sendMessageSchema.safeParse({ content: 'Hello team!' })
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.content).toBe('Hello team!')
        }
      })

      it('rejects whitespace-only message content', () => {
        expect(sendMessageSchema.safeParse({ content: '' }).success).toBe(false)
        expect(sendMessageSchema.safeParse({ content: '    \n  \t  ' }).success).toBe(false)
      })

      it('rejects messages longer than 4000 characters', () => {
        expect(sendMessageSchema.safeParse({ content: 'a'.repeat(4001) }).success).toBe(false)
      })
    })

    describe('chatMessagesQuerySchema pagination', () => {
      it('defaults limit to 50', () => {
        const result = chatMessagesQuerySchema.safeParse({})
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.limit).toBe(50)
        }
      })

      it('coerces valid limit string to number within bounds', () => {
        const result = chatMessagesQuerySchema.safeParse({ limit: '25', cursor: 'msg_123' })
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.limit).toBe(25)
          expect(result.data.cursor).toBe('msg_123')
        }
      })

      it('caps limit at 100 max and 1 min', () => {
        expect(chatMessagesQuerySchema.safeParse({ limit: '101' }).success).toBe(false)
        expect(chatMessagesQuerySchema.safeParse({ limit: '0' }).success).toBe(false)
      })
    })
  })

  describe('Chat RBAC Permissions', () => {
    const ownerUser: CurrentUser = {
      id: 'owner_1',
      name: 'Admin Owner',
      email: 'owner@leadwise.com',
      phone: null,
      role: 'OWNER',
      status: 'APPROVED',
      avatarColor: 'violet',
      isActive: true,
    }

    const tlUser: CurrentUser = {
      id: 'tl_1',
      name: 'Team Lead',
      email: 'tl@leadwise.com',
      phone: null,
      role: 'TL',
      status: 'APPROVED',
      avatarColor: 'teal',
      isActive: true,
    }

    const internUser: CurrentUser = {
      id: 'intern_1',
      name: 'Intern User',
      email: 'intern@leadwise.com',
      phone: null,
      role: 'INTERN',
      status: 'APPROVED',
      avatarColor: 'blue',
      isActive: true,
    }

    it('grants chat:access to all roles (INTERN, TL, OWNER)', () => {
      expect(can(internUser, 'chat:access')).toBe(true)
      expect(can(tlUser, 'chat:access')).toBe(true)
      expect(can(ownerUser, 'chat:access')).toBe(true)
    })

    it('allows channel:create only for TL and OWNER, not INTERN', () => {
      expect(can(internUser, 'channel:create')).toBe(false)
      expect(can(tlUser, 'channel:create')).toBe(true)
      expect(can(ownerUser, 'channel:create')).toBe(true)
    })

    it('allows channel:manage for TL and OWNER, but rejects INTERN', () => {
      expect(can(internUser, 'channel:manage')).toBe(false)
      expect(can(tlUser, 'channel:manage')).toBe(true)
      expect(can(ownerUser, 'channel:manage')).toBe(true)
    })

    it('assertCan throws ForbiddenError when permission is lacking', () => {
      expect(() => assertCan(internUser, 'channel:create')).toThrow(ForbiddenError)
      expect(() => assertCan(internUser, 'channel:manage')).toThrow(ForbiddenError)
      expect(() => assertCan(tlUser, 'channel:manage')).not.toThrow()
      expect(() => assertCan(ownerUser, 'channel:manage')).not.toThrow()
    })
  })

  describe('extractMentions tagging parser', () => {
    it('extracts unique @person mentions and lowercases them', () => {
      const text = 'Hey @Harsh and @Admin! Please check with @harsh again.'
      const { userMentions, channelMentions } = extractMentions(text)

      expect(userMentions).toEqual(['harsh', 'admin'])
      expect(channelMentions).toEqual([])
    })

    it('extracts unique #channel mentions', () => {
      const text = 'Check #main and also #outreach-team or #MAIN for updates.'
      const { userMentions, channelMentions } = extractMentions(text)

      expect(userMentions).toEqual([])
      expect(channelMentions).toEqual(['main', 'outreach-team'])
    })

    it('extracts combined @person and #channel tags', () => {
      const text = 'Hey @Priya, please post the notes in #announcements and notify @Harsh.'
      const { userMentions, channelMentions } = extractMentions(text)

      expect(userMentions).toEqual(['priya', 'harsh'])
      expect(channelMentions).toEqual(['announcements'])
    })

    it('returns empty arrays when no tags exist', () => {
      const text = 'Regular message without any tags or special syntax.'
      const { userMentions, channelMentions } = extractMentions(text)

      expect(userMentions).toEqual([])
      expect(channelMentions).toEqual([])
    })
  })
})
