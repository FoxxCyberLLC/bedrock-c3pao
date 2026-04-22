import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
vi.mock('@/lib/db', () => ({
  query: mockQuery,
  getClient: vi.fn(),
}))

const { appendAudit, getAuditLog } = await import('@/lib/db-audit')

const ACTOR = { id: 'u1', email: 'u1@c3pao.test', name: 'Unit One' }

describe('db-audit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('appendAudit', () => {
    it('inserts a row with actor + action + serialized details', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      await appendAudit({
        engagementId: 'eng-1',
        itemId: 'item-1',
        actor: ACTOR,
        action: 'item_completed',
        details: { itemKey: 'contract_executed' },
      })

      expect(mockQuery).toHaveBeenCalledTimes(1)
      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain('INSERT INTO readiness_audit_log')
      expect(params).toEqual([
        'eng-1',
        'item-1',
        ACTOR.id,
        ACTOR.email,
        ACTOR.name,
        'item_completed',
        JSON.stringify({ itemKey: 'contract_executed' }),
      ])
    })

    it('writes null item_id and null details when omitted', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      await appendAudit({
        engagementId: 'eng-1',
        actor: ACTOR,
        action: 'phase_advanced',
      })

      const params = mockQuery.mock.calls[0][1]
      expect(params[1]).toBeNull()
      expect(params[6]).toBeNull()
    })

    it('rethrows db errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db down'))

      await expect(
        appendAudit({ engagementId: 'e', actor: ACTOR, action: 'note_created' }),
      ).rejects.toThrow('db down')
    })
  })

  describe('getAuditLog', () => {
    it('defaults to limit 500, engagement filter, newest first', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await getAuditLog('eng-1')

      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain('FROM readiness_audit_log')
      expect(sql).toContain('WHERE engagement_id = $1')
      expect(sql).toContain('ORDER BY created_at DESC')
      expect(sql).toContain('LIMIT $2')
      expect(params).toEqual(['eng-1', 500])
    })

    it('accepts itemId filter and custom limit', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await getAuditLog('eng-1', { itemId: 'item-9', limit: 50 })

      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain('AND item_id = $2')
      expect(sql).toContain('LIMIT $3')
      expect(params).toEqual(['eng-1', 'item-9', 50])
    })

    it('maps rows to AuditEntry camelCase', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'a1',
            engagement_id: 'eng-1',
            item_id: null,
            actor_id: ACTOR.id,
            actor_email: ACTOR.email,
            actor_name: ACTOR.name,
            action: 'note_created',
            details: { len: 42 },
            created_at: new Date('2026-04-22T00:00:00Z'),
          },
        ],
        rowCount: 1,
      })

      const [entry] = await getAuditLog('eng-1')

      expect(entry).toEqual({
        id: 'a1',
        engagementId: 'eng-1',
        itemId: null,
        actorId: ACTOR.id,
        actorEmail: ACTOR.email,
        actorName: ACTOR.name,
        action: 'note_created',
        details: { len: 42 },
        createdAt: '2026-04-22T00:00:00.000Z',
      })
    })
  })
})
