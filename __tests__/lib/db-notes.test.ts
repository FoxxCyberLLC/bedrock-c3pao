import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
const mockClientQuery = vi.fn()
const mockClientRelease = vi.fn()

vi.mock('@/lib/db', () => ({
  query: mockQuery,
  getClient: vi.fn(async () => ({
    query: mockClientQuery,
    release: mockClientRelease,
  })),
}))

const {
  listNotes,
  getNote,
  createNote,
  editNote,
  deleteNote,
  listRevisions,
} = await import('@/lib/db-notes')

const ACTOR = { id: 'u1', email: 'u1@c3pao.test', name: 'Unit One' }

function noteRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'note-1',
    engagement_id: 'eng-1',
    author_id: ACTOR.id,
    author_email: ACTOR.email,
    author_name: ACTOR.name,
    body: 'hello world',
    created_at: new Date('2026-04-01T00:00:00Z'),
    updated_at: new Date('2026-04-01T00:00:00Z'),
    deleted_at: null,
    revision_count: 0,
    ...overrides,
  }
}

describe('db-notes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listNotes', () => {
    it('filters out deleted rows and orders newest first', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [noteRow()], rowCount: 1 })

      const out = await listNotes('eng-1')

      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain('deleted_at IS NULL')
      expect(sql).toContain('ORDER BY n.created_at DESC')
      expect(params).toEqual(['eng-1'])
      expect(out).toHaveLength(1)
      expect(out[0].revisionCount).toBe(0)
    })

    it('parses string revision_count as number', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [noteRow({ revision_count: '3' })], rowCount: 1 })

      const [note] = await listNotes('eng-1')

      expect(note.revisionCount).toBe(3)
    })
  })

  describe('getNote', () => {
    it('returns null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const out = await getNote('missing')

      expect(out).toBeNull()
    })

    it('returns the note even if deleted (includes deletedAt)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [noteRow({ deleted_at: new Date('2026-04-05T00:00:00Z') })],
        rowCount: 1,
      })

      const note = await getNote('note-1')

      expect(note?.deletedAt).toBe('2026-04-05T00:00:00.000Z')
    })
  })

  describe('createNote', () => {
    it('inserts and returns the created note', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'note-new' }], rowCount: 1 })
      mockQuery.mockResolvedValueOnce({ rows: [noteRow({ id: 'note-new' })], rowCount: 1 })

      const out = await createNote({
        engagementId: 'eng-1',
        author: ACTOR,
        body: 'fresh',
      })

      expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO assessment_notes')
      expect(mockQuery.mock.calls[0][1]).toEqual([
        'eng-1',
        ACTOR.id,
        ACTOR.email,
        ACTOR.name,
        'fresh',
      ])
      expect(out.id).toBe('note-new')
    })
  })

  describe('editNote', () => {
    it('runs in transaction: reads old body, inserts revision, updates body', async () => {
      mockClientQuery.mockImplementation(async (sql: string) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] }
        if (sql.includes('SELECT body, deleted_at')) {
          return { rows: [{ body: 'old body', deleted_at: null }] }
        }
        return { rows: [] }
      })
      mockQuery.mockResolvedValueOnce({ rows: [noteRow({ body: 'new body' })], rowCount: 1 })

      const out = await editNote({ noteId: 'note-1', editor: ACTOR, newBody: 'new body' })

      const sqls = mockClientQuery.mock.calls.map((c: unknown[]) => c[0] as string)
      expect(sqls).toContain('BEGIN')
      expect(sqls).toContain('COMMIT')
      expect(sqls.some((s) => s.includes('INSERT INTO assessment_note_revisions'))).toBe(true)
      expect(sqls.some((s) => s.includes('UPDATE assessment_notes'))).toBe(true)

      // Revision insert should use the OLD body, not the new one
      const revInsertCall = mockClientQuery.mock.calls.find((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO assessment_note_revisions'),
      )
      expect(revInsertCall?.[1]).toEqual(['note-1', 'old body', ACTOR.name, ACTOR.email])

      expect(out.body).toBe('new body')
      expect(mockClientRelease).toHaveBeenCalled()
    })

    it('rolls back when note missing', async () => {
      mockClientQuery.mockImplementation(async (sql: string) => {
        if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [] }
        if (sql.includes('SELECT body, deleted_at')) return { rows: [] }
        return { rows: [] }
      })

      await expect(
        editNote({ noteId: 'note-missing', editor: ACTOR, newBody: 'x' }),
      ).rejects.toThrow(/not found/)

      const sqls = mockClientQuery.mock.calls.map((c: unknown[]) => c[0] as string)
      expect(sqls).toContain('ROLLBACK')
      expect(mockClientRelease).toHaveBeenCalled()
    })

    it('rolls back when note is soft-deleted', async () => {
      mockClientQuery.mockImplementation(async (sql: string) => {
        if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [] }
        if (sql.includes('SELECT body, deleted_at')) {
          return { rows: [{ body: 'x', deleted_at: new Date() }] }
        }
        return { rows: [] }
      })

      await expect(
        editNote({ noteId: 'note-1', editor: ACTOR, newBody: 'x' }),
      ).rejects.toThrow(/deleted/)

      const sqls = mockClientQuery.mock.calls.map((c: unknown[]) => c[0] as string)
      expect(sqls).toContain('ROLLBACK')
    })
  })

  describe('deleteNote', () => {
    it('sets deleted_at only when not already deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      await deleteNote('note-1', ACTOR)

      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain('SET deleted_at = NOW()')
      expect(sql).toContain('deleted_at IS NULL')
      expect(params).toEqual(['note-1'])
    })
  })

  describe('listRevisions', () => {
    it('orders revisions oldest-first', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'r-1',
            note_id: 'note-1',
            body: 'v1',
            edited_by: ACTOR.name,
            edited_by_email: ACTOR.email,
            revised_at: new Date('2026-04-02T00:00:00Z'),
          },
        ],
        rowCount: 1,
      })

      const revs = await listRevisions('note-1')

      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain('FROM assessment_note_revisions')
      expect(sql).toContain('ORDER BY revised_at ASC')
      expect(params).toEqual(['note-1'])
      expect(revs[0].body).toBe('v1')
      expect(revs[0].revisedAt).toBe('2026-04-02T00:00:00.000Z')
    })
  })
})
