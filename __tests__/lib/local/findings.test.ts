import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
vi.mock('@/lib/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))

describe('lib/local/findings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists findings for the engagement, newest first', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ data: { id: 'f1', requirementId: '03.01.01', determination: 'NOT_MET' } }] })
    const { getLocalFindings } = await import('@/lib/local/findings')

    const findings = await getLocalFindings('eng-1')

    expect(findings[0]).toMatchObject({ id: 'f1', requirementId: '03.01.01', determination: 'NOT_MET' })
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('imp_assessment_finding')
    expect(params).toEqual(['eng-1'])
  })

  it('creates a finding row with version 1 and default review fields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const { createLocalFinding } = await import('@/lib/local/findings')

    const finding = await createLocalFinding('eng-1', { requirementId: '03.01.01', determination: 'NOT_MET', methodExamine: true })

    expect(finding).toMatchObject({ requirementId: '03.01.01', determination: 'NOT_MET', methodExamine: true, version: 1, reviewStatus: null })
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toMatch(/INSERT INTO imp_assessment_finding/)
    expect(params[1]).toBe('eng-1')
  })

  it('updates a finding, bumping version', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ data: { id: 'f1', determination: 'NOT_MET', version: 2 } }] })
      .mockResolvedValueOnce({ rows: [] })
    const { updateLocalFinding } = await import('@/lib/local/findings')

    const finding = await updateLocalFinding('eng-1', 'f1', { determination: 'MET' })

    expect(finding).toMatchObject({ determination: 'MET', version: 3 })
    expect(mockQuery.mock.calls[1][0]).toMatch(/UPDATE imp_assessment_finding/)
  })

  it('returns null when updating a finding that does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const { updateLocalFinding } = await import('@/lib/local/findings')
    expect(await updateLocalFinding('eng-1', 'missing', { determination: 'MET' })).toBeNull()
  })

  it('records a QA review verdict', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ data: { id: 'f1', version: 1 } }] })
      .mockResolvedValueOnce({ rows: [] })
    const { reviewLocalFinding } = await import('@/lib/local/findings')

    const finding = await reviewLocalFinding('eng-1', 'f1', { status: 'APPROVED', notes: 'ok' })

    expect(finding).toMatchObject({ reviewStatus: 'APPROVED', reviewNotes: 'ok' })
    const patch = JSON.parse(mockQuery.mock.calls[1][1][1] as string)
    expect(patch.reviewedAt).toBeTruthy()
  })
})
