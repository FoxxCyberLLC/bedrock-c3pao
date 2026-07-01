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

  it('setLocalEngagementStatus merges a JSONB patch into the engagement row', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const { setLocalEngagementStatus } = await import('@/lib/local/engagements')

    await setLocalEngagementStatus('eng-1', { status: 'COMPLETED', resultNotes: 'done' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toMatch(/UPDATE imp_assessment_engagement/)
    expect(sql).toMatch(/data \|\| \$2::jsonb/)
    expect(params[0]).toBe('eng-1')
    const patch = JSON.parse(params[1] as string)
    expect(patch).toMatchObject({ status: 'COMPLETED', resultNotes: 'done' })
    expect(patch.updatedAt).toBeDefined()
  })

  it('setLocalAssessmentMode records the mode + start timestamp', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const { setLocalAssessmentMode } = await import('@/lib/local/engagements')

    await setLocalAssessmentMode('eng-1', true)

    const patch = JSON.parse(mockQuery.mock.calls[0][1][1] as string)
    expect(patch.assessmentModeActive).toBe(true)
    expect(patch.assessmentModeStartedAt).toBeTruthy()
  })

  it('getLocalEngagementPhase projects the phase fields from the engagement row', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ data: { currentPhase: 'ASSESS', certStatus: 'PENDING' } }],
    })
    const { getLocalEngagementPhase } = await import('@/lib/local/engagements')

    const phase = await getLocalEngagementPhase('eng-1')

    expect(phase).toMatchObject({ currentPhase: 'ASSESS', certStatus: 'PENDING' })
    expect(phase).toHaveProperty('outBriefDate', null)
  })

  it('getLocalEngagementLifecycle derives an ordered timeline from date fields', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        edata: {
          id: 'eng-1',
          requestedDate: '2026-05-01T00:00:00.000Z',
          acceptedDate: '2026-05-03T00:00:00.000Z',
          actualStartDate: null,
        },
        package_name: 'P',
        organization_name: 'O',
      }],
    })
    const { getLocalEngagementLifecycle } = await import('@/lib/local/engagements')

    const events = await getLocalEngagementLifecycle('eng-1')

    expect(events.map((e) => e.type)).toEqual(['REQUESTED', 'ACCEPTED'])
    expect(events[0].date < events[1].date).toBe(true)
  })
})
