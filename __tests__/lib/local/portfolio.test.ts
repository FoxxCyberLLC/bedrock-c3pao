import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
const getLocalEngagementSummaries = vi.fn()
const getLocalObjectives = vi.fn()

vi.mock('@/lib/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))
vi.mock('@/lib/local/engagements', () => ({ getLocalEngagementSummaries: () => getLocalEngagementSummaries() }))
vi.mock('@/lib/local/objectives', () => ({ getLocalObjectives: () => getLocalObjectives() }))

describe('lib/local/portfolio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getLocalEngagementSummaries.mockResolvedValue([
      { id: 'e1', packageName: 'P1', organizationName: 'O1', status: 'IN_PROGRESS', leadAssessorId: null, leadAssessorName: null, scheduledStartDate: null, scheduledEndDate: null, assessmentResult: null, createdAt: '', updatedAt: '' },
    ])
    getLocalObjectives.mockResolvedValue([{ status: 'MET' }, { status: 'NOT_ASSESSED' }])
  })

  it('builds a portfolio row with locally-computed objective progress', async () => {
    const { getLocalPortfolioList } = await import('@/lib/local/portfolio')
    const list = await getLocalPortfolioList()
    expect(list[0]).toMatchObject({ id: 'e1', packageName: 'P1', objectivesTotal: 2, objectivesAssessed: 1 })
  })

  it('computes portfolio stats (active count) from the local list', async () => {
    const { getLocalPortfolioStats } = await import('@/lib/local/portfolio')
    const stats = await getLocalPortfolioStats()
    expect(stats.activeCount).toBe(1)
    expect(stats.throughputLast8Weeks).toHaveLength(8)
  })

  it('computes per-assessor workload from local accounts + team assignments', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'a1', name: 'Lead', email: 'l@c3.test', role: 'lead_assessor', assigned: 2 }],
    })
    const { getLocalWorkload } = await import('@/lib/local/portfolio')
    const workload = await getLocalWorkload()
    expect(workload[0]).toMatchObject({ assessorId: 'a1', isLeadAssessor: true, activeEngagements: 2 })
  })
})
