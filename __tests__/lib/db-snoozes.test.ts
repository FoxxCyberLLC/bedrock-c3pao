import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()

vi.mock('@/lib/db', () => ({
  query: mockQuery,
}))

const { listActiveSnoozes, snooze, unsnooze } = await import('@/lib/db-snoozes')

const USER = 'user-1'
const ENG = 'eng-1'

describe('db-snoozes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listActiveSnoozes', () => {
    it('passes the explicit `now` value to the query and maps result rows', async () => {
      const now = new Date('2026-04-27T12:00:00Z')
      const future = new Date('2026-05-01T00:00:00Z').toISOString()
      mockQuery.mockResolvedValueOnce({
        rows: [{ engagement_id: 'eng-A', hidden_until: future, reason: 'on hold' }],
        rowCount: 1,
      })

      const out = await listActiveSnoozes(USER, now)

      expect(out).toEqual([
        { engagementId: 'eng-A', hiddenUntil: future, reason: 'on hold' },
      ])
      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain('FROM engagement_snoozes')
      expect(sql).toContain('hidden_until > $2')
      expect(params).toEqual([USER, now.toISOString()])
    })

    it('defaults `now` to current time when not provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const before = Date.now()
      await listActiveSnoozes(USER)
      const after = Date.now()

      const params = mockQuery.mock.calls[0][1] as unknown[]
      const usedNow = new Date(params[1] as string).getTime()
      expect(usedNow).toBeGreaterThanOrEqual(before)
      expect(usedNow).toBeLessThanOrEqual(after)
    })

    it('returns null reason when stored reason is null', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            engagement_id: ENG,
            hidden_until: new Date('2026-05-01T00:00:00Z'),
            reason: null,
          },
        ],
        rowCount: 1,
      })

      const out = await listActiveSnoozes(USER)
      expect(out[0].reason).toBeNull()
    })
  })

  describe('snooze', () => {
    it('upserts with ON CONFLICT DO UPDATE', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })
      const hiddenUntil = new Date('2026-05-01T00:00:00Z')

      await snooze({ userId: USER, engagementId: ENG, hiddenUntil, reason: 'pending docs' })

      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain('INSERT INTO engagement_snoozes')
      expect(sql).toContain('ON CONFLICT (user_id, engagement_id) DO UPDATE')
      expect(sql).toContain('hidden_until = EXCLUDED.hidden_until')
      expect(sql).toContain('reason = EXCLUDED.reason')
      expect(params).toEqual([USER, ENG, hiddenUntil.toISOString(), 'pending docs'])
    })

    it('writes null reason when omitted', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })
      const hiddenUntil = new Date('2026-05-01T00:00:00Z')

      await snooze({ userId: USER, engagementId: ENG, hiddenUntil })

      const params = mockQuery.mock.calls[0][1] as unknown[]
      expect(params[3]).toBeNull()
    })

    it('overwrites prior reason and date on re-snooze', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }) // first snooze
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }) // second snooze (upsert)
      const firstDate = new Date('2026-05-01T00:00:00Z')
      const secondDate = new Date('2026-06-01T00:00:00Z')

      await snooze({ userId: USER, engagementId: ENG, hiddenUntil: firstDate, reason: 'old' })
      await snooze({ userId: USER, engagementId: ENG, hiddenUntil: secondDate, reason: 'new' })

      const lastCall = mockQuery.mock.calls[1]
      expect(lastCall[1]).toEqual([USER, ENG, secondDate.toISOString(), 'new'])
    })
  })

  describe('unsnooze', () => {
    it('deletes scoped by user_id and engagement_id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      await unsnooze(USER, ENG)

      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain('DELETE FROM engagement_snoozes')
      expect(sql).toContain('WHERE user_id = $1 AND engagement_id = $2')
      expect(params).toEqual([USER, ENG])
    })

    it('does not throw when no snooze exists (idempotent)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
      await expect(unsnooze(USER, ENG)).resolves.toBeUndefined()
    })
  })
})
