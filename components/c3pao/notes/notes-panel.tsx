'use client'

/**
 * Top-level notes panel for the Review tab. Lists engagement-scoped
 * notes newest-first, wires up create / edit / delete via the server
 * actions, and exposes the revision history dialog.
 */

import { Plus } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  createNote,
  deleteNote,
  editNote,
  listNotes,
} from '@/app/actions/c3pao-notes'
import type { AssessmentNote } from '@/lib/readiness-types'

import { NoteCard } from './note-card'
import { NoteEditor } from './note-editor'
import { NoteHistoryDialog } from './note-history-dialog'

export interface NotesPanelProps {
  engagementId: string
  currentUserId: string
  leadAssessorId?: string | null
  initialNotes?: AssessmentNote[]
}

type EditorState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; note: AssessmentNote }

export function NotesPanel({
  engagementId,
  currentUserId,
  leadAssessorId = null,
  initialNotes = [],
}: NotesPanelProps): React.ReactElement {
  const [notes, setNotes] = useState<AssessmentNote[]>(initialNotes)
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' })
  const [historyNoteId, setHistoryNoteId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    // Re-fetch on mount so freshly mounted client pages see latest notes.
    let cancelled = false
    async function load(): Promise<void> {
      const result = await listNotes(engagementId)
      if (cancelled) return
      if (result.success && result.data) setNotes(result.data)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [engagementId])

  async function refresh(): Promise<void> {
    const result = await listNotes(engagementId)
    if (result.success && result.data) setNotes(result.data)
  }

  function handleSubmit(body: string): void {
    startTransition(async () => {
      if (editor.mode === 'create') {
        const r = await createNote(engagementId, body)
        if (r.success) {
          toast.success('Note added')
          setEditor({ mode: 'closed' })
          await refresh()
        } else {
          toast.error(r.error ?? 'Failed to add note')
        }
        return
      }
      if (editor.mode === 'edit') {
        const r = await editNote(editor.note.id, body)
        if (r.success) {
          toast.success('Note updated')
          setEditor({ mode: 'closed' })
          await refresh()
        } else {
          toast.error(r.error ?? 'Failed to edit note')
        }
      }
    })
  }

  function handleDelete(note: AssessmentNote): void {
    if (
      !window.confirm(
        'Delete this note? The note will be hidden and revisions preserved.',
      )
    ) {
      return
    }
    startTransition(async () => {
      const r = await deleteNote(note.id)
      if (r.success) {
        toast.success('Note deleted')
        await refresh()
      } else {
        toast.error(r.error ?? 'Failed to delete note')
      }
    })
  }

  return (
    <section className="space-y-4" aria-labelledby="notes-panel-heading">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 id="notes-panel-heading" className="text-lg font-semibold">
            Notes
          </h3>
          <p className="text-sm text-muted-foreground">
            Engagement-scoped living notes. Every edit and delete is tracked.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setEditor({ mode: 'create' })}
          data-testid="add-note-button"
        >
          <Plus className="h-4 w-4" /> Add note
        </Button>
      </div>

      {notes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No notes yet. Add the first one to start the record.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id}>
              <NoteCard
                note={n}
                isAuthor={n.authorId === currentUserId}
                isAuthorLead={
                  leadAssessorId !== null && n.authorId === leadAssessorId
                }
                onEdit={(note) => setEditor({ mode: 'edit', note })}
                onDelete={handleDelete}
                onViewHistory={(note) => setHistoryNoteId(note.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <NoteEditor
        open={editor.mode !== 'closed'}
        onOpenChange={(open) => {
          if (!open) setEditor({ mode: 'closed' })
        }}
        mode={editor.mode === 'edit' ? 'edit' : 'create'}
        initialBody={editor.mode === 'edit' ? editor.note.body : ''}
        pending={pending}
        onSubmit={handleSubmit}
      />

      <NoteHistoryDialog
        open={historyNoteId !== null}
        onOpenChange={(open) => {
          if (!open) setHistoryNoteId(null)
        }}
        noteId={historyNoteId}
      />
    </section>
  )
}
