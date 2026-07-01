import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
vi.mock('@/lib/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))

// Mirrors the golden-fixture AssessmentEngagement contract (JSONB `data`).
const ENGAGEMENT = {
  id: 'eng-golden-0001',
  customerId: 'cust-golden-1',
  atoPackageId: 'pkg-golden-0001',
  c3paoId: 'c3pao-golden-1',
  leadAssessorId: null,
  status: 'IN_PROGRESS',
  accessLevel: 'FULL',
  targetLevel: 'LEVEL_2',
  requestedDate: '2026-05-01T00:00:00.000Z',
  acceptedDate: '2026-05-03T00:00:00.000Z',
  scheduledStartDate: '2026-06-01T00:00:00.000Z',
  scheduledEndDate: '2026-06-15T00:00:00.000Z',
  actualStartDate: null,
  actualCompletionDate: null,
  assessmentScope: 'Enclave A',
  assessmentNotes: null,
  assessmentResult: null,
  findingsCount: 1,
  poamRequired: false,
  assessmentModeActive: true,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-06-10T00:00:00.000Z',
}

const joinRow = {
  edata: ENGAGEMENT,
  package_name: 'Golden Package',
  organization_name: 'Golden OSC',
}

describe('lib/local/engagements', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps imported engagements to EngagementSummary joined across package + org', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [joinRow] })
    const { getLocalEngagementSummaries } = await import('@/lib/local/engagements')

    const list = await getLocalEngagementSummaries()

    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({
      id: 'eng-golden-0001',
      atoPackageId: 'pkg-golden-0001',
      status: 'IN_PROGRESS',
      targetLevel: 'LEVEL_2',
      assessmentModeActive: true,
      findingsCount: 1,
      poamRequired: false,
      leadAssessorId: null,
      packageName: 'Golden Package',
      organizationName: 'Golden OSC',
    })
    // reads from the imported snapshot tables, not the Go API
    const sql = mockQuery.mock.calls[0][0] as string
    expect(sql).toContain('imp_assessment_engagement')
    expect(sql).toContain('imp_ato_package')
    expect(sql).toContain('imp_organization')
  })

  it('returns the detail row with resolved names, scoped by id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [joinRow] })
    const { getLocalEngagementDetail } = await import('@/lib/local/engagements')

    const detail = await getLocalEngagementDetail('eng-golden-0001')

    expect(detail).toMatchObject({
      id: 'eng-golden-0001',
      status: 'IN_PROGRESS',
      packageName: 'Golden Package',
      organizationName: 'Golden OSC',
    })
    expect(mockQuery.mock.calls[0][1]).toEqual(['eng-golden-0001'])
  })

  it('returns null when the engagement is not imported', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const { getLocalEngagementDetail } = await import('@/lib/local/engagements')

    expect(await getLocalEngagementDetail('missing')).toBeNull()
  })
})
