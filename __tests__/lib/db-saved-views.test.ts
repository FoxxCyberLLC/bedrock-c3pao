import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()

vi.mock('@/lib/db', () => ({
  query: mockQuery,
}))

const {
  listSavedViews,
  createSavedView,
  updateSavedView,
  deleteSavedView,
} = await import('@/lib/db-saved-views')

const USER = 'user-1'

function viewRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'view-uuid-1',
    user_id: USER,
    name: 'My View',
    filter: { phase: 'ASSESS' },
    created_at: new Date('2026-04-01T00:00:00Z').toISOString(),
    ...overrides,
  }
}

describe('db-saved-views', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listSavedViews', () => {
    it('returns rows for the current user only, ordered by created_at ASC', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          viewRow({ id: 'v1', name: 'A' }),
          viewRow({ id: 'v2', name: 'B' }),
        ],
        rowCount: 2,
      })

      const views = await listSavedViews(USER)

      expect(views).toHaveLength(2)
      expect(views[0].name).toBe('A')
      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain('WHERE user_id = $1')
      expect(sql).toContain('ORDER BY created_at ASC')
      expect(params).toEqual([USER])
    })

    it('returns empty array when no rows', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
      expect(await listSavedViews(USER)).toEqual([])
    })
  })

  describe('createSavedView', () => {
    it('inserts and returns the row with id', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [viewRow({ id: 'new-view-id', name: 'Saved A' })],
        rowCount: 1,
      })

      const created = await createSavedView({
        userId: USER,
        name: 'Saved A',
        filter: { phase: 'ASSESS', pinnedOnly: true },
      })

      expect(created.id).toBe('new-view-id')
      expect(created.name).toBe('Saved A')
      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain('INSERT INTO engagement_saved_views')
      expect(sql).toContain('VALUES ($1, $2, $3::jsonb)')
      expect(sql).toContain('RETURNING')
      expect(params[0]).toBe(USER)
      expect(params[1]).toBe('Saved A')
      expect(JSON.parse(params[2] as string)).toEqual({ phase: 'ASSESS', pinnedOnly: true })
    })
  })

  describe('updateSavedView', () => {
    it('applies a name-only patch (user-scoped)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [viewRow({ name: 'Renamed' })],
        rowCount: 1,
      })

      const out = await updateSavedView({
        id: 'view-uuid-1',
        userId: USER,
        patch: { name: 'Renamed' },
      })

      expect(out.name).toBe('Renamed')
      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain('UPDATE engagement_saved_views')
      expect(sql).toContain('SET name = $1')
      expect(sql).not.toContain('filter = ')
      expect(sql).toContain('WHERE id = $2 AND user_id = $3')
      expect(params).toEqual(['Renamed', 'view-uuid-1', USER])
    })

    it('applies a filter-only patch', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [viewRow({ filter: { phase: 'REPORT' } })],
        rowCount: 1,
      })

      const out = await updateSavedView({
        id: 'view-uuid-1',
        userId: USER,
        patch: { filter: { phase: 'REPORT' } },
      })

      expect(out.filter).toEqual({ phase: 'REPORT' })
      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain('SET filter = $1::jsonb')
      expect(sql).not.toMatch(/SET .*name = /)
      expect(JSON.parse(params[0] as string)).toEqual({ phase: 'REPORT' })
    })

    it('applies a combined name+filter patch', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [viewRow({ name: 'New Name', filter: { phase: 'CLOSE_OUT' } })],
        rowCount: 1,
      })

      await updateSavedView({
        id: 'view-uuid-1',
        userId: USER,
        patch: { name: 'New Name', filter: { phase: 'CLOSE_OUT' } },
      })

      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain('SET name = $1, filter = $2::jsonb')
      expect(sql).toContain('WHERE id = $3 AND user_id = $4')
      expect(params[0]).toBe('New Name')
      expect(JSON.parse(params[1] as string)).toEqual({ phase: 'CLOSE_OUT' })
      expect(params[2]).toBe('view-uuid-1')
      expect(params[3]).toBe(USER)
    })

    it('throws when updating a non-existent or other-user-owned view', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await expect(
        updateSavedView({
          id: 'view-uuid-1',
          userId: USER,
          patch: { name: 'X' },
        }),
      ).rejects.toThrow(/not found/)
    })

    it('is a no-op SELECT when the patch is empty', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [viewRow()],
        rowCount: 1,
      })

      const out = await updateSavedView({
        id: 'view-uuid-1',
        userId: USER,
        patch: {},
      })

      const [sql] = mockQuery.mock.calls[0]
      expect(sql).toContain('SELECT')
      expect(sql).not.toContain('UPDATE')
      expect(out.id).toBe('view-uuid-1')
    })
  })

  describe('deleteSavedView', () => {
    it('deletes scoped by id and user_id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      await deleteSavedView('view-uuid-1', USER)

      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain('DELETE FROM engagement_saved_views')
      expect(sql).toContain('WHERE id = $1 AND user_id = $2')
      expect(params).toEqual(['view-uuid-1', USER])
    })

    it('is a no-op when deleting another user`s view (rowCount 0)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await expect(deleteSavedView('view-uuid-1', 'someone-else')).resolves.toBeUndefined()
    })
  })
})
