import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Task 23 — the CMMC L2 reference catalog. This is SEEDED reference data (110
 * requirements / 14 families / 321 NIST 800-171A objectives / CCI crosswalk) that
 * never travels in an OSC snapshot; imported ObjectiveStatus rows join against it.
 * Source of truth = the platform Go migrations 003-006, copied verbatim as assets.
 */

const DATA_DIR = path.resolve(__dirname, '../../../lib/reference/data')
const readAsset = (name: string): string => readFileSync(path.join(DATA_DIR, name), 'utf8')

describe('lib/reference/data assets (verbatim from platform migrations)', () => {
  it('families.sql seeds all 14 requirement families', () => {
    const sql = readAsset('families.sql')
    expect((sql.match(/^INSERT INTO "RequirementFamily"/gm) ?? []).length).toBe(14)
  })

  it('requirements.sql seeds all 110 CMMC L2 requirements', () => {
    const sql = readAsset('requirements.sql')
    expect((sql.match(/^INSERT INTO "Requirement"/gm) ?? []).length).toBe(110)
  })

  it('objectives.sql seeds all 321 NIST 800-171A assessment objectives', () => {
    // NB: the authoritative platform catalog is 321 objectives (the plan DoD's
    // "320" was an estimate); imported status rows must join the exact set.
    const sql = readAsset('objectives.sql')
    expect((sql.match(/^INSERT INTO "AssessmentObjective"/gm) ?? []).length).toBe(321)
  })

  it('cci-mappings.sql seeds the NIST 800-53 CCI crosswalk', () => {
    const sql = readAsset('cci-mappings.sql')
    expect((sql.match(/^INSERT INTO "CCIMapping"/gm) ?? []).length).toBe(3550)
  })

  it('objective 03.01.01.a carries examine/interview/test guidance text', () => {
    const sql = readAsset('objectives.sql')
    expect(sql).toContain("'03.01.01.a'")
    expect(sql).toContain('authorized users are identified')
  })
})

const mockQuery = vi.fn()

vi.mock('pg', () => ({
  Pool: function () {
    return { query: mockQuery, on: vi.fn() }
  },
}))

describe('seedReferenceCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  const seededCount = (n: number) =>
    mockQuery.mockImplementation((sql: string) => {
      if (/SELECT COUNT/i.test(sql)) return Promise.resolve({ rows: [{ n }], rowCount: 1 })
      return Promise.resolve({ rows: [], rowCount: 0 })
    })

  it('REFERENCE_DDL creates all four reference tables', async () => {
    const { REFERENCE_DDL } = await import('@/lib/reference/seed-reference')
    for (const t of ['RequirementFamily', 'Requirement', 'AssessmentObjective', 'CCIMapping']) {
      expect(REFERENCE_DDL).toContain(`CREATE TABLE IF NOT EXISTS "${t}"`)
    }
  })

  it('REFERENCE_DDL defines the unique keys each seed upserts on', async () => {
    const { REFERENCE_DDL } = await import('@/lib/reference/seed-reference')
    // ON CONFLICT targets: family(code), requirement(requirementId),
    // objective(objectiveReference), cci(cci).
    expect(REFERENCE_DDL).toMatch(/"RequirementFamily"[\s\S]*UNIQUE.*\(code\)|code[^,]*UNIQUE/)
    expect(REFERENCE_DDL).toContain('"requirementId"')
    expect(REFERENCE_DDL).toContain('"objectiveReference"')
  })

  it('seeds every dataset when the catalog is empty', async () => {
    const { getPool } = await import('@/lib/db')
    const { seedReferenceCatalog } = await import('@/lib/reference/seed-reference')
    seededCount(0)

    await seedReferenceCatalog(getPool())

    const sqls = mockQuery.mock.calls.map((c) => c[0] as string)
    expect(sqls.some((s) => s.includes('INSERT INTO "RequirementFamily"'))).toBe(true)
    expect(sqls.some((s) => s.includes('INSERT INTO "Requirement"'))).toBe(true)
    expect(sqls.some((s) => s.includes('INSERT INTO "AssessmentObjective"'))).toBe(true)
    expect(sqls.some((s) => s.includes('INSERT INTO "CCIMapping"'))).toBe(true)
  })

  it('loads requirements before objectives (objective inserts subselect requirements)', async () => {
    const { getPool } = await import('@/lib/db')
    const { seedReferenceCatalog } = await import('@/lib/reference/seed-reference')
    seededCount(0)

    await seedReferenceCatalog(getPool())

    const sqls = mockQuery.mock.calls.map((c) => c[0] as string)
    const reqIdx = sqls.findIndex((s) => s.includes('INSERT INTO "Requirement"'))
    const objIdx = sqls.findIndex((s) => s.includes('INSERT INTO "AssessmentObjective"'))
    expect(reqIdx).toBeGreaterThanOrEqual(0)
    expect(objIdx).toBeGreaterThan(reqIdx)
  })

  it('is idempotent: skips inserts when the catalog is already seeded', async () => {
    const { getPool } = await import('@/lib/db')
    const { seedReferenceCatalog } = await import('@/lib/reference/seed-reference')
    seededCount(321)

    await seedReferenceCatalog(getPool())

    const sqls = mockQuery.mock.calls.map((c) => c[0] as string)
    expect(sqls.some((s) => s.includes('INSERT INTO'))).toBe(false)
  })
})
