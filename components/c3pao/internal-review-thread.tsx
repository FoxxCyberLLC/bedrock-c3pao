'use client'

/**
 * Thread of C3PAO-internal reviews + comments on a single entity
 * (evidence file or SSP diagram). These notes stay inside the container —
 * they are never shared with the OSC per CAP v2.0.
 */

import { useEffect, useState, useTransition } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { CheckCircle2, MessageSquare, Trash2, Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  listEntityReviews,
  addEntityReview,
  removeEntityReview,
} from '@/app/actions/c3pao-internal-reviews'
import type {
  InternalReview,
  InternalReviewEntityType,
} from '@/lib/internal-reviews'

interface InternalReviewThreadProps {
  engagementId: string
  entityType: InternalReviewEntityType
  entityId: string
  currentUserId: string
}

export function InternalReviewThread({
  engagementId,
  entityType,
  entityId,
  currentUserId,
}: InternalReviewThreadProps) {
  const [reviews, setReviews] = useState<InternalReview[]>([])
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const result = await listEntityReviews(engagementId, entityType, entityId)
      if (cancelled) return
      if (result.success) setReviews(result.data)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [engagementId, entityType, entityId])

  function handleSubmit() {
    const trimmed = comment.trim()
    startTransition(async () => {
      const result = await addEntityReview({
        engagementId,
        entityType,
        entityId,
        comment: trimmed || null,
      })
      if (result.success) {
        setReviews((prev) => [...prev, result.data])
        setComment('')
        toast.success(trimmed ? 'Comment posted' : 'Marked reviewed')
      } else {
        toast.error(result.error)
      }
    })
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const result = await removeEntityReview(id)
    setDeletingId(null)
    if (result.success) {
      setReviews((prev) => prev.filter((r) => r.id !== id))
      toast.success('Removed')
    } else {
      toast.error(result.error)
    }
  }

  const hasReviews = reviews.length > 0
  const trimmedComment = comment.trim()
  const submitLabel = trimmedComment ? 'Post Comment' : 'Mark Reviewed'

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Internal Review
          </CardTitle>
          {hasReviews && (
            <Badge variant="outline" className="text-xs">
              {reviews.length} {reviews.length === 1 ? 'entry' : 'entries'}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
          <Lock className="h-3 w-3" />
          Internal to your C3PAO team · never shared with the OSC
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : hasReviews ? (
          <ol className="space-y-3">
            {reviews.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border bg-muted/20 p-3 space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {r.reviewerName}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(r.reviewedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  {r.reviewerId === currentUserId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      disabled={deletingId === r.id}
                      onClick={() => handleDelete(r.id)}
                      aria-label="Delete entry"
                    >
                      {deletingId === r.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
                {r.comment ? (
                  <p className="text-sm whitespace-pre-wrap pl-5">{r.comment}</p>
                ) : (
                  <p className="text-xs italic text-muted-foreground pl-5">
                    Marked as reviewed
                  </p>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No reviews yet. Mark this as reviewed or add a comment below.
          </p>
        )}

        <div className="space-y-2 border-t pt-3">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment (optional)..."
            rows={3}
            disabled={isPending}
            className="resize-none text-sm"
          />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
