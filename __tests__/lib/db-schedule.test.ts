import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()

vi.mock('@/lib/db', () => ({
  query: mockQuery,
  getClient: vi.fn(),
}))

const { getSchedule, upsertSchedule } = await import('@/lib/db-schedule')

const ACTOR = { id: 'u1', email: 'u1@c3pao.test', name: 'Unit One' }

function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    engagement_id: 'eng-1',
    kickoff_date: '2026-05-01',
    onsite_start: null,
    onsite_end: null,
    interview_schedule: null,
    deliverable_due_dates: null,
    phase_1_target: null,
    phase_2_target: null,
    phase_3_target: null,
    location_notes: null,
    updated_at: new Date('2026-04-20T00:00:00Z'),
    updated_by: ACTOR.name,
    ...overrides,
  }
}

describe('db-schedule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSchedule', () => {
    it('returns null when no schedule row exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const out = await getSchedule('eng-1')

      expect(out).toBeNull()
      expect(mockQuery.mock.calls[0][1]).toEqual(['eng-1'])
    })

    it('maps snake_case columns to camelCase and formats dates', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [row({ kickoff_date: new Date('2026-05-01T00:00:00Z') })],
        rowCount: 1,
      })

      const sched = await getSchedule('eng-1')

      expect(sched).not.toBeNull()
      expect(sched?.engagementId).toBe('eng-1')
      expect(sched?.kickoffDate).toBe('2026-05-01')
      expect(sched?.updatedAt).toBe('2026-04-20T00:00:00.000Z')
      expect(sched?.updatedBy).toBe(ACTOR.name)
    })
  })

  describe('upsertSchedule', () => {
    it('inserts only the fields in the patch + metadata', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [row({ kickoff_date: '2026-05-01', onsite_start: '2026-06-01' })],
        rowCount: 1,
      })

      await upsertSchedule({
        engagementId: 'eng-1',
        actor: ACTOR,
        patch: { kickoffDate: '2026-05-01', onsiteStart: '2026-06-01' },
      })

      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain('INSERT INTO engagement_schedule')
      expect(sql).toContain('ON CONFLICT (engagement_id) DO UPDATE')
      expect(sql).toContain('kickoff_date = EXCLUDED.kickoff_date')
      expect(sql).toContain('onsite_start = EXCLUDED.onsite_start')
      expect(sql).toContain('updated_at = NOW()')
      // engagementId, actor.name, kickoffDate, onsiteStart = 4 params
      expect(params).toEqual(['eng-1', ACTOR.name, '2026-05-01', '2026-06-01'])
    })

    it('returns mapped schedule after upsert', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [row({ location_notes: 'Building B' })],
        rowCount: 1,
      })

      const out = await upsertSchedule({
        engagementId: 'eng-1',
        actor: ACTOR,
        patch: { locationNotes: 'Building B' },
      })

      expect(out.locationNotes).toBe('Building B')
      expect(out.engagementId).toBe('eng-1')
    })

    it('handles empty patch (metadata-only update)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [row()], rowCount: 1 })

      await upsertSchedule({
        engagementId: 'eng-1',
        actor: ACTOR,
        patch: {},
      })

      const params = mockQuery.mock.calls[0][1]
      expect(params).toEqual(['eng-1', ACTOR.name])
    })

    it('ignores unknown patch keys rather than corrupting SQL', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [row()], rowCount: 1 })

      await upsertSchedule({
        engagementId: 'eng-1',
        actor: ACTOR,
        patch: {
          kickoffDate: '2026-05-01',
          // @ts-expect-error intentionally bogus key
          notARealField: 'hacker input',
        },
      })

      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).not.toContain('notARealField')
      expect(sql).not.toContain('not_a_real_field')
      // engagementId, actor.name, kickoffDate = 3 params (unknown field dropped)
      expect(params).toEqual(['eng-1', ACTOR.name, '2026-05-01'])
    })
  })
})
