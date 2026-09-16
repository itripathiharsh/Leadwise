import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as listConversations, POST as createConversation } from '../../src/app/api/chat/conversations/route'
import { GET as getUnreadCount } from '../../src/app/api/chat/unread-count/route'
import { GET as getMessages, POST as sendMessage } from '../../src/app/api/chat/conversations/[id]/messages/route'
import { POST as markRead } from '../../src/app/api/chat/conversations/[id]/read/route'
import * as currentUserModule from '../../src/lib/auth/current-user'
import * as chatServiceModule from '../../src/server/services/chat'
import { ForbiddenError } from '../../src/lib/rbac'
import { NotFoundError, ValidationError } from '../../src/server/errors'

vi.mock('../../src/lib/auth/current-user')
vi.mock('../../src/server/services/chat')

describe('Chat API Route Contracts & Security', () => {
  const mockUser: currentUserModule.CurrentUser = {
    id: 'user_active_1',
    name: 'Harsh Admin',
    email: 'harsh@leadwise.com',
    phone: null,
    role: 'OWNER',
    status: 'APPROVED',
    avatarColor: 'violet',
    isActive: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication Enforcement (401)', () => {
    it('GET /api/chat/conversations rejects unauthenticated users with 401', async () => {
      vi.spyOn(currentUserModule, 'getCurrentUser').mockResolvedValue(null)
      const res = await listConversations()
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('POST /api/chat/conversations rejects unauthenticated users with 401', async () => {
      vi.spyOn(currentUserModule, 'getCurrentUser').mockResolvedValue(null)
      const req = new Request('http://localhost:3000/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'DM', recipientId: 'user_2' }),
      })
      const res = await createConversation(req)
      expect(res.status).toBe(401)
    })

    it('GET /api/chat/unread-count rejects unauthenticated users with 401', async () => {
      vi.spyOn(currentUserModule, 'getCurrentUser').mockResolvedValue(null)
      const res = await getUnreadCount()
      expect(res.status).toBe(401)
    })
  })

  describe('Unread Count Endpoint', () => {
    it('returns unread count for authenticated user', async () => {
      vi.spyOn(currentUserModule, 'getCurrentUser').mockResolvedValue(mockUser)
      vi.spyOn(chatServiceModule, 'getGlobalUnreadChatCount').mockResolvedValue(5)

      const res = await getUnreadCount()
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.unreadCount).toBe(5)
    })
  })

  describe('Conversation Creation & Duplicate DM Prevention', () => {
    it('creates or retrieves existing DM idempotently', async () => {
      vi.spyOn(currentUserModule, 'getCurrentUser').mockResolvedValue(mockUser)
      vi.spyOn(chatServiceModule, 'createOrGetDm').mockResolvedValue({
        id: 'conv_dm_123',
        type: 'DM',
        name: null,
        description: null,
        createdById: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
        dmKey: `${mockUser.id}:user_target_2`,
      } as any)

      const req = new Request('http://localhost:3000/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'DM', recipientId: 'user_target_2' }),
      })

      const res = await createConversation(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.id).toBe('conv_dm_123')
      expect(chatServiceModule.createOrGetDm).toHaveBeenCalledWith(mockUser.id, 'user_target_2')
    })

    it('rejects self-DM with 400 Bad Request', async () => {
      vi.spyOn(currentUserModule, 'getCurrentUser').mockResolvedValue(mockUser)
      vi.spyOn(chatServiceModule, 'createOrGetDm').mockRejectedValue(
        new ValidationError('Cannot create a direct message with yourself')
      )

      const req = new Request('http://localhost:3000/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'DM', recipientId: mockUser.id }),
      })

      const res = await createConversation(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Cannot create a direct message with yourself')
    })

    it('enforces RBAC on channel creation (rejects unauthorized users with 403)', async () => {
      vi.spyOn(currentUserModule, 'getCurrentUser').mockResolvedValue({
        ...mockUser,
        role: 'INTERN',
      })
      vi.spyOn(chatServiceModule, 'createChannel').mockRejectedValue(
        new ForbiddenError('Missing required permission: channel:create')
      )

      const req = new Request('http://localhost:3000/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'CHANNEL', name: 'leads-vip' }),
      })

      const res = await createConversation(req)
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toContain('channel:create')
    })
  })

  describe('IDOR Prevention on Messages', () => {
    it('returns 403 when user is not a member of the conversation', async () => {
      vi.spyOn(currentUserModule, 'getCurrentUser').mockResolvedValue(mockUser)
      vi.spyOn(chatServiceModule, 'getConversationMessages').mockRejectedValue(
        new ForbiddenError('You are not a member of this conversation')
      )

      const req = new Request('http://localhost:3000/api/chat/conversations/secret_conv/messages')
      const res = await getMessages(req, {
        params: Promise.resolve({ id: 'secret_conv' }),
      })

      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe('You are not a member of this conversation')
    })

    it('returns 404 when conversation does not exist', async () => {
      vi.spyOn(currentUserModule, 'getCurrentUser').mockResolvedValue(mockUser)
      vi.spyOn(chatServiceModule, 'getConversationMessages').mockRejectedValue(
        new NotFoundError('Conversation')
      )

      const req = new Request('http://localhost:3000/api/chat/conversations/nonexistent/messages')
      const res = await getMessages(req, {
        params: Promise.resolve({ id: 'nonexistent' }),
      })

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Conversation not found.')
    })

    it('rejects message sending when user is not a member', async () => {
      vi.spyOn(currentUserModule, 'getCurrentUser').mockResolvedValue(mockUser)
      vi.spyOn(chatServiceModule, 'sendMessage').mockRejectedValue(
        new ForbiddenError('You are not a member of this conversation')
      )

      const req = new Request('http://localhost:3000/api/chat/conversations/secret_conv/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'I should not be able to post here' }),
      })

      const res = await sendMessage(req, {
        params: Promise.resolve({ id: 'secret_conv' }),
      })

      expect(res.status).toBe(403)
    })
  })

  describe('Mark Conversation As Read', () => {
    it('marks conversation as read successfully', async () => {
      vi.spyOn(currentUserModule, 'getCurrentUser').mockResolvedValue(mockUser)
      vi.spyOn(chatServiceModule, 'markConversationAsRead').mockResolvedValue({ success: true })

      const req = new Request('http://localhost:3000/api/chat/conversations/conv_123/read', {
        method: 'POST',
      })

      const res = await markRead(req, {
        params: Promise.resolve({ id: 'conv_123' }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(chatServiceModule.markConversationAsRead).toHaveBeenCalledWith(mockUser.id, 'conv_123')
    })
  })
})
