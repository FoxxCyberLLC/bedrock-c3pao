'use client'

/**
 * Modal showing the immutable revision history of a note. Revisions are
 * listed oldest-first so readers see how the note evolved over time.
 */

import { format } from 'date-fns'
import { useEffect, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { listNoteRevisions } from '@/app/actions/c3pao-notes'
import { safeDate } from '@/lib/utils'
import type { NoteRevision } from '@/lib/readiness-types'

export interface NoteHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  noteId: string | null
}

export function NoteHistoryDialog({
  open,
  onOpenChange,
  noteId,
}: NoteHistoryDialogProps): React.ReactElement {
  const [revisions, setRevisions] = useState<NoteRevision[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !noteId) return
    let cancelled = false
    async function load(): Promise<void> {
      setLoading(true)
      setError(null)
      const result = await listNoteRevisions(noteId as string)
      if (cancelled) return
      if (result.success && result.data) {
        setRevisions(result.data)
      } else {
        setError(result.error ?? 'Failed to load history')
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [open, noteId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Note revision history</DialogTitle>
          <DialogDescription>
            Every edit to this note is preserved. Revisions are listed in
            chronological order (oldest first).
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <p className="text-sm text-muted-foreground">Loading history…</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!loading && !error && revisions.length === 0 && (
            <p className="text-sm text-muted-foreground">No revisions yet.</p>
          )}
          <ol className="space-y-4">
            {revisions.map((r, index) => {
              const when = safeDate(r.revisedAt)
              const whenText = when ? format(when, 'PPP p') : r.revisedAt
              return (
                <li
                  key={r.id}
                  className="rounded-md border bg-muted/20 p-3"
                  data-testid="note-revision"
                >
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Revision #{index + 1} · {r.editedBy}
                    </span>
                    <span>{whenText}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{r.body}</p>
                </li>
              )
            })}
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  )
}
