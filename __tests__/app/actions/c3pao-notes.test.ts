import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AssessmentNote } from '@/lib/readiness-types'

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('@/lib/db-notes', () => ({
  listNotes: vi.fn(),
  getNote: vi.fn(),
  createNote: vi.fn(),
  editNote: vi.fn(),
  deleteNote: vi.fn(),
  listRevisions: vi.fn(),
}))

vi.mock('@/lib/db-audit', () => ({
  appendAudit: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const { requireAuth } = await import('@/lib/auth')
const dbNotes = await import('@/lib/db-notes')
const { appendAudit } = await import('@/lib/db-audit')

async function getActions() {
  return import('@/app/actions/c3pao-notes')
}

function sessionFixture(userId = 'user-1'): unknown {
  return {
    c3paoUser: {
      id: userId,
      email: `${userId}@c3pao.test`,
      name: `User ${userId}`,
      c3paoId: 'c3pao-1',
      c3paoName: 'C3PAO Inc',
      isLeadAssessor: false,
      status: 'active',
    },
    apiToken: 'tok',
    expires: new Date(Date.now() + 3600_000).toISOString(),
  }
}

function makeNote(overrides: Partial<AssessmentNote> = {}): AssessmentNote {
  return {
    id: 'note-1',
    engagementId: 'eng-1',
    authorId: 'user-1',
    authorEmail: 'user-1@c3pao.test',
    authorName: 'User user-1',
    body: 'original body',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    revisionCount: 0,
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(requireAuth).mockResolvedValue(sessionFixture() as never)
})

describe('listNotes', () => {
  it('returns unauthorized when no session', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(null)
    const { listNotes } = await getActions()
    const result = await listNotes('eng-1')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/unauthorized/i)
  })

  it('returns notes from db helper', async () => {
    vi.mocked(dbNotes.listNotes).mockResolvedValueOnce([makeNote()])
    const { listNotes } = await getActions()
    const result = await listNotes('eng-1')
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
  })
})

describe('createNote', () => {
  it('rejects empty body', async () => {
    const { createNote } = await getActions()
    const result = await createNote('eng-1', '   ')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/characters/i)
  })

  it('rejects body longer than 10000 chars', async () => {
    const { createNote } = await getActions()
    const result = await createNote('eng-1', 'x'.repeat(10_001))
    expect(result.success).toBe(false)
  })

  it('trims before persisting and writes audit', async () => {
    vi.mocked(dbNotes.createNote).mockResolvedValueOnce(makeNote({ id: 'new-1' }))
    const { createNote } = await getActions()
    const result = await createNote('eng-1', '  hello world  ')
    expect(result.success).toBe(true)
    expect(result.data?.id).toBe('new-1')
    expect(dbNotes.createNote).toHaveBeenCalledWith({
      engagementId: 'eng-1',
      author: expect.objectContaining({ id: 'user-1' }),
      body: 'hello world',
    })
    expect(appendAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'note_created' }),
    )
  })
})

describe('editNote', () => {
  it('rejects when note not found', async () => {
    vi.mocked(dbNotes.getNote).mockResolvedValueOnce(null)
    const { editNote } = await getActions()
    const result = await editNote('note-1', 'new body')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/not found/i)
  })

  it('rejects when note is soft-deleted', async () => {
    vi.mocked(dbNotes.getNote).mockResolvedValueOnce(
      makeNote({ deletedAt: new Date().toISOString() }),
    )
    const { editNote } = await getActions()
    const result = await editNote('note-1', 'new body')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/deleted/i)
  })

  it('rejects when caller is not the author', async () => {
    vi.mocked(dbNotes.getNote).mockResolvedValueOnce(
      makeNote({ authorId: 'other-user' }),
    )
    const { editNote } = await getActions()
    const result = await editNote('note-1', 'new body')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/author/i)
    expect(dbNotes.editNote).not.toHaveBeenCalled()
  })

  it('rejects empty body', async () => {
    vi.mocked(dbNotes.getNote).mockResolvedValueOnce(makeNote())
    const { editNote } = await getActions()
    const result = await editNote('note-1', '   ')
    expect(result.success).toBe(false)
  })

  it('edits note when author matches session', async () => {
    vi.mocked(dbNotes.getNote).mockResolvedValueOnce(makeNote())
    vi.mocked(dbNotes.editNote).mockResolvedValueOnce(makeNote())
    const { editNote } = await getActions()
    const result = await editNote('note-1', 'updated body')
    expect(result.success).toBe(true)
    expect(dbNotes.editNote).toHaveBeenCalledWith({
      noteId: 'note-1',
      editor: expect.objectContaining({ id: 'user-1' }),
      newBody: 'updated body',
    })
    expect(appendAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'note_edited' }),
    )
  })
})

describe('deleteNote', () => {
  it('rejects non-author', async () => {
    vi.mocked(dbNotes.getNote).mockResolvedValueOnce(
      makeNote({ authorId: 'other-user' }),
    )
    const { deleteNote } = await getActions()
    const result = await deleteNote('note-1')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/author/i)
    expect(dbNotes.deleteNote).not.toHaveBeenCalled()
  })

  it('is idempotent when note is already deleted', async () => {
    vi.mocked(dbNotes.getNote).mockResolvedValueOnce(
      makeNote({ deletedAt: new Date().toISOString() }),
    )
    const { deleteNote } = await getActions()
    const result = await deleteNote('note-1')
    expect(result.success).toBe(true)
    expect(dbNotes.deleteNote).not.toHaveBeenCalled()
  })

  it('soft-deletes when author matches and logs audit', async () => {
    vi.mocked(dbNotes.getNote).mockResolvedValueOnce(makeNote())
    const { deleteNote } = await getActions()
    const result = await deleteNote('note-1')
    expect(result.success).toBe(true)
    expect(dbNotes.deleteNote).toHaveBeenCalledWith(
      'note-1',
      expect.objectContaining({ id: 'user-1' }),
    )
    expect(appendAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'note_deleted' }),
    )
  })
})

describe('listNoteRevisions', () => {
  it('returns unauthorized when no session', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(null)
    const { listNoteRevisions } = await getActions()
    const result = await listNoteRevisions('note-1')
    expect(result.success).toBe(false)
  })

  it('returns revisions from db helper', async () => {
    vi.mocked(dbNotes.listRevisions).mockResolvedValueOnce([])
    const { listNoteRevisions } = await getActions()
    const result = await listNoteRevisions('note-1')
    expect(result.success).toBe(true)
    expect(result.data).toEqual([])
  })
})
