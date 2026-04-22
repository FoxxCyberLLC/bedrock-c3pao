'use client'

/**
 * Create / edit note modal. Shared by the "Add Note" button and the
 * author's "Edit" action. Validates 1-10000 characters after trim to
 * mirror the server action.
 */

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const NOTE_BODY_MIN = 1
const NOTE_BODY_MAX = 10_000

export interface NoteEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialBody?: string
  mode?: 'create' | 'edit'
  pending?: boolean
  onSubmit: (body: string) => Promise<void> | void
}

export function NoteEditor(props: NoteEditorProps): React.ReactElement {
  // Key on `initialBody` so when the parent switches which note is being
  // edited the internal form state resets without needing a setState-in-
  // effect (which the react-hooks plugin rejects).
  return (
    <NoteEditorDialog
      key={`${props.mode ?? 'create'}::${props.initialBody ?? ''}`}
      {...props}
    />
  )
}

function NoteEditorDialog({
  open,
  onOpenChange,
  initialBody = '',
  mode = 'create',
  pending = false,
  onSubmit,
}: NoteEditorProps): React.ReactElement {
  const [body, setBody] = useState(initialBody)
  const [touched, setTouched] = useState(false)

  const trimmed = body.trim()
  const tooShort = trimmed.length < NOTE_BODY_MIN
  const tooLong = trimmed.length > NOTE_BODY_MAX
  const invalid = tooShort || tooLong
  const showError = touched && invalid

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (invalid) return
    await onSubmit(trimmed)
  }

  const title = mode === 'edit' ? 'Edit note' : 'Add note'
  const submitLabel = mode === 'edit' ? 'Save changes' : 'Add note'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Engagement-scoped notes are visible to every team member and are
            captured in the audit trail. Every edit is preserved.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="note-body">Note</Label>
            <Textarea
              id="note-body"
              data-testid="note-body-input"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              disabled={pending}
              aria-invalid={showError || undefined}
            />
            <div className="flex items-center justify-between text-xs">
              <span
                className={
                  showError ? 'text-destructive' : 'text-muted-foreground'
                }
              >
                {showError && tooShort && 'Note cannot be empty.'}
                {showError && tooLong &&
                  `Note must be at most ${NOTE_BODY_MAX.toLocaleString()} characters.`}
                {!showError && `Up to ${NOTE_BODY_MAX.toLocaleString()} characters.`}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {trimmed.length}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || invalid}>
              {pending ? 'Saving…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
