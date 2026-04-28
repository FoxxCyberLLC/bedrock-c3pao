import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
const mockClientQuery = vi.fn()
const mockClientRelease = vi.fn()
const mockGetClient = vi.fn(async () => ({
  query: mockClientQuery,
  release: mockClientRelease,
}))

vi.mock('@/lib/db', () => ({
  query: mockQuery,
  getClient: mockGetClient,
}))

const {
  insertOutsideEngagement,
  listOutsideEngagements,
  getOutsideEngagementById,
  updateOutsideEngagement,
  deleteOutsideEngagement,
  getOutsideEngagementLeadId,
} = await import('@/lib/db-outside-engagement')

const SAMPLE_ROW = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Acme L2 Outside Assessment',
  client_name: 'Acme Corp',
  client_poc_name: 'Jane Doe',
  client_poc_email: 'jane@acme.example',
  scope: 'Full L2 scope',
  target_level: 'L2' as const,
  status: 'PLANNING' as const,
  lead_assessor_id: 'assessor-1',
  lead_assessor_name: 'Lead Smith',
  scheduled_start_date: '2026-05-01',
  scheduled_end_date: '2026-05-31',
  created_by: 'user-1',
  created_at: '2026-04-27T00:00:00Z',
  updated_at: '2026-04-27T00:00:00Z',
}

