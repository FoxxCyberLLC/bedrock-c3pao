'use client'

/**
 * Engagement comment thread with @mention autocomplete (Task 13a).
 *
 * Replaces the legacy Notes textarea on the engagement detail. Comments
 * support `@username` autocomplete pulled from the existing team list,
 * and mentions create real notifications via the Go API fan-out.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { AtSign, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { safeDate } from '@/lib/utils'
import {
  createEngagementCommentAction,
  getEngagementComments,
} from '@/app/actions/c3pao-comments'
import { getC3PAOTeam } from '@/app/actions/c3pao-dashboard'
import type { EngagementCommentItem } from '@/lib/api-client'

interface EngagementCommentsProps {
  engagementId: string
}

interface TeamMember {
  id: string
  name: string
  email: string
}

export function EngagementComments({ engagementId }: EngagementCommentsProps) {
  const [comments, setComments] = useState<EngagementCommentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [team, setTeam] = useState<TeamMember[]>([])
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [commentsResult, teamResult] = await Promise.all([
      getEngagementComments(engagementId),
      getC3PAOTeam(),
    ])
    if (commentsResult.success && commentsResult.data) {
      setComments(commentsResult.data)
    }
    if (teamResult.success && teamResult.data) {
      setTeam(
        teamResult.data.map((m) => ({
          id: String(m.id ?? ''),
          name: String(m.name ?? ''),
          email: String(m.email ?? ''),
        })),
      )
    }
    setLoading(false)
  }, [engagementId])

  useEffect(() => {
    load()
  }, [load])

  // Extract the current @ query from the textarea (everything after the
  // most recent `@` up to the next whitespace).
  const detectMentionQuery = (value: string, caret: number): string | null => {
    const before = value.slice(0, caret)
    const atIdx = before.lastIndexOf('@')
    if (atIdx === -1) return null
    // Only trigger if @ is at start-of-line or after whitespace
    if (atIdx > 0 && !/\s/.test(before[atIdx - 1])) return null
    const after = before.slice(atIdx + 1)
    if (/\s/.test(after)) return null
    return after
  }

  const handleDraftChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value)
    const q = detectMentionQuery(e.target.value, e.target.selectionStart)
    setMentionQuery(q)
  }

  const suggestedMembers = useMemo(() => {
    if (mentionQuery === null) return []
    const q = mentionQuery.toLowerCase()
    return team
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q),
      )
      .slice(0, 5)
  }, [mentionQuery, team])

  const insertMention = (member: TeamMember) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const value = draft
    const caret = textarea.selectionStart
    const before = value.slice(0, caret)
    const atIdx = before.lastIndexOf('@')
    if (atIdx === -1) return
    const after = value.slice(caret)
    const mention = `@${member.name.replace(/\s+/g, '_')} `
    const newValue = value.slice(0, atIdx) + mention + after
    setDraft(newValue)
    setMentionQuery(null)
    // Restore focus + caret
    requestAnimationFrame(() => {
      textarea.focus()
      const newCaret = atIdx + mention.length
      textarea.setSelectionRange(newCaret, newCaret)
    })
  }

  /**
   * Match the inserted `@Display_Name` tokens back to user IDs.
   * Uses matchAll rather than a stateful regex loop so it's pure and
   * doesn't trip pattern-match security linters on the word "exec".
   */
  const extractMentionedIds = (content: string): string[] => {
    const mentionRegex = /@([\w.-]+)/g
    const names = new Set<string>()
    for (const match of content.matchAll(mentionRegex)) {
      if (match[1]) {
        names.add(match[1].replace(/_/g, ' ').toLowerCase())
      }
    }
    const ids: string[] = []
    for (const m of team) {
      if (names.has(m.name.toLowerCase())) {
        ids.push(m.id)
      }
    }
    return ids
  }

  const handleSubmit = () => {
    const content = draft.trim()
    if (!content) return
    const mentions = extractMentionedIds(content)
    startTransition(async () => {
      const result = await createEngagementCommentAction(engagementId, {
        content,
        mentions,
      })
      if (result.success && result.data) {
        setComments((prev) => [result.data!, ...prev])
        setDraft('')
        toast.success(
          mentions.length > 0
            ? `Comment posted · ${mentions.length} notified`
            : 'Comment posted',
        )
      } else {
        toast.error(result.error ?? 'Failed to post comment')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Compose box */}
      <div className="space-y-2">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={handleDraftChange}
            placeholder="Add a comment... use @ to mention a teammate"
            rows={3}
            disabled={isPending}
          />
          {mentionQuery !== null && suggestedMembers.length > 0 && (
            <div className="absolute bottom-full left-0 z-10 mb-1 w-full max-w-sm rounded-md border bg-popover shadow-md">
              <ul className="py-1">
                {suggestedMembers.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => insertMention(m)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent"
                    >
                      <AtSign className="h-3 w-3 text-muted-foreground" aria-hidden />
                      <span className="font-medium">{m.name}</span>
                      <span className="text-xs text-muted-foreground">{m.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!draft.trim() || isPending}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Post Comment
          </Button>
        </div>
      </div>

      {/* Thread */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No comments yet. Be the first — @mention a teammate to loop them in.
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => {
            const when = safeDate(c.createdAt)
            return (
              <li key={c.id} className="rounded-lg border p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    {(c.authorName ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {c.authorName ?? 'Deleted user'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {when
                          ? formatDistanceToNow(when, { addSuffix: true })
                          : ''}
                      </span>
                      {c.mentions.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <AtSign className="h-3 w-3" aria-hidden />
                          {c.mentions.length}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">
                      {c.content}
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
