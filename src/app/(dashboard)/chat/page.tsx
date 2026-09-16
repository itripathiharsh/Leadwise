'use client'

import * as React from 'react'
import {
  MessageSquare,
  Hash,
  Search,
  Plus,
  Send,
  ArrowLeft,
  Users,
  Check,
  CheckCheck,
  Clock,
  Sparkles,
  RefreshCw,
  MoreVertical,
  X,
  Shield,
  Circle,
  AtSign,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ChatUser {
  id: string
  name: string
  email: string
  role: string
  avatarColor: string
  lastLoginAt: string | null
}

interface ConversationItem {
  id: string
  type: 'DM' | 'CHANNEL'
  name: string | null
  description: string | null
  createdAt: string
  updatedAt: string
  unreadCount: number
  lastMessage: {
    id: string
    content: string
    createdAt: string
    senderId: string
    senderName: string
  } | null
  memberCount: number
  members: ChatUser[]
  otherMember: ChatUser | null
}

interface MessageItem {
  id: string
  conversationId: string
  content: string
  createdAt: string
  senderId: string
  sender: ChatUser
}

function isOnline(lastLoginAt: string | null): boolean {
  if (!lastLoginAt) return false
  const diff = Date.now() - new Date(lastLoginAt).getTime()
  return diff < 15 * 60 * 1000 // online within 15 minutes
}

function formatChatTime(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatChatDateGroup(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

interface FormattedMessageContentProps {
  content: string
  isOwn: boolean
  currentUserId?: string
  currentUserName?: string
  users: ChatUser[]
  channels: ConversationItem[]
  onSelectUser: (user: ChatUser) => void
  onSelectChannel: (channelId: string) => void
}

function FormattedMessageContent({
  content,
  isOwn,
  currentUserId,
  currentUserName,
  users,
  channels,
  onSelectUser,
  onSelectChannel,
}: FormattedMessageContentProps) {
  const tokens = React.useMemo(() => {
    const parts = content.split(/(@[a-zA-Z0-9_.-]+|#[a-zA-Z0-9_-]+)/g)
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const rawName = part.slice(1)
        const targetUser = users.find(
          (u) =>
            u.name.toLowerCase() === rawName.toLowerCase() ||
            u.name.toLowerCase().replace(/\s+/g, '') === rawName.toLowerCase() ||
            u.email.split('@')[0].toLowerCase() === rawName.toLowerCase()
        )

        const isMe = Boolean(
          (currentUserId && targetUser?.id === currentUserId) ||
          (currentUserName && rawName.toLowerCase() === currentUserName.toLowerCase())
        )

        return {
          id: `tok-${index}`,
          type: 'mention' as const,
          name: rawName,
          targetUser,
          isMe,
        }
      }

      if (part.startsWith('#')) {
        const rawChannel = part.slice(1)
        const targetChannel = channels.find(
          (c) => c.type === 'CHANNEL' && c.name?.toLowerCase() === rawChannel.toLowerCase()
        )

        return {
          id: `tok-${index}`,
          type: 'channel' as const,
          channelName: rawChannel,
          targetChannel,
        }
      }

      return {
        id: `tok-${index}`,
        type: 'text' as const,
        text: part,
      }
    })
  }, [content, users, channels, currentUserId, currentUserName])

  return (
    <span className="break-words">
      {tokens.map((tok) => {
        if (tok.type === 'mention') {
          return (
            <button
              key={tok.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (tok.targetUser) {
                  onSelectUser(tok.targetUser)
                }
              }}
              title={tok.targetUser ? `Message ${tok.targetUser.name}` : `@${tok.name}`}
              className={cn(
                'inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded font-semibold text-[11px] transition-colors cursor-pointer align-baseline select-none mx-0.5',
                isOwn
                  ? 'bg-white/20 text-white hover:bg-white/30 border border-white/30'
                  : tok.isMe
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 font-bold shadow-xs'
                  : 'bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25'
              )}
            >
              <AtSign className="size-2.5 shrink-0 opacity-80" />
              <span>{tok.name}</span>
            </button>
          )
        }

        if (tok.type === 'channel') {
          return (
            <button
              key={tok.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (tok.targetChannel) {
                  onSelectChannel(tok.targetChannel.id)
                }
              }}
              title={tok.targetChannel ? `Switch to #${tok.channelName}` : `#${tok.channelName}`}
              className={cn(
                'inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded font-semibold text-[11px] transition-colors cursor-pointer align-baseline select-none mx-0.5',
                isOwn
                  ? 'bg-white/20 text-white hover:bg-white/30 border border-white/30'
                  : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25'
              )}
            >
              <Hash className="size-2.5 shrink-0 opacity-80" />
              <span>{tok.channelName}</span>
            </button>
          )
        }

        return <React.Fragment key={tok.id}>{tok.text}</React.Fragment>
      })}
    </span>
  )
}

