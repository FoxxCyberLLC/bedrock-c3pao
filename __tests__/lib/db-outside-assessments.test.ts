import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()

vi.mock('@/lib/db', () => ({
  query: mockQuery,
  getClient: vi.fn(),
}))

const {
  mergeOutsideControlsWithCatalog,
  mergeOutsideObjectivesWithCatalog,
  outsideUpdateObjectiveStatus,
  recomputeControlStatus,
  uploadOutsideEvidence,
  listOutsideEvidence,
  deleteOutsideEvidence,
  getOutsideEvidenceContent,
  linkEvidenceToObjective,
  unlinkEvidenceFromObjective,
  listObjectivesForEvidence,
  listEvidenceForObjective,
  EVIDENCE_MAX_BYTES,
} = await import('@/lib/db-outside-assessments')

const ENG = '11111111-1111-4111-8111-111111111111'

describe('mergeOutsideControlsWithCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 110 controls when no DB rows exist (all NOT_ASSESSED)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    const result = await mergeOutsideControlsWithCatalog(ENG)
    expect(result).toHaveLength(110)
    expect(result.every((c) => c.status === 'NOT_ASSESSED')).toBe(true)
    expect(result.every((c) => c.cmmcLevel === 'L2')).toBe(true)
  })

  it('overrides catalog defaults with DB row data', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          engagement_id: ENG,
          requirement_id: 'AC.L2-3.1.1',
          status: 'MET',
          notes: 'Verified via policy + interviews',
          updated_at: new Date('2026-04-27'),
          version: 2,
        },
      ],
      rowCount: 1,
    })
    const result = await mergeOutsideControlsWithCatalog(ENG)
    const target = result.find((c) => c.requirementId === 'AC.L2-3.1.1')
    expect(target?.status).toBe('MET')
    expect(target?.assessmentNotes).toBe('Verified via policy + interviews')
  })

  it('returns ControlView shape with all required fields populated', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    const result = await mergeOutsideControlsWithCatalog(ENG)
    const sample = result[0]
    expect(sample.id).toBeTruthy()
    expect(sample.requirementId).toMatch(/^[A-Z]{2}\.L2-/)
    expect(sample.familyCode).toMatch(/^[A-Z]{2}$/)
    expect(sample.familyName).toBeTruthy()
    expect(typeof sample.sortOrder).toBe('number')
  })
})

describe('mergeOutsideObjectivesWithCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns at least 110 objectives when no DB rows exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    const result = await mergeOutsideObjectivesWithCatalog(ENG)
    expect(result.length).toBeGreaterThanOrEqual(110)
    expect(result.every((o) => o.status === 'NOT_ASSESSED')).toBe(true)
  })

  it('overrides default objective with DB-row data', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          engagement_id: ENG,
          requirement_id: 'AC.L2-3.1.1',
          objective_id: 'AC.L2-3.1.1.a',
          status: 'MET',
          assessment_notes: 'Verified',
          evidence_description: null,
          artifacts_reviewed: null,
          interviewees: null,
          examine_description: null,
          test_description: null,
          time_to_assess_minutes: 30,
          official_assessor_id: 'lead-1',
          official_assessed_at: new Date('2026-04-27'),
          version: 1,
          updated_at: new Date('2026-04-27'),
        },
      ],
      rowCount: 1,
    })
    const result = await mergeOutsideObjectivesWithCatalog(ENG)
    const target = result.find((o) => o.objectiveId === 'AC.L2-3.1.1.a')
    expect(target?.status).toBe('MET')
    expect(target?.assessmentNotes).toBe('Verified')
    expect(target?.timeToAssessMinutes).toBe(30)
    expect(target?.officialAssessorId).toBe('lead-1')
    expect(target?.version).toBe(1)
  })
})

describe('outsideUpdateObjectiveStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns "updated" when UPDATE matches a row at expected version', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ version: 2 }], rowCount: 1 })
    const result = await outsideUpdateObjectiveStatus(ENG, 'AC.L2-3.1.1.a', {
      requirementId: 'AC.L2-3.1.1',
      status: 'MET',
      expectedVersion: 1,
    })
    expect(result.status).toBe('updated')
    expect(result.newVersion).toBe(2)
    expect(mockQuery).toHaveBeenCalledTimes(1)
    const sql = mockQuery.mock.calls[0][0] as string
    expect(sql).toContain('UPDATE outside_objective_assessments')
    expect(sql).toContain('version = version + 1')
  })

  it('returns "inserted" when UPDATE finds no row and INSERT succeeds', async () => {
    // UPDATE returns no rows
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    // INSERT returns a row with version 1
    mockQuery.mockResolvedValueOnce({ rows: [{ version: 1 }], rowCount: 1 })
    const result = await outsideUpdateObjectiveStatus(ENG, 'AC.L2-3.1.1.a', {
      requirementId: 'AC.L2-3.1.1',
      status: 'MET',
      expectedVersion: 0,
    })
    expect(result.status).toBe('inserted')
    expect(result.newVersion).toBe(1)
    expect(mockQuery).toHaveBeenCalledTimes(2)
    const insertSql = mockQuery.mock.calls[1][0] as string
    expect(insertSql).toContain('INSERT INTO outside_objective_assessments')
    expect(insertSql).toContain('ON CONFLICT (engagement_id, objective_id) DO NOTHING')
  })

  it('returns "conflict" when UPDATE finds no row and INSERT hits an existing row', async () => {
    // UPDATE returns no rows (version mismatch)
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    // INSERT hit conflict, returns no rows
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    const result = await outsideUpdateObjectiveStatus(ENG, 'AC.L2-3.1.1.a', {
      requirementId: 'AC.L2-3.1.1',
      status: 'MET',
      expectedVersion: 5,
    })
    expect(result.status).toBe('conflict')
  })
})

describe('recomputeControlStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns NOT_ASSESSED when there are no objective rows', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // SELECT statuses
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // UPSERT
    const result = await recomputeControlStatus(ENG, 'AC.L2-3.1.1', 'lead-1')
    expect(result).toBe('NOT_ASSESSED')
  })

  it('returns NOT_MET when any objective is NOT_MET', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ status: 'MET' }, { status: 'NOT_MET' }, { status: 'MET' }],
        rowCount: 3,
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
    const result = await recomputeControlStatus(ENG, 'AC.L2-3.1.1', 'lead-1')
    expect(result).toBe('NOT_MET')
  })

  it('returns NOT_ASSESSED when any objective is still NOT_ASSESSED (and none NOT_MET)', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ status: 'MET' }, { status: 'NOT_ASSESSED' }],
        rowCount: 2,
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
    const result = await recomputeControlStatus(ENG, 'AC.L2-3.1.1', 'lead-1')
    expect(result).toBe('NOT_ASSESSED')
  })

  it('returns MET when all objectives are MET', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ status: 'MET' }, { status: 'MET' }],
        rowCount: 2,
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
    const result = await recomputeControlStatus(ENG, 'AC.L2-3.1.1', 'lead-1')
    expect(result).toBe('MET')
  })

  it('returns NOT_APPLICABLE when all objectives are NOT_APPLICABLE', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ status: 'NOT_APPLICABLE' }, { status: 'NOT_APPLICABLE' }],
        rowCount: 2,
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
    const result = await recomputeControlStatus(ENG, 'AC.L2-3.1.1', 'lead-1')
    expect(result).toBe('NOT_APPLICABLE')
  })

  it('UPSERTs the derived status into outside_control_assessments', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'MET' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
    await recomputeControlStatus(ENG, 'AC.L2-3.1.1', 'lead-1')
    const upsertSql = mockQuery.mock.calls[1][0] as string
    expect(upsertSql).toContain('INSERT INTO outside_control_assessments')
    expect(upsertSql).toContain('ON CONFLICT (engagement_id, requirement_id)')
    expect(upsertSql).toContain('DO UPDATE')
  })
})

describe('uploadOutsideEvidence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects content larger than 25MB', async () => {
    const big = Buffer.alloc(EVIDENCE_MAX_BYTES + 1)
    await expect(
      uploadOutsideEvidence({
        engagementId: ENG,
        fileName: 'big.pdf',
        mimeType: 'application/pdf',
        content: big,
        description: null,
        uploadedBy: 'lead-1',
        uploadedByEmail: 'lead@x',
      }),
    ).rejects.toThrow(/25MB/i)
  })

  it('rejects disallowed mime types', async () => {
    await expect(
      uploadOutsideEvidence({
        engagementId: ENG,
        fileName: 'evil.html',
        mimeType: 'text/html',
        content: Buffer.from('<script>'),
        description: null,
        uploadedBy: 'lead-1',
        uploadedByEmail: 'lead@x',
      }),
    ).rejects.toThrow(/not allowed/i)
  })

  it('inserts allowed evidence and returns the metadata', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'ev-1', file_name: 'p.pdf', mime_type: 'application/pdf', size_bytes: 12 }],
      rowCount: 1,
    })
    const result = await uploadOutsideEvidence({
      engagementId: ENG,
      fileName: 'p.pdf',
      mimeType: 'application/pdf',
      content: Buffer.from('hello world!'),
      description: 'AC policy',
      uploadedBy: 'lead-1',
      uploadedByEmail: 'lead@x',
    })
    expect(result.id).toBe('ev-1')
    expect(result.fileName).toBe('p.pdf')
    const sql = mockQuery.mock.calls[0][0] as string
    expect(sql).toContain('INSERT INTO outside_evidence')
  })
})

