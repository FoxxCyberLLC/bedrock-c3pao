import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()

vi.mock('@/lib/db', () => ({
  query: mockQuery,
}))

const { listPinnedIds, pin, unpin } = await import('@/lib/db-pins')

const USER = 'user-1'
const ENG = 'eng-1'

describe('db-pins', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listPinnedIds', () => {
    it('returns engagement_id values ordered by pinned_at DESC', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { engagement_id: 'eng-3' },
          { engagement_id: 'eng-2' },
          { engagement_id: 'eng-1' },
        ],
        rowCount: 3,
      })

      const out = await listPinnedIds(USER)

      expect(out).toEqual(['eng-3', 'eng-2', 'eng-1'])
      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain('SELECT engagement_id')
      expect(sql).toContain('FROM engagement_pins')
      expect(sql).toContain('WHERE user_id = $1')
      expect(sql).toContain('ORDER BY pinned_at DESC')
      expect(params).toEqual([USER])
    })

    it('returns empty array when there are no pins', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
      const out = await listPinnedIds(USER)
      expect(out).toEqual([])
    })
  })

  describe('pin', () => {
    it('inserts with ON CONFLICT DO NOTHING (idempotent)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      await pin(USER, ENG)

      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain('INSERT INTO engagement_pins')
      expect(sql).toContain('ON CONFLICT (user_id, engagement_id) DO NOTHING')
      expect(params).toEqual([USER, ENG])
    })

    it('does not throw when re-pinning the same engagement', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }) // conflict no-op

      await expect(pin(USER, ENG)).resolves.toBeUndefined()
    })
  })

  describe('unpin', () => {
    it('issues DELETE scoped by user_id and engagement_id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      await unpin(USER, ENG)

      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain('DELETE FROM engagement_pins')
      expect(sql).toContain('WHERE user_id = $1 AND engagement_id = $2')
      expect(params).toEqual([USER, ENG])
    })

    it('does not throw when removing a non-existent pin (idempotent)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await expect(unpin(USER, ENG)).resolves.toBeUndefined()
    })
  })
})
