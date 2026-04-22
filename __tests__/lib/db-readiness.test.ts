import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReadinessItemKey } from '@/lib/readiness-types'

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
  ensureItemsSeeded,
  getItems,
  getItemByKey,
  markItemComplete,
  unmarkItemComplete,
  waiveItem,
  unwaiveItem,
  addArtifact,
  removeArtifact,
  getArtifactContent,
} = await import('@/lib/db-readiness')

const ACTOR = { id: 'u1', email: 'u1@c3pao.test', name: 'Unit One' }
const ENG = 'eng-1'

function itemRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'item-uuid-1',
    engagement_id: ENG,
    item_key: 'contract_executed',
    status: 'not_started',
    completed_by: null,
    completed_by_email: null,
    completed_at: null,
    waived_by: null,
    waived_by_email: null,
    waived_at: null,
    waiver_reason: null,
    updated_at: new Date('2026-04-01T00:00:00Z').toISOString(),
    ...overrides,
  }
}

describe('db-readiness', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ensureItemsSeeded', () => {
    it('inserts 8 rows with ON CONFLICT DO NOTHING', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await ensureItemsSeeded(ENG)

      expect(mockQuery).toHaveBeenCalledTimes(1)
      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain('INSERT INTO readiness_checklist_items')
      expect(sql).toContain('ON CONFLICT (engagement_id, item_key) DO NOTHING')
      // 1 engagement_id + 8 item_keys = 9 params
      expect(params).toHaveLength(9)
      expect(params[0]).toBe(ENG)
    })
  })

  describe('getItems', () => {
    it('returns empty array when engagement has no items', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const out = await getItems(ENG)

      expect(out).toEqual([])
      expect(mockQuery).toHaveBeenCalledTimes(1)
    })

    it('joins artifacts onto items and orders by canonical key order', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          itemRow({ id: 'i-8', item_key: 'emass_uploaded' }),
          itemRow({ id: 'i-1', item_key: 'contract_executed' }),
          itemRow({ id: 'i-3', item_key: 'boe_confirmed' }),
        ],
        rowCount: 3,
      })
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'a-1',
            item_id: 'i-1',
            filename: 'contract.pdf',
            mime_type: 'application/pdf',
            size_bytes: '1234',
            description: null,
            uploaded_by: 'Alice',
            uploaded_by_email: 'alice@c3pao.test',
            uploaded_at: new Date('2026-04-10T00:00:00Z').toISOString(),
          },
        ],
        rowCount: 1,
      })

      const items = await getItems(ENG)

      expect(items.map((i) => i.itemKey)).toEqual([
        'contract_executed',
        'boe_confirmed',
        'emass_uploaded',
      ])
      expect(items[0].artifacts).toHaveLength(1)
      expect(items[0].artifacts[0].sizeBytes).toBe(1234)
      expect(items[1].artifacts).toHaveLength(0)
    })
  })

  describe('getItemByKey', () => {
    it('returns null when the item is not seeded', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const result = await getItemByKey(ENG, 'contract_executed')

      expect(result).toBeNull()
      expect(mockQuery).toHaveBeenCalledTimes(1)
    })

    it('returns the item with artifacts attached', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 })
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'a-1',
            item_id: 'item-uuid-1',
            filename: 'contract.pdf',
            mime_type: 'application/pdf',
            size_bytes: 10,
            description: 'signed',
            uploaded_by: 'Alice',
            uploaded_by_email: 'alice@c3pao.test',
            uploaded_at: new Date('2026-04-10T00:00:00Z'),
          },
        ],
        rowCount: 1,
      })

      const item = await getItemByKey(ENG, 'contract_executed')

      expect(item).not.toBeNull()
      expect(item?.itemKey).toBe('contract_executed')
      expect(item?.artifacts[0].description).toBe('signed')
    })
  })

  describe('markItemComplete', () => {
    it('updates status to complete and returns the refreshed item', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
      mockQuery.mockResolvedValueOnce({ rows: [itemRow({ status: 'complete' })], rowCount: 1 }) // SELECT item
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }) // SELECT artifacts

      const item = await markItemComplete(ENG, 'contract_executed', ACTOR)

      const [updateSql, updateParams] = mockQuery.mock.calls[0]
      expect(updateSql).toContain("SET status = 'complete'")
      expect(updateSql).toContain('completed_by = $3')
      expect(updateParams).toEqual([ENG, 'contract_executed', ACTOR.name, ACTOR.email])
      expect(item.status).toBe('complete')
    })
  })

  describe('unmarkItemComplete', () => {
    it('demotes to in_progress when artifacts exist', async () => {
      // requireItem (initial): SELECT item, SELECT artifacts
      mockQuery.mockResolvedValueOnce({ rows: [itemRow({ status: 'complete' })], rowCount: 1 })
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'a-1',
            item_id: 'item-uuid-1',
            filename: 'x',
            mime_type: 'text/plain',
            size_bytes: 1,
            description: null,
            uploaded_by: 'u',
            uploaded_by_email: 'u@x',
            uploaded_at: new Date().toISOString(),
          },
        ],
        rowCount: 1,
      })
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
      // requireItem (final)
      mockQuery.mockResolvedValueOnce({ rows: [itemRow({ status: 'in_progress' })], rowCount: 1 })
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const item = await unmarkItemComplete(ENG, 'contract_executed')

      const updateCall = mockQuery.mock.calls[2]
      expect(updateCall[1]).toEqual([ENG, 'contract_executed', 'in_progress'])
      expect(item.status).toBe('in_progress')
    })

    it('falls back to not_started when there are no artifacts', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [itemRow({ status: 'complete' })], rowCount: 1 })
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })
      mockQuery.mockResolvedValueOnce({ rows: [itemRow({ status: 'not_started' })], rowCount: 1 })
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const item = await unmarkItemComplete(ENG, 'contract_executed')

      expect(mockQuery.mock.calls[2][1]).toEqual([ENG, 'contract_executed', 'not_started'])
      expect(item.status).toBe('not_started')
    })

    it('throws when the item does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await expect(
        unmarkItemComplete(ENG, 'contract_executed' as ReadinessItemKey),
      ).rejects.toThrow(/not found/)
    })
  })

  describe('waiveItem', () => {
    it('updates to waived with reason and actor', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })
      mockQuery.mockResolvedValueOnce({ rows: [itemRow({ status: 'waived' })], rowCount: 1 })
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const item = await waiveItem(ENG, 'contract_executed', 'twenty-char reason xx', ACTOR)

      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain("SET status = 'waived'")
      expect(params).toEqual([
        ENG,
        'contract_executed',
        ACTOR.name,
        ACTOR.email,
        'twenty-char reason xx',
      ])
      expect(item.status).toBe('waived')
    })
  })

  describe('unwaiveItem', () => {
    it('returns to in_progress when artifacts exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [itemRow({ status: 'waived' })], rowCount: 1 })
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'a-1',
            item_id: 'item-uuid-1',
            filename: 'x',
            mime_type: 'text/plain',
            size_bytes: 1,
            description: null,
            uploaded_by: 'u',
            uploaded_by_email: 'u@x',
            uploaded_at: new Date().toISOString(),
          },
        ],
        rowCount: 1,
      })
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })
      mockQuery.mockResolvedValueOnce({ rows: [itemRow({ status: 'in_progress' })], rowCount: 1 })
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const item = await unwaiveItem(ENG, 'contract_executed')

      expect(mockQuery.mock.calls[2][1]).toEqual([ENG, 'contract_executed', 'in_progress'])
      expect(item.status).toBe('in_progress')
    })
  })

  describe('addArtifact', () => {
    it('runs in a transaction and advances status to in_progress', async () => {
      mockClientQuery.mockImplementation(async (sql: string) => {
        if (sql === 'BEGIN') return { rows: [] }
        if (sql === 'COMMIT') return { rows: [] }
        if (sql.includes('INSERT INTO readiness_artifacts')) {
          return {
            rows: [
              {
                id: 'a-new',
                item_id: 'item-uuid-1',
                filename: 'f.pdf',
                mime_type: 'application/pdf',
                size_bytes: 99,
                description: null,
                uploaded_by: ACTOR.name,
                uploaded_by_email: ACTOR.email,
                uploaded_at: new Date('2026-04-10T00:00:00Z').toISOString(),
              },
            ],
          }
        }
        return { rows: [] }
      })

      const out = await addArtifact('item-uuid-1', {
        filename: 'f.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 99,
        content: Buffer.from('hello'),
        uploadedBy: ACTOR.name,
        uploadedByEmail: ACTOR.email,
      })

      const sqls = mockClientQuery.mock.calls.map((c: unknown[]) => c[0] as string)
      expect(sqls).toContain('BEGIN')
      expect(sqls).toContain('COMMIT')
      expect(sqls.some((s) => s.includes("SET status = 'in_progress'"))).toBe(true)
      expect(out.id).toBe('a-new')
      expect(mockClientRelease).toHaveBeenCalled()
    })

    it('rolls back on error', async () => {
      mockClientQuery.mockImplementation(async (sql: string) => {
        if (sql === 'BEGIN') return { rows: [] }
        if (sql.includes('INSERT INTO readiness_artifacts')) {
          throw new Error('insert failed')
        }
        return { rows: [] }
      })

      await expect(
        addArtifact('item-uuid-1', {
          filename: 'f.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 10,
          content: Buffer.from('x'),
          uploadedBy: ACTOR.name,
          uploadedByEmail: ACTOR.email,
        }),
      ).rejects.toThrow(/insert failed/)

      const sqls = mockClientQuery.mock.calls.map((c: unknown[]) => c[0] as string)
      expect(sqls).toContain('ROLLBACK')
      expect(mockClientRelease).toHaveBeenCalled()
    })
  })

  describe('removeArtifact', () => {
    it('deletes by id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      await removeArtifact('a-1')

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM readiness_artifacts'),
        ['a-1'],
      )
    })
  })

  describe('getArtifactContent', () => {
    it('returns null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const out = await getArtifactContent('missing')

      expect(out).toBeNull()
    })

    it('returns filename, mimetype, and buffer content', async () => {
      const buf = Buffer.from('binary data')
      mockQuery.mockResolvedValueOnce({
        rows: [{ filename: 'f.pdf', mime_type: 'application/pdf', content: buf }],
        rowCount: 1,
      })

      const out = await getArtifactContent('a-1')

      expect(out).toEqual({ filename: 'f.pdf', mimeType: 'application/pdf', content: buf })
    })
  })
})