describe('list / delete / get evidence content', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listOutsideEvidence returns mapped rows', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'ev-1',
          engagement_id: ENG,
          file_name: 'p.pdf',
          mime_type: 'application/pdf',
          size_bytes: '1024',
          description: null,
          uploaded_by: 'lead-1',
          uploaded_by_email: 'lead@x',
          uploaded_at: new Date('2026-04-27'),
        },
      ],
      rowCount: 1,
    })
    const result = await listOutsideEvidence(ENG)
    expect(result).toHaveLength(1)
    expect(result[0].fileName).toBe('p.pdf')
    expect(result[0].fileSize).toBe(1024)
  })

  it('deleteOutsideEvidence returns true when a row was deleted', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })
    const ok = await deleteOutsideEvidence(ENG, 'ev-1')
    expect(ok).toBe(true)
  })

  it('deleteOutsideEvidence returns false when no row matched', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    const ok = await deleteOutsideEvidence(ENG, 'missing')
    expect(ok).toBe(false)
  })

  it('getOutsideEvidenceContent returns the buffer + metadata', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          engagement_id: ENG,
          file_name: 'p.pdf',
          mime_type: 'application/pdf',
          size_bytes: 5,
          content: Buffer.from('hello'),
        },
      ],
      rowCount: 1,
    })
    const result = await getOutsideEvidenceContent('ev-1')
    expect(result?.fileName).toBe('p.pdf')
    expect(result?.engagementId).toBe(ENG)
    expect(result?.content?.toString()).toBe('hello')
  })

  it('getOutsideEvidenceContent returns null when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    expect(await getOutsideEvidenceContent('missing')).toBeNull()
  })
})

describe('evidence-objective links', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('linkEvidenceToObjective uses ON CONFLICT DO NOTHING (idempotent)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })
    await linkEvidenceToObjective('ev-1', 'AC.L2-3.1.1.a', 'lead-1')
    const sql = mockQuery.mock.calls[0][0] as string
    expect(sql).toContain('INSERT INTO outside_evidence_objective_links')
    expect(sql).toContain('ON CONFLICT')
    expect(sql).toContain('DO NOTHING')
  })

  it('unlinkEvidenceFromObjective returns true when a link was deleted', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })
    const ok = await unlinkEvidenceFromObjective('ev-1', 'AC.L2-3.1.1.a')
    expect(ok).toBe(true)
  })

  it('unlinkEvidenceFromObjective returns false when no link existed', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    expect(await unlinkEvidenceFromObjective('ev-1', 'missing')).toBe(false)
  })

  it('listObjectivesForEvidence returns objective_id strings', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ objective_id: 'AC.L2-3.1.1.a' }, { objective_id: 'AT.L2-3.2.1.a' }],
      rowCount: 2,
    })
    const result = await listObjectivesForEvidence('ev-1')
    expect(result).toEqual(['AC.L2-3.1.1.a', 'AT.L2-3.2.1.a'])
  })

  it('listEvidenceForObjective joins evidence + links', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'ev-1',
          engagement_id: ENG,
          file_name: 'p.pdf',
          mime_type: 'application/pdf',
          size_bytes: 1,
          description: null,
          uploaded_by: 'lead-1',
          uploaded_by_email: 'lead@x',
          uploaded_at: new Date('2026-04-27'),
        },
      ],
      rowCount: 1,
    })
    const result = await listEvidenceForObjective(ENG, 'AC.L2-3.1.1.a')
    expect(result).toHaveLength(1)
    const sql = mockQuery.mock.calls[0][0] as string
    expect(sql).toContain('JOIN outside_evidence_objective_links')
  })
})
