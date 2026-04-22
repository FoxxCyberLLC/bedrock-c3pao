'use server'

/**
 * Engagement-scoped living notes server actions.
 *
 * All notes live in the C3PAO's local Postgres instance. Author identity
 * is captured at create-time and enforced on edit/delete here in the
 * action layer — the DB layer trusts its callers.
 */

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import {
  createNote as dbCreateNote,
  deleteNote as dbDeleteNote,
  editNote as dbEditNote,
  getNote,
  listNotes as dbListNotes,
  listRevisions,
} from '@/lib/db-notes'
import { appendAudit } from '@/lib/db-audit'
import type { AssessmentNote, NoteRevision } from '@/lib/readiness-types'

export interface ActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

const BODY_MIN_LENGTH = 1
const BODY_MAX_LENGTH = 10_000

function revalidateEngagement(engagementId: string): void {
  try {
    revalidatePath(`/engagements/${engagementId}`)
  } catch {
    // No-op in unit-test contexts without a route.
  }
}

async function safeAppendAudit(
  params: Parameters<typeof appendAudit>[0],
): Promise<void> {
  try {
    await appendAudit(params)
  } catch (error) {
    console.error('[notes] audit append failed', error)
  }
}

function validateBody(body: string): string | null {
  const trimmed = (body ?? '').trim()
  if (trimmed.length < BODY_MIN_LENGTH) return null
  if (trimmed.length > BODY_MAX_LENGTH) return null
  return trimmed
}

function errorEnvelope<T>(error: unknown, fallback: string): ActionResult<T> {
  return {
    success: false,
    error: error instanceof Error ? error.message : fallback,
  }
}

/** List non-deleted notes for an engagement, newest-first. */
export async function listNotes(
  engagementId: string,
): Promise<ActionResult<AssessmentNote[]>> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const notes = await dbListNotes(engagementId)
    return { success: true, data: notes }
  } catch (error) {
    return errorEnvelope(error, 'Failed to load notes')
  }
}

/** Create a new note. Any authenticated user may create. */
export async function createNote(
  engagementId: string,
  body: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const trimmed = validateBody(body)
    if (!trimmed) {
      return {
        success: false,
        error: `Note body must be ${BODY_MIN_LENGTH}-${BODY_MAX_LENGTH} characters`,
      }
    }

    const actor = {
      id: session.c3paoUser.id,
      email: session.c3paoUser.email,
      name: session.c3paoUser.name,
    }
    const note = await dbCreateNote({
      engagementId,
      author: actor,
      body: trimmed,
    })
    await safeAppendAudit({
      engagementId,
      actor,
      action: 'note_created',
      details: { noteId: note.id },
    })
    revalidateEngagement(engagementId)
    return { success: true, data: { id: note.id } }
  } catch (error) {
    return errorEnvelope(error, 'Failed to create note')
  }
}

/** Author-only: edit a note. Previous body is snapshot into revisions. */
export async function editNote(
  noteId: string,
  body: string,
): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const trimmed = validateBody(body)
    if (!trimmed) {
      return {
        success: false,
        error: `Note body must be ${BODY_MIN_LENGTH}-${BODY_MAX_LENGTH} characters`,
      }
    }

    const existing = await getNote(noteId)
    if (!existing) return { success: false, error: 'Note not found' }
    if (existing.deletedAt) return { success: false, error: 'Note is deleted' }
    if (existing.authorId !== session.c3paoUser.id) {
      return { success: false, error: 'Only the note author may edit' }
    }

    const actor = {
      id: session.c3paoUser.id,
      email: session.c3paoUser.email,
      name: session.c3paoUser.name,
    }
    await dbEditNote({ noteId, editor: actor, newBody: trimmed })
    await safeAppendAudit({
      engagementId: existing.engagementId,
      actor,
      action: 'note_edited',
      details: { noteId },
    })
    revalidateEngagement(existing.engagementId)
    return { success: true }
  } catch (error) {
    return errorEnvelope(error, 'Failed to edit note')
  }
}

/** Author-only: soft-delete a note (revisions preserved). */
export async function deleteNote(noteId: string): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const existing = await getNote(noteId)
    if (!existing) return { success: false, error: 'Note not found' }
    if (existing.deletedAt) return { success: true } // already deleted — idempotent
    if (existing.authorId !== session.c3paoUser.id) {
      return { success: false, error: 'Only the note author may delete' }
    }

    const actor = {
      id: session.c3paoUser.id,
      email: session.c3paoUser.email,
      name: session.c3paoUser.name,
    }
    await dbDeleteNote(noteId, actor)
    await safeAppendAudit({
      engagementId: existing.engagementId,
      actor,
      action: 'note_deleted',
      details: { noteId },
    })
    revalidateEngagement(existing.engagementId)
    return { success: true }
  } catch (error) {
    return errorEnvelope(error, 'Failed to delete note')
  }
}

/** List the immutable revision history for a note (oldest first). */
export async function listNoteRevisions(
  noteId: string,
): Promise<ActionResult<NoteRevision[]>> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const revisions = await listRevisions(noteId)
    return { success: true, data: revisions }
  } catch (error) {
    return errorEnvelope(error, 'Failed to load note revisions')
  }
}
