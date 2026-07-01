import { describe, it, expect, vi, beforeEach } from 'vitest'

const isOffline = vi.fn()
const fetchAssessments = vi.fn()
const getLocalEngagementSummaries = vi.fn()
const getLocalEngagementDetail = vi.fn()

vi.mock('@/lib/mode', () => ({ isOffline: () => isOffline() }))
vi.mock('@/lib/auth', () => ({ requireAuth: vi.fn().mockResolvedValue({ apiToken: '', c3paoUser: { id: 'u1' } }) }))
vi.mock('@/lib/local/engagements', () => ({
  getLocalEngagementSummaries: () => getLocalEngagementSummaries(),
  getLocalEngagementDetail: (id: string) => getLocalEngagementDetail(id),
}))
vi.mock('@/lib/local/controls', () => ({ getLocalControls: vi.fn().mockResolvedValue([]) }))
vi.mock('@/lib/local/objectives', () => ({ getLocalObjectives: vi.fn().mockResolvedValue([]) }))
vi.mock('@/lib/api-client', () => ({
  fetchAssessments: (...a: unknown[]) => fetchAssessments(...a),
  fetchEngagementDetail: vi.fn(),
  fetchControls: vi.fn().mockRejectedValue(new Error('offline')),
  fetchObjectives: vi.fn().mockRejectedValue(new Error('offline')),
  fetchEvidence: vi.fn().mockRejectedValue(new Error('offline')),
  fetchPOAMs: vi.fn().mockRejectedValue(new Error('offline')),
  fetchSSP: vi.fn().mockRejectedValue(new Error('offline')),
  fetchTeam: vi.fn(),
  fetchSTIGs: vi.fn(),
  fetchSnapshots: vi.fn(),
  fetchC3PAOUsers: vi.fn(),
  startCorrectionOpportunity: vi.fn(),
  resumeReEvaluation: vi.fn(),
}))
vi.mock('@/lib/engagement/shape-control', () => ({
  groupObjectivesByRequirement: () => ({}),
  shapeControl: (c: unknown) => c,
}))

describe('engagements actions — offline dispatch (Task 11)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isOffline.mockReturnValue(true)
  })

  it('getC3PAOEngagements reads the local snapshot, never the Go API, when offline', async () => {
    getLocalEngagementSummaries.mockResolvedValue([{ id: 'eng-1', status: 'IN_PROGRESS' }])
    const { getC3PAOEngagements } = await import('@/app/actions/engagements')

    const res = await getC3PAOEngagements()

    expect(res.success).toBe(true)
    expect(res.data?.[0]).toMatchObject({ id: 'eng-1' })
    expect(getLocalEngagementSummaries).toHaveBeenCalled()
    expect(fetchAssessments).not.toHaveBeenCalled()
  })

  it('getEngagementById loads the detail locally offline (sub-domains degrade to empty)', async () => {
    getLocalEngagementDetail.mockResolvedValue({
      id: 'eng-1',
      status: 'IN_PROGRESS',
      targetLevel: 'LEVEL_2',
      atoPackageId: 'pkg-1',
      packageName: 'Golden Package',
      organizationName: 'Golden OSC',
    })
    const { getEngagementById } = await import('@/app/actions/engagements')

    const res = await getEngagementById('eng-1')

    expect(res.success).toBe(true)
    expect(res.data.id).toBe('eng-1')
    expect(res.data.atoPackage.name).toBe('Golden Package')
    expect(res.data.atoPackage.requirementStatuses).toEqual([])
    expect(getLocalEngagementDetail).toHaveBeenCalledWith('eng-1')
  })

  it('getEngagementById reports not-found when the engagement was never imported', async () => {
    getLocalEngagementDetail.mockResolvedValue(null)
    const { getEngagementById } = await import('@/app/actions/engagements')

    const res = await getEngagementById('missing')

    expect(res.success).toBe(false)
    expect(res.error).toMatch(/not found/i)
  })
})
