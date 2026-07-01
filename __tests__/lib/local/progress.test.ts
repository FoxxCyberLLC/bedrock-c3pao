import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
const getLocalObjectives = vi.fn()
const getLocalEngagementDetail = vi.fn()

vi.mock('@/lib/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))
vi.mock('@/lib/local/objectives', () => ({ getLocalObjectives: () => getLocalObjectives() }))
vi.mock('@/lib/local/engagements', () => ({ getLocalEngagementDetail: (id: string) => getLocalEngagementDetail(id) }))

const objectives = [
  { familyCode: 'AC', familyName: 'Access Control', status: 'MET', assessedBy: 'a1' },
  { familyCode: 'AC', familyName: 'Access Control', status: 'NOT_MET', assessedBy: 'a1' },
  { familyCode: 'AU', familyName: 'Audit', status: 'NOT_ASSESSED', assessedBy: null },
]

describe('lib/local/progress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getLocalObjectives.mockResolvedValue(objectives)
  })

  it('computes daily progress totals from objective statuses', async () => {
    const { getLocalDailyProgress } = await import('@/lib/local/progress')
    const p = await getLocalDailyProgress('eng-1')
    expect(p).toMatchObject({ total: 3, met: 1, notMet: 1, notAssessed: 1, assessed: 2 })
  })

  it('computes per-domain progress', async () => {
    const { getLocalProgressByDomain } = await import('@/lib/local/progress')
    const domains = await getLocalProgressByDomain('eng-1')
    expect(domains).toHaveLength(2)
    const ac = domains.find((d) => d.familyCode === 'AC')
    expect(ac).toMatchObject({ total: 2, assessed: 2, met: 1, notMet: 1 })
  })

  it('computes per-assessor progress, skipping unassessed', async () => {
    const { getLocalProgressByAssessor } = await import('@/lib/local/progress')
    const byAssessor = await getLocalProgressByAssessor('eng-1')
    expect(byAssessor).toHaveLength(1)
    expect(byAssessor[0]).toMatchObject({ assessorId: 'a1', assessed: 2, met: 1, notMet: 1 })
  })

  it('reads planning from the engagement row', async () => {
    getLocalEngagementDetail.mockResolvedValue({ assessmentScope: 'Enclave', planningNotes: 'notes' })
    const { getLocalPlanning } = await import('@/lib/local/progress')
    const planning = await getLocalPlanning('eng-1')
    expect(planning).toMatchObject({ engagementId: 'eng-1', assessmentScope: 'Enclave', planningNotes: 'notes' })
  })

  it('updateLocalPlanning patches the engagement and drops engagementId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    getLocalEngagementDetail.mockResolvedValue({ assessmentScope: 'New scope' })
    const { updateLocalPlanning } = await import('@/lib/local/progress')

    await updateLocalPlanning('eng-1', { engagementId: 'eng-1', assessmentScope: 'New scope' })

    const patch = JSON.parse(mockQuery.mock.calls[0][1][1] as string)
    expect(patch.assessmentScope).toBe('New scope')
    expect(patch).not.toHaveProperty('engagementId')
  })

  it('acknowledgeLocalIntroduction stamps the engagement', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const { acknowledgeLocalIntroduction } = await import('@/lib/local/progress')

    await acknowledgeLocalIntroduction('eng-1')

    const patch = JSON.parse(mockQuery.mock.calls[0][1][1] as string)
    expect(patch.introductionAcknowledgedAt).toBeTruthy()
  })
})
