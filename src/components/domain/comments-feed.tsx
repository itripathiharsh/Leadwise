'use client'

import * as React from 'react'
import { MessageSquare, Send, User, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { formatDateTime } from '@/lib/dates'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CommentsFeedProps {
  organisationId: string
}

export function CommentsFeed({ organisationId }: CommentsFeedProps) {
  const [comments, setComments] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [newComment, setNewComment] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  const fetchComments = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/comments?organisationId=${organisationId}`)
      if (res.ok) {
        const d = await res.json()
        setComments(d.comments ?? [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [organisationId])

  React.useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organisationId, comment: newComment.trim() }),
      })

      if (res.ok) {
        setNewComment('')
        toast.success('Internal note posted!')
        fetchComments()
      } else {
        toast.error('Failed to post note.')
      }
    } catch {
      toast.error('Network error posting note.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Comments List */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {loading && comments.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Loading internal discussion...
          </div>
        ) : comments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground space-y-1">
            <MessageSquare className="size-5 mx-auto text-muted-foreground/60" />
            <p className="font-semibold">No internal team notes yet</p>
            <p className="text-[11px]">
              Use this feed to leave internal handover notes or tag teammates (e.g. @Rahul, @Priya).
            </p>
          </div>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-border bg-surface p-3.5 space-y-2 shadow-xs"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Avatar name={c.author.name} color={c.author.avatarColor} size="xs" />
                  <span className="font-bold text-foreground">{c.author.name}</span>
                  <span className="text-[10px] text-muted-foreground">({c.author.role})</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {formatDateTime(c.createdAt)}
                </span>
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap pl-7">
                {c.body}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Post form */}
      <form onSubmit={handlePost} className="space-y-2 pt-2 border-t border-border">
        <textarea
          rows={2}
          placeholder="Leave an internal note for the team (type @Name to mention)..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface p-3 text-xs text-foreground placeholder:text-muted-foreground shadow-xs focus:border-primary focus:outline-none"
        />
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="xs"
            type="submit"
            loading={submitting}
            disabled={!newComment.trim()}
            icon={<Send className="size-3" />}
          >
            Post Internal Note
          </Button>
        </div>
      </form>
    </div>
  )
}
