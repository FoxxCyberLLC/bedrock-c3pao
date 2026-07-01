import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
vi.mock('@/lib/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))

describe('lib/local/collab', () => {
  beforeEach(() => vi.clearAllMocks())

  it('COLLAB_SCHEMA_DDL creates notes, check-ins, and comments tables', async () => {
    const { COLLAB_SCHEMA_DDL } = await import('@/lib/local/collab')
    expect(COLLAB_SCHEMA_DDL).toContain('CREATE TABLE IF NOT EXISTS local_engagement_notes')
    expect(COLLAB_SCHEMA_DDL).toContain('CREATE TABLE IF NOT EXISTS local_engagement_checkins')
    expect(COLLAB_SCHEMA_DDL).toContain('CREATE TABLE IF NOT EXISTS local_engagement_comments')
  })

  it('creates and lists notes', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }) // insert
    const collab = await import('@/lib/local/collab')

    const note = await collab.createLocalNote('eng-1', 'observed X', { id: 'u1', name: 'Assessor' })

    expect(note).toMatchObject({ engagementId: 'eng-1', content: 'observed X', authorId: 'u1', authorName: 'Assessor' })
    expect(mockQuery.mock.calls[0][0]).toMatch(/INSERT INTO local_engagement_notes/)
  })

  it('lists notes newest first from the local table', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'n1', engagement_id: 'eng-1', content: 'c', author_id: 'u1', author_name: 'A', created_at: '2026-06-01T00:00:00Z' }],
    })
    const { getLocalNotes } = await import('@/lib/local/collab')

    const notes = await getLocalNotes('eng-1')

    expect(notes[0]).toMatchObject({ id: 'n1', content: 'c', authorName: 'A' })
    expect(mockQuery.mock.calls[0][0]).toContain('local_engagement_notes')
  })

  it('creates a check-in', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const { createLocalCheckin } = await import('@/lib/local/collab')

    const checkin = await createLocalCheckin('eng-1', { title: 'Day 1', description: 'kickoff' }, 'Lead')

    expect(checkin).toMatchObject({ title: 'Day 1', description: 'kickoff', authorName: 'Lead' })
    expect(mockQuery.mock.calls[0][0]).toMatch(/INSERT INTO local_engagement_checkins/)
  })

  it('merges imported and local comments, sorted by createdAt', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ data: { id: 'imp-1', engagementId: 'eng-1', content: 'osc note', visibility: 'INTERNAL', createdAt: '2026-06-01', updatedAt: '2026-06-01', mentions: [] } }] })
      .mockResolvedValueOnce({ rows: [{ id: 'loc-1', engagement_id: 'eng-1', c3pao_id: 'c1', author_id: 'u1', author_name: 'A', content: 'assessor note', mentions: [], parent_id: null, visibility: 'INTERNAL', created_at: '2026-06-02', updated_at: '2026-06-02' }] })
    const { getLocalComments } = await import('@/lib/local/collab')

    const comments = await getLocalComments('eng-1')

    expect(comments.map((c) => c.id)).toEqual(['imp-1', 'loc-1'])
    expect(mockQuery.mock.calls[0][0]).toContain('imp_engagement_comment')
    expect(mockQuery.mock.calls[1][0]).toContain('local_engagement_comments')
  })

  it('creates a local comment with defaults', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const { createLocalComment } = await import('@/lib/local/collab')

    const comment = await createLocalComment('eng-1', { content: 'hi' }, { c3paoId: 'c1', id: 'u1', name: 'A' })

    expect(comment).toMatchObject({ content: 'hi', visibility: 'INTERNAL', mentions: [], parentId: null })
  })
})
