import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
vi.mock('@/lib/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))

// Joined catalog+status rows as the CONTROLS_SQL returns them.
const row = (over: Partial<Record<string, unknown>> = {}) => ({
  requirement_id: '03.01.01',
  family_code: 'AC',
  family_name: 'Access Control',
  title: 'Authorized Access Control',
  basic_requirement: 'Limit system access…',
  cmmc_level: 'LEVEL_2',
  sort_order: 1,
  rs_id: 'rs-1',
  rsdata: { id: 'rs-1', requirementId: '03.01.01', status: 'MET', assessmentNotes: 'ok' },
  ...over,
})

describe('lib/local/controls', () => {
  beforeEach(() => vi.clearAllMocks())

  it('merges the seeded catalog with imported requirement status, scoped by engagement', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [row()] })
    const { getLocalControls } = await import('@/lib/local/controls')

    const controls = await getLocalControls('eng-1')

    expect(controls[0]).toMatchObject({
      requirementId: '03.01.01',
      familyCode: 'AC',
      title: 'Authorized Access Control',
      status: 'MET',
      requirementStatusId: 'rs-1',
      assessmentNotes: 'ok',
    })
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('"Requirement"')
    expect(sql).toContain('imp_requirement_status')
    expect(sql).toContain("cmmcLevel\" = 'LEVEL_2'")
    expect(params).toEqual(['eng-1'])
  })

  it('defaults requirements with no imported status to NOT_ASSESSED', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [row({ rs_id: null, rsdata: null })] })
    const { getLocalControls } = await import('@/lib/local/controls')

    const controls = await getLocalControls('eng-1')

    expect(controls[0].status).toBe('NOT_ASSESSED')
    expect(controls[0].requirementStatusId).toBe('')
  })

  it('updateLocalControlNotes patches the imported status row by id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const { updateLocalControlNotes } = await import('@/lib/local/controls')

    await updateLocalControlNotes('rs-1', 'assessor note')

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toMatch(/UPDATE imp_requirement_status/)
    expect(params[0]).toBe('rs-1')
    expect(JSON.parse(params[1] as string)).toEqual({ assessmentNotes: 'assessor note' })
  })

  it('computes SPRS + domain stats: deducts point value for NOT_MET', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        row({ requirement_id: '03.01.01', rsdata: { status: 'MET' }, rs_id: 'a' }),
        // 03.01.03 has SPRS value 1 in requirement-values
        row({ requirement_id: '03.01.03', rsdata: { status: 'NOT_MET' }, rs_id: 'b' }),
        row({ requirement_id: '03.01.02', rsdata: null, rs_id: null }),
      ],
    })
    const { getLocalStats } = await import('@/lib/local/controls')

    const stats = await getLocalStats('eng-1')

    expect(stats.sprsMaxScore).toBe(110)
    expect(stats.pointsDeducted).toBe(1) // 03.01.03 = 1 point, NOT_MET
    expect(stats.sprsScore).toBe(109)
    expect(stats.totals).toMatchObject({ total: 3, met: 1, notMet: 1, notAssessed: 1 })
    expect(stats.domains[0].familyCode).toBe('AC')
  })
})