describe('db-outside-engagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('insertOutsideEngagement', () => {
    it('inserts and returns the camelCase OutsideEngagement', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [SAMPLE_ROW], rowCount: 1 })
      const result = await insertOutsideEngagement({
        name: SAMPLE_ROW.name,
        clientName: SAMPLE_ROW.client_name,
        clientPocName: SAMPLE_ROW.client_poc_name,
        clientPocEmail: SAMPLE_ROW.client_poc_email,
        scope: SAMPLE_ROW.scope,
        targetLevel: 'L2',
        leadAssessorId: SAMPLE_ROW.lead_assessor_id,
        leadAssessorName: SAMPLE_ROW.lead_assessor_name,
        scheduledStartDate: '2026-05-01',
        scheduledEndDate: '2026-05-31',
        createdBy: 'user-1',
      })
      expect(result.kind).toBe('outside_osc')
      expect(result.id).toBe(SAMPLE_ROW.id)
      expect(result.clientName).toBe('Acme Corp')
      expect(result.clientPocEmail).toBe('jane@acme.example')
      expect(result.scheduledStartDate).toBe('2026-05-01')

      // Verify parameterized query
      expect(mockQuery).toHaveBeenCalledTimes(1)
      const sql = mockQuery.mock.calls[0][0] as string
      const params = mockQuery.mock.calls[0][1] as unknown[]
      expect(sql).toContain('INSERT INTO outside_engagements')
      expect(sql).toContain('RETURNING *')
      expect(params).toContain('Acme Corp')
      expect(params).toContain('user-1')
    })
  })

  describe('listOutsideEngagements', () => {
    it('returns mapped rows ordered by created_at', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [SAMPLE_ROW, SAMPLE_ROW], rowCount: 2 })
      const result = await listOutsideEngagements()
      expect(result).toHaveLength(2)
      expect(result[0].kind).toBe('outside_osc')
      const sql = mockQuery.mock.calls[0][0] as string
      expect(sql).toContain('FROM outside_engagements')
      expect(sql).toContain('ORDER BY created_at DESC')
    })

    it('returns empty array when no rows', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
      const result = await listOutsideEngagements()
      expect(result).toEqual([])
    })
  })

  describe('getOutsideEngagementById', () => {
    it('returns the engagement when found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [SAMPLE_ROW], rowCount: 1 })
      const result = await getOutsideEngagementById(SAMPLE_ROW.id)
      expect(result?.id).toBe(SAMPLE_ROW.id)
      expect(result?.kind).toBe('outside_osc')
      const params = mockQuery.mock.calls[0][1] as unknown[]
      expect(params).toEqual([SAMPLE_ROW.id])
    })

    it('returns null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
      const result = await getOutsideEngagementById('missing')
      expect(result).toBeNull()
    })
  })

  describe('updateOutsideEngagement', () => {
    it('builds a parameterized SET clause from the patch', async () => {
      const updated = { ...SAMPLE_ROW, status: 'IN_PROGRESS' as const, name: 'New name' }
      mockQuery.mockResolvedValueOnce({ rows: [updated], rowCount: 1 })

      const result = await updateOutsideEngagement(SAMPLE_ROW.id, {
        status: 'IN_PROGRESS',
        name: 'New name',
      })
      expect(result?.status).toBe('IN_PROGRESS')
      expect(result?.name).toBe('New name')

      const sql = mockQuery.mock.calls[0][0] as string
      expect(sql).toContain('UPDATE outside_engagements SET')
      expect(sql).toContain('status =')
      expect(sql).toContain('name =')
      expect(sql).toContain('updated_at = NOW()')
      expect(sql).toContain('RETURNING *')
    })

    it('returns null when row missing', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
      const result = await updateOutsideEngagement('missing', { status: 'IN_PROGRESS' })
      expect(result).toBeNull()
    })

    it('falls back to a get when patch is empty', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [SAMPLE_ROW], rowCount: 1 })
      const result = await updateOutsideEngagement(SAMPLE_ROW.id, {})
      expect(result?.id).toBe(SAMPLE_ROW.id)
      const sql = mockQuery.mock.calls[0][0] as string
      expect(sql).toContain('SELECT * FROM outside_engagements')
    })
  })

  describe('deleteOutsideEngagement', () => {
    it('runs a transactional sweep across 10 shared tables before deleting the engagement', async () => {
      mockClientQuery.mockReset()
      // BEGIN
      mockClientQuery.mockResolvedValueOnce({ rowCount: 0 })
      // 10 shared-table cleanups
      for (let i = 0; i < 10; i++) {
        mockClientQuery.mockResolvedValueOnce({ rowCount: 0 })
      }
      // Engagement delete returns rowCount 1
      mockClientQuery.mockResolvedValueOnce({ rowCount: 1 })
      // COMMIT
      mockClientQuery.mockResolvedValueOnce({ rowCount: 0 })

      const deleted = await deleteOutsideEngagement(SAMPLE_ROW.id)
      expect(deleted).toBe(true)

      const callSqls = mockClientQuery.mock.calls.map((c) => c[0] as string)
      expect(callSqls[0]).toBe('BEGIN')
      expect(callSqls.at(-1)).toBe('COMMIT')

      // Required cleanup tables
      const middle = callSqls.slice(1, -2).join(' | ')
      expect(middle).toContain('engagement_pins')
      expect(middle).toContain('engagement_tags')
      expect(middle).toContain('engagement_snoozes')
      expect(middle).toContain('engagement_schedule')
      expect(middle).toContain('assessment_note_revisions')
      expect(middle).toContain('assessment_notes')
      expect(middle).toContain('readiness_artifacts')
      expect(middle).toContain('readiness_checklist_items')
      expect(middle).toContain('readiness_audit_log')
      expect(middle).toContain('c3pao_internal_reviews')

      // Final delete is on outside_engagements
      const finalDelete = callSqls.at(-2)
      expect(finalDelete).toContain('DELETE FROM outside_engagements')

      expect(mockClientRelease).toHaveBeenCalled()
    })

    it('returns false when engagement not found and still commits', async () => {
      mockClientQuery.mockReset()
      mockClientQuery.mockResolvedValue({ rowCount: 0 })
      const deleted = await deleteOutsideEngagement('missing')
      expect(deleted).toBe(false)
    })

    it('rolls back on error and rethrows', async () => {
      mockClientQuery.mockReset()
      mockClientQuery.mockResolvedValueOnce({ rowCount: 0 }) // BEGIN
      mockClientQuery.mockRejectedValueOnce(new Error('boom'))
      mockClientQuery.mockResolvedValueOnce({ rowCount: 0 }) // ROLLBACK
      await expect(deleteOutsideEngagement(SAMPLE_ROW.id)).rejects.toThrow('boom')
      const callSqls = mockClientQuery.mock.calls.map((c) => c[0] as string)
      expect(callSqls).toContain('ROLLBACK')
    })
  })

  describe('getOutsideEngagementLeadId', () => {
    it('returns the lead_assessor_id when found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ lead_assessor_id: 'assessor-1' }],
        rowCount: 1,
      })
      const id = await getOutsideEngagementLeadId(SAMPLE_ROW.id)
      expect(id).toBe('assessor-1')
    })

    it('returns null when engagement not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
      const id = await getOutsideEngagementLeadId('missing')
      expect(id).toBeNull()
    })
  })
})
