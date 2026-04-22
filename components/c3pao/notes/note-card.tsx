'use client'

/**
 * A single assessment note. Shows author identity, timestamp, body, and
 * author-only Edit / Delete controls. Surfaces a "View history" link when
 * the note has one or more revisions.
 */

import { formatDistanceToNow } from 'date-fns'
import { History, Pencil, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { safeDate } from '@/lib/utils'
import type { AssessmentNote } from '@/lib/readiness-types'

export interface NoteCardProps {
  note: AssessmentNote
  isAuthor: boolean
  isAuthorLead?: boolean
  onEdit: (note: AssessmentNote) => void
  onDelete: (note: AssessmentNote) => void
  onViewHistory: (note: AssessmentNote) => void
}

export function NoteCard({
  note,
  isAuthor,
  isAuthorLead = false,
  onEdit,
  onDelete,
  onViewHistory,
}: NoteCardProps): React.ReactElement {
  const when = safeDate(note.createdAt)
  const relative = when
    ? formatDistanceToNow(when, { addSuffix: true })
    : note.createdAt
  const edited = note.revisionCount > 0

  return (
    <Card data-testid={`note-card-${note.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{note.authorName}</span>
            {isAuthorLead && (
              <Badge
                variant="outline"
                className="border-amber-300 bg-amber-50 text-amber-800"
              >
                Lead assessor
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{relative}</span>
          </div>
          {isAuthor && (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                aria-label="Edit note"
                onClick={() => onEdit(note)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Delete note"
                onClick={() => onDelete(note)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="whitespace-pre-wrap text-sm">{note.body}</p>
        {edited && (
          <button
            type="button"
            onClick={() => onViewHistory(note)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            data-testid="note-history-link"
          >
            <History className="h-3 w-3" aria-hidden />
            Edited {note.revisionCount} time{note.revisionCount === 1 ? '' : 's'} · View history
          </button>
        )}
      </CardContent>
    </Card>
  )
}