export default function ChatPage() {
  const [currentUser, setCurrentUser] = React.useState<ChatUser | null>(null)
  const [activeTab, setActiveTab] = React.useState<'dm' | 'channel'>('dm')
  const [conversations, setConversations] = React.useState<{ dms: ConversationItem[]; channels: ConversationItem[] }>({
    dms: [],
    channels: [],
  })
  const [loadingConversations, setLoadingConversations] = React.useState(true)
  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<MessageItem[]>([])
  const [loadingMessages, setLoadingMessages] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [messageText, setMessageText] = React.useState('')
  const [sending, setSending] = React.useState(false)

  // Dialog states
  const [newDmOpen, setNewDmOpen] = React.useState(false)
  const [eligibleUsers, setEligibleUsers] = React.useState<ChatUser[]>([])
  const [userSearch, setUserSearch] = React.useState('')
  const [loadingUsers, setLoadingUsers] = React.useState(false)

  const [createChannelOpen, setCreateChannelOpen] = React.useState(false)
  const [newChannelName, setNewChannelName] = React.useState('')
  const [newChannelDesc, setNewChannelDesc] = React.useState('')
  const [creatingChannel, setCreatingChannel] = React.useState(false)

  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Mention autocomplete states
  const [mentionQuery, setMentionQuery] = React.useState<{
    type: 'user' | 'channel'
    query: string
    startPos: number
  } | null>(null)
  const [mentionSelectedIndex, setMentionSelectedIndex] = React.useState(0)

  // Fetch current user & active team users
  React.useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setCurrentUser(d.user)
      })
      .catch(() => {})

    fetch('/api/chat/users')
      .then((r) => r.json())
      .then((d) => {
        if (d.users) setEligibleUsers(d.users)
      })
      .catch(() => {})
  }, [])

  // Fetch conversations
  const fetchConversations = React.useCallback(async (silent = false) => {
    if (!silent) setLoadingConversations(true)
    try {
      const res = await fetch('/api/chat/conversations')
      if (res.ok) {
        const data = await res.json()
        setConversations(data)

        // If no active conversation, select main channel or first conversation
        setActiveConversationId((current) => {
          if (current) return current
          const main = data.channels.find((c: ConversationItem) => c.name?.toLowerCase() === 'main')
          return main?.id || data.dms[0]?.id || data.channels[0]?.id || null
        })
      }
    } catch {
      if (!silent) toast.error('Failed to load conversations.')
    } finally {
      if (!silent) setLoadingConversations(false)
    }
  }, [])

  // Initial load & Polling for conversations
  React.useEffect(() => {
    fetchConversations()

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchConversations(true)
      }
    }, 8000)

    return () => clearInterval(interval)
  }, [fetchConversations])

  // Fetch messages for active conversation
  const fetchMessages = React.useCallback(
    async (convId: string, silent = false) => {
      if (!silent) setLoadingMessages(true)
      try {
        const res = await fetch(`/api/chat/conversations/${convId}/messages`)
        if (res.ok) {
          const data = await res.json()
          setMessages(data.messages || [])

          // Mark conversation as read
          fetch(`/api/chat/conversations/${convId}/read`, { method: 'POST' }).catch(() => {})

          // Update local unread state immediately
          setConversations((prev) => ({
            dms: prev.dms.map((d) => (d.id === convId ? { ...d, unreadCount: 0 } : d)),
            channels: prev.channels.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c)),
          }))
        }
      } catch {
        if (!silent) toast.error('Failed to load messages.')
      } finally {
        if (!silent) setLoadingMessages(false)
      }
    },
    []
  )

  // Trigger message load when active conversation changes
  React.useEffect(() => {
    if (!activeConversationId) return
    fetchMessages(activeConversationId)

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchMessages(activeConversationId, true)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [activeConversationId, fetchMessages])

  // Auto-scroll to bottom on messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Filter mention items for autocomplete
  const filteredMentionItems = React.useMemo(() => {
    if (!mentionQuery) return []
    const q = mentionQuery.query.toLowerCase()
    if (mentionQuery.type === 'user') {
      return eligibleUsers
        .filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
        .slice(0, 6)
        .map((u) => ({
          id: u.id,
          label: u.name,
          sublabel: u.email,
          insertText: `@${u.name} `,
          icon: <Avatar name={u.name} color={u.avatarColor || 'indigo'} size="sm" />,
          badge: u.role,
        }))
    } else {
      return conversations.channels
        .filter((c) => (c.name || '').toLowerCase().includes(q))
        .slice(0, 6)
        .map((c) => ({
          id: c.id,
          label: `#${c.name}`,
          sublabel: c.description || undefined,
          insertText: `#${c.name} `,
          icon: <Hash className="size-3.5 text-cyan-400" />,
          badge: `${c.memberCount || 1} members`,
        }))
    }
  }, [mentionQuery, eligibleUsers, conversations.channels])

  const insertMention = (insertText: string) => {
    if (!mentionQuery || !textareaRef.current) return
    const val = messageText
    const before = val.slice(0, mentionQuery.startPos)
    const after = val.slice(textareaRef.current.selectionStart || val.length)
    const newText = `${before}${insertText}${after}`
    setMessageText(newText)
    setMentionQuery(null)
    setMentionSelectedIndex(0)

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        const newCursor = before.length + insertText.length
        textareaRef.current.setSelectionRange(newCursor, newCursor)
      }
    }, 10)
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setMessageText(val)

    const cursor = e.target.selectionStart || 0
    const beforeCursor = val.slice(0, cursor)
    const match = beforeCursor.match(/(?:^|\s)([@#])([a-zA-Z0-9_-]*)$/)
    if (match) {
      const symbol = match[1]
      const query = match[2]
      const symbolIndex = beforeCursor.lastIndexOf(symbol)
      setMentionQuery({
        type: symbol === '@' ? 'user' : 'channel',
        query,
        startPos: symbolIndex,
      })
      setMentionSelectedIndex(0)
    } else {
      setMentionQuery(null)
    }
  }

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery && filteredMentionItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionSelectedIndex((prev) => (prev + 1) % filteredMentionItems.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionSelectedIndex((prev) => (prev - 1 + filteredMentionItems.length) % filteredMentionItems.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const selectedItem = filteredMentionItems[mentionSelectedIndex]
        if (selectedItem) {
          insertMention(selectedItem.insertText)
        }
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setMentionQuery(null)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Send message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!activeConversationId || !messageText.trim() || sending) return

    const content = messageText.trim()
    setSending(true)

    try {
      const res = await fetch(`/api/chat/conversations/${activeConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (res.ok) {
        const newMsg = await res.json()
        setMessageText('')
        setMessages((prev) => [...prev, newMsg])

        // Update last message preview in list
        setConversations((prev) => {
          const updater = (item: ConversationItem) =>
            item.id === activeConversationId
              ? {
                  ...item,
                  updatedAt: new Date().toISOString(),
                  lastMessage: {
                    id: newMsg.id,
                    content: newMsg.content,
                    createdAt: newMsg.createdAt,
                    senderId: newMsg.senderId,
                    senderName: newMsg.sender.name,
                  },
                }
              : item

          return {
            dms: prev.dms.map(updater),
            channels: prev.channels.map(updater),
          }
        })
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to send message.')
      }
    } catch {
      toast.error('Network error sending message.')
    } finally {
      setSending(false)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }

  // Load eligible users for DM dialog
  const openNewDmModal = async () => {
    setNewDmOpen(true)
    setLoadingUsers(true)
    try {
      const res = await fetch('/api/chat/users')
      if (res.ok) {
        const data = await res.json()
        setEligibleUsers(data.users || [])
      }
    } catch {
      toast.error('Failed to load team members.')
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleStartDm = async (recipientId: string) => {
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'DM', recipientId }),
      })

      if (res.ok) {
        const conv = await res.json()
        setNewDmOpen(false)
        setActiveTab('dm')
        await fetchConversations(true)
        setActiveConversationId(conv.id)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to start direct message.')
      }
    } catch {
      toast.error('Network error starting direct message.')
    }
  }

  // Create Channel handler
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChannelName.trim() || creatingChannel) return

    setCreatingChannel(true)
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'CHANNEL',
          name: newChannelName.trim(),
          description: newChannelDesc.trim() || undefined,
        }),
      })

      if (res.ok) {
        const channel = await res.json()
        toast.success(`Channel #${channel.name} created!`)
        setCreateChannelOpen(false)
        setNewChannelName('')
        setNewChannelDesc('')
        setActiveTab('channel')
        await fetchConversations(true)
        setActiveConversationId(channel.id)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to create channel.')
      }
    } catch {
      toast.error('Network error creating channel.')
    } finally {
      setCreatingChannel(false)
    }
  }

  // Active conversation object
  const activeConversation =
    conversations.dms.find((c) => c.id === activeConversationId) ||
    conversations.channels.find((c) => c.id === activeConversationId)

  // Filtered conversation items
  const filteredDms = conversations.dms.filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      c.otherMember?.name.toLowerCase().includes(q) ||
      c.otherMember?.email.toLowerCase().includes(q) ||
      c.lastMessage?.content.toLowerCase().includes(q)
    )
  })

  const filteredChannels = conversations.channels.filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      c.name?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.lastMessage?.content.toLowerCase().includes(q)
    )
  })

  const totalDmUnread = conversations.dms.reduce((acc, curr) => acc + curr.unreadCount, 0)
  const totalChannelUnread = conversations.channels.reduce((acc, curr) => acc + curr.unreadCount, 0)

  const isLeader = currentUser?.role === 'OWNER' || currentUser?.role === 'TL'

  // Group messages by date
  const groupedMessages: { date: string; items: MessageItem[] }[] = []
  messages.forEach((msg) => {
    const groupKey = formatChatDateGroup(msg.createdAt)
    const existingGroup = groupedMessages.find((g) => g.date === groupKey)
    if (existingGroup) {
      existingGroup.items.push(msg)
    } else {
      groupedMessages.push({ date: groupKey, items: [msg] })
    }
  })

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-background text-foreground">
      {/* ── Left Panel: Conversations List (Responsive) ────────────────────────── */}
      <aside
        className={cn(
          'w-full lg:w-80 xl:w-88 flex flex-col border-r border-border bg-surface shrink-0 z-10 transition-all duration-150',
          activeConversationId ? 'hidden lg:flex' : 'flex'
        )}
      >
        {/* Header Bar */}
        <div className="p-3.5 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-base text-foreground tracking-tight flex items-center gap-2">
                <MessageSquare className="size-4 text-primary" />
                Chat
              </h1>
              <p className="text-[11px] text-muted-foreground">Connect with your team</p>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="xs"
                onClick={() => fetchConversations()}
                icon={<RefreshCw className={cn('size-3', loadingConversations && 'animate-spin')} />}
                title="Refresh conversations"
              />
              <Button
                variant="primary"
                size="xs"
                onClick={activeTab === 'dm' ? openNewDmModal : () => setCreateChannelOpen(true)}
                icon={<Plus className="size-3.5" />}
              >
                {activeTab === 'dm' ? 'New DM' : 'Channel'}
              </Button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-border bg-surface-muted/60 pl-8 pr-7 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-border-strong focus:bg-surface transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* DM / Channels Tabs */}
          <div className="flex rounded-lg bg-surface-muted p-0.5 border border-border/60">
            <button
              type="button"
              onClick={() => setActiveTab('dm')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-semibold rounded-md transition-colors',
                activeTab === 'dm'
                  ? 'bg-surface text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span>Direct Messages</span>
              {totalDmUnread > 0 && (
                <span className="px-1.5 py-0.2 rounded-full font-mono text-[10px] font-bold bg-primary text-primary-foreground">
                  {totalDmUnread}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('channel')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-semibold rounded-md transition-colors',
                activeTab === 'channel'
                  ? 'bg-surface text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span>Channels</span>
              {totalChannelUnread > 0 && (
                <span className="px-1.5 py-0.2 rounded-full font-mono text-[10px] font-bold bg-primary text-primary-foreground">
                  {totalChannelUnread}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Conversations Scroll Area */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-slim">
          {loadingConversations && (
            <div className="space-y-2 p-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-md bg-surface-muted/40 animate-pulse">
                  <div className="size-9 rounded-full bg-border shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-28 bg-border rounded" />
                    <div className="h-2.5 w-40 bg-border/60 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loadingConversations && activeTab === 'dm' && (
            <>
              {filteredDms.length === 0 ? (
                <div className="p-6 text-center space-y-3">
                  <div className="size-10 rounded-full bg-surface-muted flex items-center justify-center mx-auto text-muted-foreground border border-border">
                    <Users className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-foreground">No direct messages</div>
                    <p className="text-[11px] text-muted-foreground">
                      {searchQuery ? 'No conversations match your search.' : 'Start a private message with a teammate.'}
                    </p>
                  </div>
                  <Button variant="outline" size="xs" onClick={openNewDmModal} icon={<Plus className="size-3" />}>
                    New Message
                  </Button>
                </div>
              ) : (
                filteredDms.map((conv) => {
                  const active = conv.id === activeConversationId
                  const partner = conv.otherMember
                  const online = isOnline(partner?.lastLoginAt || null)

                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => setActiveConversationId(conv.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 rounded-lg text-left transition-[background-color,border-color] duration-100 cursor-pointer border',
                        active
                          ? 'bg-primary/10 border-primary/40 text-foreground'
                          : 'border-transparent hover:bg-surface-muted/60 text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <div className="relative shrink-0">
                        <Avatar
                          name={partner?.name || 'User'}
                          color={partner?.avatarColor || 'indigo'}
                          size="md"
                        />
                        <span
                          className={cn(
                            'absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-surface',
                            online ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'
                          )}
                          title={online ? 'Online' : 'Offline'}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-semibold text-xs text-foreground truncate">
                              {partner?.name || 'Teammate'}
                            </span>
                            {partner?.role && (
                              <span className="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-surface-muted border border-border/60 text-muted-foreground">
                                {partner.role}
                              </span>
                            )}
                          </div>
                          {conv.lastMessage && (
                            <span className="text-[10px] font-mono tabular-nums text-muted-foreground shrink-0">
                              {formatChatTime(conv.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          <p className="text-[11px] text-muted-foreground truncate">
                            {conv.lastMessage?.content || 'No messages yet'}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full font-mono text-[10px] font-bold bg-primary text-primary-foreground shrink-0">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </>
          )}

          {!loadingConversations && activeTab === 'channel' && (
            <>
              {filteredChannels.length === 0 ? (
                <div className="p-6 text-center space-y-3">
                  <div className="size-10 rounded-full bg-surface-muted flex items-center justify-center mx-auto text-muted-foreground border border-border">
                    <Hash className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-foreground">No channels found</div>
                    <p className="text-[11px] text-muted-foreground">
                      {searchQuery ? 'No channels match your query.' : 'Create a channel for team discussions.'}
                    </p>
                  </div>
                  {isLeader && (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setCreateChannelOpen(true)}
                      icon={<Plus className="size-3" />}
                    >
                      Create Channel
                    </Button>
                  )}
                </div>
              ) : (
                filteredChannels.map((conv) => {
                  const active = conv.id === activeConversationId

                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => setActiveConversationId(conv.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 rounded-lg text-left transition-[background-color,border-color] duration-100 cursor-pointer border',
                        active
                          ? 'bg-primary/10 border-primary/40 text-foreground'
                          : 'border-transparent hover:bg-surface-muted/60 text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <div className="size-9 rounded-lg bg-surface-muted flex items-center justify-center text-foreground font-mono font-bold shrink-0 border border-border/80">
                        <Hash className="size-4 text-primary" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-xs text-foreground truncate">
                            #{conv.name}
                          </span>
                          {conv.lastMessage && (
                            <span className="text-[10px] font-mono tabular-nums text-muted-foreground shrink-0">
                              {formatChatTime(conv.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          <p className="text-[11px] text-muted-foreground truncate">
                            {conv.lastMessage
                              ? `${conv.lastMessage.senderName}: ${conv.lastMessage.content}`
                              : conv.description || `${conv.memberCount} members`}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full font-mono text-[10px] font-bold bg-primary text-primary-foreground shrink-0">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </>
          )}
        </div>
      </aside>

      {/* ── Right Panel: Conversation Main Window ──────────────────────────────── */}
      <main className="flex-1 flex flex-col bg-background min-w-0 relative">
        {activeConversation ? (
          <>
            {/* Conversation Header */}
            <div className="h-14 px-4 border-b border-border bg-surface flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => setActiveConversationId(null)}
                  className="lg:hidden p-1.5 -ml-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-surface-muted transition-colors"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="size-4" />
                </button>

                {activeConversation.type === 'DM' ? (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <Avatar
                        name={activeConversation.otherMember?.name || 'User'}
                        color={activeConversation.otherMember?.avatarColor || 'indigo'}
                        size="sm"
                      />
                      <span
                        className={cn(
                          'absolute bottom-0 right-0 size-2 rounded-full border border-surface',
                          isOnline(activeConversation.otherMember?.lastLoginAt || null)
                            ? 'bg-emerald-500'
                            : 'bg-slate-400 dark:bg-slate-600'
                        )}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-xs sm:text-sm text-foreground truncate">
                          {activeConversation.otherMember?.name || 'Direct Message'}
                        </h2>
                        {activeConversation.otherMember?.role && (
                          <Badge tone="slate" size="sm">
                            {activeConversation.otherMember.role}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {isOnline(activeConversation.otherMember?.lastLoginAt || null)
                          ? 'Active in CRM'
                          : activeConversation.otherMember?.email || 'Direct Conversation'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-7.5 rounded-md bg-surface-muted border border-border flex items-center justify-center shrink-0">
                      <Hash className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-xs sm:text-sm text-foreground truncate">
                          #{activeConversation.name}
                        </h2>
                        <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                          <Users className="size-3" />
                          {activeConversation.memberCount}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {activeConversation.description || 'Channel conversation'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => fetchMessages(activeConversation.id)}
                  icon={<RefreshCw className={cn('size-3.5 text-muted-foreground', loadingMessages && 'animate-spin')} />}
                  title="Refresh messages"
                />
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 scrollbar-slim">
              {loadingMessages && (
                <div className="flex items-center justify-center h-48">
                  <RefreshCw className="size-6 text-primary animate-spin" />
                </div>
              )}

              {!loadingMessages && messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="size-12 rounded-full bg-surface flex items-center justify-center border border-border text-muted-foreground shadow-xs">
                    <Sparkles className="size-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-foreground">
                      {activeConversation.type === 'DM'
                        ? `Start conversation with ${activeConversation.otherMember?.name}`
                        : `Welcome to #${activeConversation.name}`}
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      {activeConversation.type === 'DM'
                        ? 'Send your first message to begin collaborating in real time.'
                        : 'This is the start of the channel. Post announcements, updates, and team discussions.'}
                    </p>
                  </div>
                </div>
              )}

              {!loadingMessages &&
                groupedMessages.map((group) => (
                  <div key={group.date} className="space-y-4">
                    {/* Date Divider */}
                    <div className="relative flex items-center justify-center my-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border/80" />
                      </div>
                      <span className="relative bg-background px-3 py-0.5 text-[10px] font-semibold text-muted-foreground rounded-full border border-border/60">
                        {group.date}
                      </span>
                    </div>

                    {/* Messages in this Date Group */}
                    {group.items.map((msg) => {
                      const isOwn = msg.senderId === currentUser?.id

                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            'flex gap-2.5 max-w-[85%] sm:max-w-[75%]',
                            isOwn ? 'ml-auto flex-row-reverse' : 'mr-auto'
                          )}
                        >
                          {!isOwn && (
                            <Avatar
                              name={msg.sender.name}
                              color={msg.sender.avatarColor || 'indigo'}
                              size="sm"
                            />
                          )}

                          <div className={cn('space-y-1', isOwn && 'items-end flex flex-col')}>
                            {!isOwn && (
                              <div className="flex items-center gap-1.5 px-1">
                                <span className="font-bold text-[11px] text-foreground">
                                  {msg.sender.name}
                                </span>
                                {msg.sender.role && (
                                  <span className="text-[9px] font-mono text-muted-foreground">
                                    {msg.sender.role}
                                  </span>
                                )}
                              </div>
                            )}

                            <div
                              className={cn(
                                'rounded-xl p-3 text-xs leading-relaxed break-words whitespace-pre-wrap shadow-xs',
                                isOwn
                                  ? 'bg-primary text-primary-foreground font-medium rounded-tr-xs'
                                  : 'bg-surface border border-border text-foreground rounded-tl-xs'
                              )}
                            >
                              <FormattedMessageContent
                                content={msg.content}
                                isOwn={isOwn}
                                currentUserId={currentUser?.id}
                                currentUserName={currentUser?.name}
                                users={eligibleUsers}
                                channels={conversations.channels}
                                onSelectUser={(user) => {
                                  if (currentUser && user.id === currentUser.id) return
                                  handleStartDm(user.id)
                                }}
                                onSelectChannel={(channelId) => {
                                  setActiveTab('channel')
                                  setActiveConversationId(channelId)
                                }}
                              />
                            </div>

                            <div
                              className={cn(
                                'flex items-center gap-1 text-[10px] font-mono tabular-nums text-muted-foreground px-1',
                                isOwn && 'justify-end'
                              )}
                            >
                              <span>{formatChatTime(msg.createdAt)}</span>
                              {isOwn && <CheckCheck className="size-3 text-primary" />}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Composer */}
            <div className="p-3 sm:p-4 bg-surface border-t border-border">
              <form onSubmit={handleSendMessage} className="space-y-2">
                <div className="relative rounded-lg border border-border bg-surface-muted/40 focus-within:border-border-strong focus-within:bg-surface transition-[background-color,border-color]">
                  {/* Mention Autocomplete Dropdown */}
                  {mentionQuery && filteredMentionItems.length > 0 && (
                    <div className="absolute left-0 bottom-full mb-2 w-72 rounded-lg border border-border bg-surface shadow-xl overflow-hidden z-30 animate-in fade-in slide-in-from-bottom-2 duration-100">
                      <div className="px-2.5 py-1.5 bg-surface-muted/70 border-b border-border flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          {mentionQuery.type === 'user' ? (
                            <AtSign className="size-3 text-primary" />
                          ) : (
                            <Hash className="size-3 text-cyan-400" />
                          )}
                          <span>{mentionQuery.type === 'user' ? 'Mention Teammate' : 'Mention Channel'}</span>
                        </div>
                        <span className="font-mono text-[9px]">↑↓ navigate, ↵ insert</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
                        {filteredMentionItems.map((item, idx) => (
                          <button
                            key={item.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              insertMention(item.insertText)
                            }}
                            className={cn(
                              'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left',
                              idx === mentionSelectedIndex
                                ? 'bg-primary/15 text-foreground font-medium'
                                : 'hover:bg-surface-hover text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {item.icon}
                            <div className="min-w-0 flex-1 truncate">
                              <span className="text-xs text-foreground font-medium">{item.label}</span>
                              {item.sublabel && (
                                <span className="text-[10px] text-muted-foreground ml-1.5 truncate">
                                  {item.sublabel}
                                </span>
                              )}
                            </div>
                            {item.badge && (
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-surface-muted text-muted-foreground shrink-0">
                                {item.badge}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <textarea
                    ref={textareaRef}
                    rows={2}
                    value={messageText}
                    onChange={handleTextareaChange}
                    onKeyDown={handleTextareaKeyDown}
                    placeholder={
                      activeConversation.type === 'DM'
                        ? `Message ${activeConversation.otherMember?.name || 'teammate'}... (@person or #channel supported)`
                        : `Message #${activeConversation.name}... (@person or #channel supported)`
                    }
                    className="w-full resize-none p-3 pb-10 text-xs text-foreground placeholder:text-muted-foreground outline-none bg-transparent"
                    disabled={sending}
                  />

                  <div className="absolute right-2.5 bottom-2.5 flex items-center gap-2">
                    <span className="hidden sm:inline text-[10px] text-muted-foreground font-mono">
                      Enter ↵ send
                    </span>
                    <Button
                      type="submit"
                      variant="primary"
                      size="xs"
                      disabled={!messageText.trim() || sending}
                      icon={<Send className="size-3" />}
                    >
                      {sending ? 'Sending...' : 'Send'}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="size-14 rounded-2xl bg-surface border border-border flex items-center justify-center text-primary shadow-xs">
              <MessageSquare className="size-7" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h2 className="font-bold text-base text-foreground">Select a conversation</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Choose a direct message or team channel from the sidebar to connect with your team.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button variant="primary" size="sm" onClick={openNewDmModal} icon={<Plus className="size-3.5" />}>
                New Direct Message
              </Button>
              {isLeader && (
                <Button variant="outline" size="sm" onClick={() => setCreateChannelOpen(true)} icon={<Hash className="size-3.5" />}>
                  Create Channel
                </Button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── New DM Modal ────────────────────────────────────────────────────── */}
      {newDmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface shadow-xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-bold text-sm text-foreground">New Direct Message</h3>
                <p className="text-xs text-muted-foreground">Select a team member to start chatting</p>
              </div>
              <button
                type="button"
                onClick={() => setNewDmOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search team members by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full rounded-md border border-border bg-surface-muted/60 pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-border-strong focus:bg-surface transition-colors"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1 scrollbar-slim">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="size-5 text-primary animate-spin" />
                </div>
              ) : eligibleUsers.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No other active team members found.
                </div>
              ) : (
                eligibleUsers
                  .filter((u) => {
                    if (!userSearch.trim()) return true
                    const q = userSearch.toLowerCase()
                    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
                  })
                  .map((u) => {
                    const online = isOnline(u.lastLoginAt)
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleStartDm(u.id)}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-surface-muted/80 text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <Avatar name={u.name} color={u.avatarColor} size="sm" />
                            <span
                              className={cn(
                                'absolute bottom-0 right-0 size-2 rounded-full border border-surface',
                                online ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'
                              )}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-foreground truncate">{u.name}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{u.email}</div>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-muted border border-border/80 text-muted-foreground">
                          {u.role}
                        </span>
                      </button>
                    )
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Create Channel Modal ────────────────────────────────────────────── */}
      {createChannelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface shadow-xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-bold text-sm text-foreground">Create Team Channel</h3>
                <p className="text-xs text-muted-foreground">Organize discussions around a specific focus</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateChannelOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Channel Name</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    placeholder="outreach-ops"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    className="w-full rounded-md border border-border bg-surface-muted/60 pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-border-strong focus:bg-surface font-mono"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Lowercase letters, numbers, and hyphens only.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Topic or guidelines for this channel..."
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface-muted/60 p-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-border-strong focus:bg-surface resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCreateChannelOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!newChannelName.trim() || creatingChannel}
                  icon={<Plus className="size-3.5" />}
                >
                  {creatingChannel ? 'Creating...' : 'Create Channel'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
