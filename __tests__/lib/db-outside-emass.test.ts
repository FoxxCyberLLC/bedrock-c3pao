import { describe, it, expect, vi, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'

const mockGetById = vi.fn()
const mockMergeControls = vi.fn()
const mockMergeObjectives = vi.fn()
const mockGetInstanceConfig = vi.fn()

vi.mock('@/lib/db-outside-engagement', () => ({
  getOutsideEngagementById: mockGetById,
}))

vi.mock('@/lib/db-outside-assessments', () => ({
  mergeOutsideControlsWithCatalog: mockMergeControls,
  mergeOutsideObjectivesWithCatalog: mockMergeObjectives,
}))

vi.mock('@/lib/instance-config', () => ({
  getInstanceConfig: mockGetInstanceConfig,
}))

const { buildOutsideEMASSExportData } = await import('@/lib/db-outside-emass')

const ENG_ID = '11111111-1111-4111-8111-111111111111'

const SAMPLE_ENG = {
  id: ENG_ID,
  kind: 'outside_osc' as const,
  name: 'Acme L2 Outside Assessment',
  clientName: 'Acme Corp',
  clientPocName: 'Jane Doe',
  clientPocEmail: 'jane@acme.example',
  scope: 'Full L2 scope statement',
  targetLevel: 'L2' as const,
  status: 'IN_PROGRESS' as const,
  leadAssessorId: 'assessor-1',
  leadAssessorName: 'Lead Smith',
  scheduledStartDate: '2026-05-01',
  scheduledEndDate: '2026-05-31',
  createdBy: 'user-1',
  createdAt: '2026-04-27T00:00:00Z',
  updatedAt: '2026-04-27T00:00:00Z',
}

function makeControl(reqId: string, status: string) {
  return {
    id: reqId,
    requirementId: reqId,
    familyCode: reqId.slice(0, 2),
    familyName: 'Test Family',
    title: reqId,
    basicRequirement: '',
    cmmcLevel: 'L2',
    sortOrder: 1,
    status,
    implementationNotes: null,
    implementationType: null,
    processOwner: null,
    requirementStatusId: reqId,
    assessmentNotes: null,
  }
}

function makeObjective(objId: string, status: string, extras: Record<string, unknown> = {}) {
  return {
    id: objId,
    objectiveId: objId,
    objectiveReference: objId,
    requirementId: objId.slice(0, -2),
    familyCode: objId.slice(0, 2),
    familyName: 'Test Family',
    description: 'Primary',
    status,
    assessmentNotes: null,
    evidenceDescription: null,
    artifactsReviewed: null,
    interviewees: null,
    examineDescription: null,
    testDescription: null,
    timeToAssessMinutes: null,
    inheritedStatus: null,
    policyReference: null,
    procedureReference: null,
    implementationStatement: null,
    responsibilityDescription: null,
    assessorQuestionsForOSC: null,
    nistQuestionsForOSC: null,
    officialAssessment: false,
    officialAssessorId: null,
    officialAssessedAt: null,
    assessedBy: null,
    assessedAt: null,
    version: 1,
    editingById: null,
    editingByName: null,
    editingAt: null,
    oscStatus: null,
    oscInheritedStatus: null,
    oscImplementationStatement: null,
    oscEvidenceDescription: null,
    oscAssessmentNotes: null,
    oscPolicyReference: null,
    oscProcedureReference: null,
    oscResponsibilityDescription: null,
    evidenceMappings: [],
    espMappings: [],
    createdAt: '2026-04-27T00:00:00Z',
    updatedAt: '2026-04-27T00:00:00Z',
    ...extras,
  }
}

describe('buildOutsideEMASSExportData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when engagement not found', async () => {
    mockGetById.mockResolvedValueOnce(null)
    const result = await buildOutsideEMASSExportData(ENG_ID)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/not found/i)
  })

  it('aggregates controls and objectives counts correctly', async () => {
    mockGetById.mockResolvedValueOnce(SAMPLE_ENG)
    mockMergeControls.mockResolvedValueOnce([
      makeControl('AC.L2-3.1.1', 'MET'),
      makeControl('AC.L2-3.1.2', 'NOT_MET'),
      makeControl('AC.L2-3.1.3', 'NOT_ASSESSED'),
    ])
    mockMergeObjectives.mockResolvedValueOnce([
      makeObjective('AC.L2-3.1.1.a', 'MET'),
      makeObjective('AC.L2-3.1.2.a', 'NOT_MET'),
      makeObjective('AC.L2-3.1.3.a', 'NOT_ASSESSED'),
    ])
    mockGetInstanceConfig.mockResolvedValueOnce({ c3paoName: 'TestC3PAO' })

    const result = await buildOutsideEMASSExportData(ENG_ID)
    expect(result.success).toBe(true)
    const data = result.data!
    expect(data.requirements.total).toBe(3)
    expect(data.requirements.met).toBe(1)
    expect(data.requirements.notMet).toBe(1)
    expect(data.objectives.total).toBe(3)
    expect(data.objectives.assessed).toBe(2)
    expect(data.objectives.met).toBe(1)
    expect(data.objectives.notMet).toBe(1)
  })

  it('populates assessorOrganization from instance config', async () => {
    mockGetById.mockResolvedValueOnce(SAMPLE_ENG)
    mockMergeControls.mockResolvedValueOnce([])
    mockMergeObjectives.mockResolvedValueOnce([])
    mockGetInstanceConfig.mockResolvedValueOnce({ c3paoName: 'My C3PAO Inc.' })

    const result = await buildOutsideEMASSExportData(ENG_ID)
    expect(result.data!.rawData.exportData.assessorOrganization).toBe('My C3PAO Inc.')
  })

  it("falls back to 'Unknown C3PAO' + warning when instance config is missing", async () => {
    mockGetById.mockResolvedValueOnce(SAMPLE_ENG)
    mockMergeControls.mockResolvedValueOnce([])
    mockMergeObjectives.mockResolvedValueOnce([])
    mockGetInstanceConfig.mockResolvedValueOnce(null)

    const result = await buildOutsideEMASSExportData(ENG_ID)
    expect(result.data!.rawData.exportData.assessorOrganization).toBe('Unknown C3PAO')
    expect(result.data!.validation.warnings.some((w) => /C3PAO Name/.test(w))).toBe(true)
  })

  it('uses scope as systemName, falls back to engagement name when scope is null', async () => {
    mockGetById.mockResolvedValueOnce({ ...SAMPLE_ENG, scope: null })
    mockMergeControls.mockResolvedValueOnce([])
    mockMergeObjectives.mockResolvedValueOnce([])
    mockGetInstanceConfig.mockResolvedValueOnce({ c3paoName: 'C3PAO' })

    const result = await buildOutsideEMASSExportData(ENG_ID)
    expect(result.data!.rawData.exportData.systemName).toBe(SAMPLE_ENG.name)
  })

  it('truncates very long scope strings to 200 chars for systemName', async () => {
    const longScope = 'x'.repeat(500)
    mockGetById.mockResolvedValueOnce({ ...SAMPLE_ENG, scope: longScope })
    mockMergeControls.mockResolvedValueOnce([])
    mockMergeObjectives.mockResolvedValueOnce([])
    mockGetInstanceConfig.mockResolvedValueOnce({ c3paoName: 'C3PAO' })

    const result = await buildOutsideEMASSExportData(ENG_ID)
    expect(result.data!.rawData.exportData.systemName?.length).toBe(200)
  })

  it('populates required dates so cmmc-export validation gate passes', async () => {
    mockGetById.mockResolvedValueOnce(SAMPLE_ENG)
    mockMergeControls.mockResolvedValueOnce([])
    mockMergeObjectives.mockResolvedValueOnce([])
    mockGetInstanceConfig.mockResolvedValueOnce({ c3paoName: 'C3PAO' })

    const result = await buildOutsideEMASSExportData(ENG_ID)
    expect(result.data!.assessment.assessmentStartDate).toBe('2026-05-01')
    expect(result.data!.assessment.assessmentEndDate).toBe('2026-05-31')
    expect(result.data!.assessment.leadAssessorCPN).toBeTruthy()
    expect(result.data!.validation.errors).toEqual([])
  })

  it('produces a single-element team with the lead assessor', async () => {
    mockGetById.mockResolvedValueOnce(SAMPLE_ENG)
    mockMergeControls.mockResolvedValueOnce([])
    mockMergeObjectives.mockResolvedValueOnce([])
    mockGetInstanceConfig.mockResolvedValueOnce({ c3paoName: 'C3PAO' })

    const result = await buildOutsideEMASSExportData(ENG_ID)
    expect(result.data!.rawData.team).toHaveLength(1)
    expect(result.data!.rawData.team[0].role).toBe('LEAD')
    expect(result.data!.rawData.team[0].assessorId).toBe('assessor-1')
  })
})

