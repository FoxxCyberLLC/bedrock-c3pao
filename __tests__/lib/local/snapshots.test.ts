import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
const getLocalObjectives = vi.fn()
const setLocalEngagementStatus = vi.fn()

vi.mock('@/lib/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))
vi.mock('@/lib/local/objectives', () => ({ getLocalObjectives: () => getLocalObjectives() }))
vi.mock('@/lib/local/engagements', () => ({
  setLocalEngagementStatus: (...a: unknown[]) => setLocalEngagementStatus(...a),
}))

describe('lib/local/snapshots', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setLocalEngagementStatus.mockResolvedValue(undefined)
  })

  it('lists snapshots newest-version-first, mapping the view', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ data: { id: 'snap-2', engagementId: 'eng-1', version: 2, determination: 'CONDITIONAL_LEVEL_2', isCurrent: true } }],
    })
    const { getLocalSnapshots } = await import('@/lib/local/snapshots')

    const snaps = await getLocalSnapshots('eng-1')

    expect(snaps[0]).toMatchObject({ id: 'snap-2', version: 2, determination: 'CONDITIONAL_LEVEL_2', isCurrent: true })
    expect(mockQuery.mock.calls[0][0]).toContain('imp_assessment_snapshot')
  })

  it('lists a snapshot’s per-objective children scoped by snapshotId', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ data: { id: 'o1', snapshotId: 'snap-2', objectiveId: '03.01.01.a', status: 'MET', evidenceIds: ['e1'] } }],
    })
    const { getLocalSnapshotObjectives } = await import('@/lib/local/snapshots')

    const objs = await getLocalSnapshotObjectives('eng-1', 'snap-2')

    expect(objs[0]).toMatchObject({ objectiveId: '03.01.01.a', status: 'MET', evidenceIds: ['e1'] })
    expect(mockQuery.mock.calls[0][1]).toEqual(['eng-1', 'snap-2'])
  })

  it('captures a determination snapshot and moves the engagement to AWAITING_OSC_CORRECTIONS', async () => {
    getLocalObjectives.mockResolvedValue([
      { requirementId: '03.01.01', objectiveReference: '03.01.01.a', status: 'MET', assessmentNotes: null, evidenceDescription: null, inheritedStatus: null },
    ])
    mockQuery
      .mockResolvedValueOnce({ rows: [{ v: 0 }] }) // max version
      .mockResolvedValueOnce({ rows: [] }) // supersede prior current
      .mockResolvedValueOnce({ rows: [] }) // insert snapshot
      .mockResolvedValueOnce({ rows: [] }) // insert objective snapshot
    const { startLocalCorrectionOpportunity } = await import('@/lib/local/snapshots')

    const result = await startLocalCorrectionOpportunity('eng-1', { id: 'u1', name: 'Lead' })

    expect(result.version).toBe(1)
    expect(result.snapshotId).toBe('local-snap-eng-1-1')
    const sqls = mockQuery.mock.calls.map((c) => c[0] as string)
    expect(sqls.some((q) => q.includes('INSERT INTO imp_assessment_snapshot'))).toBe(true)
    expect(sqls.some((q) => q.includes('INSERT INTO imp_objective_status_snapshot'))).toBe(true)
    expect(setLocalEngagementStatus).toHaveBeenCalledWith('eng-1', { status: 'AWAITING_OSC_CORRECTIONS' })
  })

  it('resumeLocalReEvaluation re-opens the assessment', async () => {
    const { resumeLocalReEvaluation } = await import('@/lib/local/snapshots')

    await resumeLocalReEvaluation('eng-1')

    expect(setLocalEngagementStatus).toHaveBeenCalledWith('eng-1', { status: 'IN_PROGRESS' })
  })
})
