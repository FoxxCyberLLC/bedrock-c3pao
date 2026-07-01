import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
vi.mock('@/lib/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))

const objectiveRow = (over: Partial<Record<string, unknown>> = {}) => ({
  objective_reference: '03.01.01.a',
  description: 'authorized users are identified',
  requirement_id: '03.01.01',
  family_code: 'AC',
  family_name: 'Access Control',
  os_id: 'os-1',
  osdata: { objectiveReference: '03.01.01.a', status: 'MET', assessmentNotes: 'ok', version: 2 },
  ...over,
})

describe('lib/local/objectives', () => {
  beforeEach(() => vi.clearAllMocks())

  it('merges the 321-objective catalog with imported status, scoped by engagement', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [objectiveRow()] })
    const { getLocalObjectives } = await import('@/lib/local/objectives')

    const objectives = await getLocalObjectives('eng-1')

    expect(objectives[0]).toMatchObject({
      objectiveReference: '03.01.01.a',
      requirementId: '03.01.01',
      familyCode: 'AC',
      description: 'authorized users are identified',
      status: 'MET',
      assessmentNotes: 'ok',
      version: 2,
    })
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('"AssessmentObjective"')
    expect(sql).toContain('imp_objective_status')
    expect(params).toEqual(['eng-1'])
  })

  it('defaults objectives with no imported status to NOT_ASSESSED with empty mappings', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [objectiveRow({ os_id: null, osdata: null })] })
    const { getLocalObjectives } = await import('@/lib/local/objectives')

    const [obj] = await getLocalObjectives('eng-1')

    expect(obj.status).toBe('NOT_ASSESSED')
    expect(obj.version).toBe(0)
    expect(obj.evidenceMappings).toEqual([])
    expect(obj.espMappings).toEqual([])
  })

  it('updateLocalObjective bumps version on an existing status row', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'os-1', ref: '03.01.01.a', version: 2 }] }) // find
      .mockResolvedValueOnce({ rows: [] }) // update
      .mockResolvedValueOnce({ rows: [objectiveRow({ osdata: { status: 'NOT_MET', version: 3 } })] }) // re-read
    const { updateLocalObjective } = await import('@/lib/local/objectives')

    const result = await updateLocalObjective('eng-1', '03.01.01.a', { status: 'NOT_MET' })

    const updateCall = mockQuery.mock.calls[1]
    expect(updateCall[0]).toMatch(/UPDATE imp_objective_status/)
    const patch = JSON.parse(updateCall[1][1] as string)
    expect(patch).toMatchObject({ status: 'NOT_MET', version: 3, objectiveReference: '03.01.01.a' })
    expect(result?.status).toBe('NOT_MET')
  })

  it('updateLocalObjective inserts a local status row when the objective is not in the snapshot', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // find → none
      .mockResolvedValueOnce({ rows: [] }) // insert
      .mockResolvedValueOnce({ rows: [objectiveRow({ osdata: { status: 'MET', version: 1 } })] }) // re-read
    const { updateLocalObjective } = await import('@/lib/local/objectives')

    await updateLocalObjective('eng-1', '03.05.02.b', { status: 'MET' })

    const insertCall = mockQuery.mock.calls[1]
    expect(insertCall[0]).toMatch(/INSERT INTO imp_objective_status/)
    const inserted = JSON.parse(insertCall[1][2] as string)
    expect(inserted).toMatchObject({ status: 'MET', version: 1, objectiveReference: '03.05.02.b' })
  })
})