describe('ExcelJS round-trip from outside aggregator output', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('produces a workbook the eMASS builder can render and ExcelJS can re-parse', async () => {
    mockGetById.mockResolvedValueOnce(SAMPLE_ENG)
    mockMergeControls.mockResolvedValueOnce([
      makeControl('AC.L2-3.1.1', 'MET'),
      makeControl('AC.L2-3.1.2', 'NOT_MET'),
    ])
    mockMergeObjectives.mockResolvedValueOnce([
      makeObjective('AC.L2-3.1.1.a', 'MET', {
        artifactsReviewed: 'AC Policy v3',
        interviewees: 'IT Lead',
        examineDescription: 'reviewed',
        testDescription: 'tested',
      }),
      makeObjective('AC.L2-3.1.2.a', 'NOT_MET'),
    ])
    mockGetInstanceConfig.mockResolvedValueOnce({ c3paoName: 'TestC3PAO Inc.' })

    const aggregated = await buildOutsideEMASSExportData(ENG_ID)
    expect(aggregated.success).toBe(true)

    const { buildEMASSWorkbook } = await import('@/lib/emass-workbook')
    const buffer = await buildEMASSWorkbook({
      controls: aggregated.data!.rawData.controls,
      objectives: aggregated.data!.rawData.objectives,
      exportData: aggregated.data!.rawData.exportData,
      team: aggregated.data!.rawData.team,
      ssp: aggregated.data!.ssp,
      wizardFields: {
        executiveSummary: 'Summary',
        standardsAcceptance: 'Accepted',
        hashValue: 'abc',
        hashedDataList: 'list',
      },
    })
    expect(buffer.byteLength).toBeGreaterThan(1000)

    const re = new ExcelJS.Workbook()
    await re.xlsx.load(buffer)
    const sheet = re.getWorksheet('Assessment Results')
    expect(sheet).toBeDefined()

    // Header rows include OSC Name and C3PAO Name with our values populated.
    const cells: string[] = []
    sheet?.eachRow((row) => {
      row.eachCell((cell) => {
        cells.push(String(cell.value ?? ''))
      })
    })
    expect(cells).toContain('Acme Corp')
    expect(cells).toContain('TestC3PAO Inc.')
  })
})
