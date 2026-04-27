import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()

vi.mock('@/lib/db', () => ({
  query: mockQuery,
}))

const {
  listTagsForEngagement,
  listAllTagsByEngagement,
  listAllLabels,
  addTag,
  removeTag,
} = await import('@/lib/db-tags')

const ENG = 'eng-1'

function tagRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    engagement_id: ENG,
    label: 'urgent',
    color: 'rose',
    created_by: 'user-1',
    created_at: new Date('2026-04-01T00:00:00Z').toISOString(),
    ...overrides,
  }
}

describe('db-tags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listTagsForEngagement', () => {
    it('returns tags filtered by engagement_id, ordered by label', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          tagRow({ label: 'audit-blocked', color: 'amber' }),
          tagRow({ label: 'urgent', color: 'rose' }),
        ],
        rowCount: 2,
      })

      const tags = await listTagsForEngagement(ENG)

      expect(tags).toHaveLength(2)
      expect(tags[0].label).toBe('audit-blocked')
      expect(tags[1].label).toBe('urgent')
      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain('FROM engagement_tags')
      expect(sql).toContain('WHERE engagement_id = $1')
      expect(sql).toContain('ORDER BY label ASC')
      expect(params).toEqual([ENG])
    })

    it('returns empty array when no tags', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
      expect(await listTagsForEngagement(ENG)).toEqual([])
    })
  })

  describe('listAllTagsByEngagement', () => {
    it('groups rows by engagement_id in a single query', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          tagRow({ engagement_id: 'eng-A', label: 'alpha' }),
          tagRow({ engagement_id: 'eng-A', label: 'beta' }),
          tagRow({ engagement_id: 'eng-B', label: 'gamma' }),
        ],
        rowCount: 3,
      })

      const grouped = await listAllTagsByEngagement()

      expect(mockQuery).toHaveBeenCalledTimes(1)
      expect(Object.keys(grouped)).toEqual(['eng-A', 'eng-B'])
      expect(grouped['eng-A']).toHaveLength(2)
      expect(grouped['eng-A'].map((t) => t.label)).toEqual(['alpha', 'beta'])
      expect(grouped['eng-B']).toHaveLength(1)
      expect(grouped['eng-B'][0].label).toBe('gamma')
    })

    it('returns empty object when there are no tags', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
      expect(await listAllTagsByEngagement()).toEqual({})
    })
  })

  describe('listAllLabels', () => {
    it('runs a DISTINCT query and returns labels alphabetically', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { label: 'audit-blocked' },
          { label: 'in-review' },
          { label: 'urgent' },
        ],
        rowCount: 3,
      })

      const labels = await listAllLabels()

      expect(labels).toEqual(['audit-blocked', 'in-review', 'urgent'])
      const [sql] = mockQuery.mock.calls[0]
      expect(sql).toContain('SELECT DISTINCT label')
      expect(sql).toContain('ORDER BY label ASC')
    })
  })

  describe('addTag', () => {
    it('upserts and returns the resulting row', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [tagRow({ label: 'urgent', color: 'rose' })],
        rowCount: 1,
      })

      const tag = await addTag({
        engagementId: ENG,
        label: 'urgent',
        color: 'rose',
        createdBy: 'user-1',
      })

      expect(tag.engagementId).toBe(ENG)
      expect(tag.label).toBe('urgent')
      expect(tag.color).toBe('rose')
      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain('INSERT INTO engagement_tags')
      expect(sql).toContain('ON CONFLICT (engagement_id, label) DO UPDATE')
      expect(sql).toContain('SET color = EXCLUDED.color')
      expect(sql).toContain('created_by = EXCLUDED.created_by')
      expect(sql).toContain('RETURNING')
      expect(params).toEqual([ENG, 'urgent', 'rose', 'user-1'])
    })

    it('returns the row with the updated color when re-adding the same label', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [tagRow({ label: 'urgent', color: 'amber' })], // updated color
        rowCount: 1,
      })

      const tag = await addTag({
        engagementId: ENG,
        label: 'urgent',
        color: 'amber',
        createdBy: 'user-2',
      })

      expect(tag.color).toBe('amber')
    })
  })

  describe('removeTag', () => {
    it('deletes scoped by engagement_id and label', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      await removeTag(ENG, 'urgent')

      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain('DELETE FROM engagement_tags')
      expect(sql).toContain('WHERE engagement_id = $1 AND label = $2')
      expect(params).toEqual([ENG, 'urgent'])
    })

    it('does not throw when the tag does not exist (idempotent)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
      await expect(removeTag(ENG, 'nope')).resolves.toBeUndefined()
    })
  })
})
