import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
const getLocalControls = vi.fn()
const getLocalFindings = vi.fn()
const getLocalPoams = vi.fn()
const getLocalEngagementDetail = vi.fn()
const getLocalEngagementSummaries = vi.fn()

vi.mock('@/lib/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))
vi.mock('@/lib/local/controls', () => ({ getLocalControls: () => getLocalControls() }))
vi.mock('@/lib/local/findings', () => ({ getLocalFindings: () => getLocalFindings() }))
vi.mock('@/lib/local/ssp-assets-poam', () => ({ getLocalPoams: () => getLocalPoams() }))
vi.mock('@/lib/local/engagements', () => ({
  getLocalEngagementDetail: () => getLocalEngagementDetail(),
  getLocalEngagementSummaries: () => getLocalEngagementSummaries(),
}))

describe('lib/local/reports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getLocalControls.mockResolvedValue([
      { requirementId: '03.01.01', familyCode: 'AC', title: 'Auth', status: 'MET' },
      { requirementId: '03.01.02', familyCode: 'AC', title: 'Txn', status: 'NOT_ASSESSED' },
    ])
    getLocalFindings.mockResolvedValue([
      { requirementId: '03.01.01', determination: 'MET', methodExamine: true, methodInterview: false, methodTest: false, finding: 'ok', objectiveEvidence: null, deficiency: null, recommendation: null, riskLevel: null },
    ])
    getLocalPoams.mockResolvedValue([
      { title: 'P', description: 'd', riskLevel: 'LOW', status: 'OPEN', remediationPlan: 'plan', scheduledCompletionDate: '2026-07-01' },
    ])
    getLocalEngagementDetail.mockResolvedValue({ organizationName: 'Golden OSC', scheduledStartDate: '2026-06-01' })
    getLocalEngagementSummaries.mockResolvedValue([{ id: 'eng-1', status: 'IN_PROGRESS' }])
  })

  it('returns a DRAFT default report when none saved', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const { getLocalAssessmentReport } = await import('@/lib/local/reports')

    const report = await getLocalAssessmentReport('eng-1')

    expect(report).toMatchObject({ engagementId: 'eng-1', status: 'DRAFT' })
  })

  it('saveLocalAssessmentReport upserts the report', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }) // getLocalAssessmentReport read
    mockQuery.mockResolvedValueOnce({ rows: [] }) // upsert
    const { saveLocalAssessmentReport } = await import('@/lib/local/reports')

    const report = await saveLocalAssessmentReport('eng-1', { executiveSummary: 'summary' })

    expect(report).toMatchObject({ engagementId: 'eng-1', executiveSummary: 'summary' })
    expect(mockQuery.mock.calls[1][0]).toMatch(/INSERT INTO imp_assessment_report/)
  })

  it('assembles eMASS export data from local domains', async () => {
    const { getLocalEMassExport } = await import('@/lib/local/reports')

    const data = await getLocalEMassExport('eng-1')

    expect(data.organization).toBe('Golden OSC')
    expect(data.findings[0]).toMatchObject({ controlId: '03.01.01', familyCode: 'AC', title: 'Auth', determination: 'MET' })
    expect(data.poams[0]).toMatchObject({ title: 'P', riskLevel: 'LOW' })
  })

  it('assembles report data with computed stats', async () => {
    const { getLocalReport } = await import('@/lib/local/reports')

    const report = await getLocalReport('eng-1')

    expect(report.totalControls).toBe(2)
    expect(report.assessedControls).toBe(1)
    expect(report.stats).toMatchObject({ met: 1, notAssessed: 1 })
    expect(report.engagement.id).toBe('eng-1')
  })
})
