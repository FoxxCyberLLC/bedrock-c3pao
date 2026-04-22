/**
 * Data access for assessment notes + revisions.
 * Author checks live in the server action layer — this module trusts its caller.
 */

import { query, getClient } from './db'
import type { AssessmentNote, NoteRevision } from './readiness-types'

export interface Actor {
  id: string
  email: string
  name: string
}

interface NoteRow {
  id: string
  engagement_id: string
  author_id: string
  author_email: string
  author_name: string
  body: string
  created_at: string | Date
  updated_at: string | Date
  deleted_at: string | Date | null
  revision_count: string | number
}

interface RevisionRow {
  id: string
  note_id: string
  body: string
  edited_by: string
  edited_by_email: string
  revised_at: string | Date
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value
}

function toIsoNullable(value: string | Date | null): string | null {
  if (value === null) return null
  return value instanceof Date ? value.toISOString() : value
}

function mapNote(row: NoteRow): AssessmentNote {
  return {
    id: row.id,
    engagementId: row.engagement_id,
    authorId: row.author_id,
    authorEmail: row.author_email,
    authorName: row.author_name,
    body: row.body,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    deletedAt: toIsoNullable(row.deleted_at),
    revisionCount:
      typeof row.revision_count === 'string'
        ? parseInt(row.revision_count, 10)
        : row.revision_count,
  }
}

function mapRevision(row: RevisionRow): NoteRevision {
  return {
    id: row.id,
    noteId: row.note_id,
    body: row.body,
    editedBy: row.edited_by,
    editedByEmail: row.edited_by_email,
    revisedAt: toIso(row.revised_at),
  }
}

const SELECT_NOTE_WITH_COUNT = `
  SELECT n.id, n.engagement_id, n.author_id, n.author_email, n.author_name,
         n.body, n.created_at, n.updated_at, n.deleted_at,
         COALESCE((SELECT COUNT(*) FROM assessment_note_revisions r
                   WHERE r.note_id = n.id), 0) AS revision_count
  FROM assessment_notes n
`

/** List non-deleted notes for an engagement, newest first. */
export async function listNotes(engagementId: string): Promise<AssessmentNote[]> {
  const result = await query(
    `${SELECT_NOTE_WITH_COUNT}
     WHERE n.engagement_id = $1 AND n.deleted_at IS NULL
     ORDER BY n.created_at DESC`,
    [engagementId],
  )
  return (result.rows as NoteRow[]).map(mapNote)
}

/** Fetch a single note regardless of deleted state. */
export async function getNote(noteId: string): Promise<AssessmentNote | null> {
  const result = await query(`${SELECT_NOTE_WITH_COUNT} WHERE n.id = $1`, [noteId])
  const row = result.rows[0] as NoteRow | undefined
  return row ? mapNote(row) : null
}

export interface CreateNoteInput {
  engagementId: string
  author: Actor
  body: string
}

export async function createNote(input: CreateNoteInput): Promise<AssessmentNote> {
  const insert = await query(
    `INSERT INTO assessment_notes
       (engagement_id, author_id, author_email, author_name, body)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [input.engagementId, input.author.id, input.author.email, input.author.name, input.body],
  )
  const id = (insert.rows[0] as { id: string }).id
  const created = await getNote(id)
  if (!created) throw new Error('Failed to load just-created note')
  return created
}

export interface EditNoteInput {
  noteId: string
  editor: Actor
  newBody: string
}

/**
 * Edit a note inside a transaction. The previous body is snapshotted into
 * `assessment_note_revisions` before being overwritten. Throws if the note
 * is missing or soft-deleted.
 */
export async function editNote(input: EditNoteInput): Promise<AssessmentNote> {
  const client = await getClient()
  try {
    await client.query('BEGIN')
    const current = await client.query(
      `SELECT body, deleted_at FROM assessment_notes WHERE id = $1 FOR UPDATE`,
      [input.noteId],
    )
    const row = current.rows[0] as { body: string; deleted_at: Date | null } | undefined
    if (!row) {
      throw new Error(`Note ${input.noteId} not found`)
    }
    if (row.deleted_at !== null) {
      throw new Error(`Note ${input.noteId} is deleted`)
    }
    await client.query(
      `INSERT INTO assessment_note_revisions
         (note_id, body, edited_by, edited_by_email)
       VALUES ($1, $2, $3, $4)`,
      [input.noteId, row.body, input.editor.name, input.editor.email],
    )
    await client.query(
      `UPDATE assessment_notes
       SET body = $2, updated_at = NOW()
       WHERE id = $1`,
      [input.noteId, input.newBody],
    )
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
  const updated = await getNote(input.noteId)
  if (!updated) throw new Error('Note disappeared mid-edit')
  return updated
}

/** Soft delete: set deleted_at, preserve revisions. */
export async function deleteNote(noteId: string, actor: Actor): Promise<void> {
  // actor currently unused at the DB layer (caller logs to audit). Reserved
  // for a future "deleted_by" column.
  void actor
  await query(
    `UPDATE assessment_notes
     SET deleted_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL`,
    [noteId],
  )
}

/** List all revisions for a note (oldest first). */
export async function listRevisions(noteId: string): Promise<NoteRevision[]> {
  const result = await query(
    `SELECT id, note_id, body, edited_by, edited_by_email, revised_at
     FROM assessment_note_revisions
     WHERE note_id = $1
     ORDER BY revised_at ASC`,
    [noteId],
  )
  return (result.rows as RevisionRow[]).map(mapRevision)
}
