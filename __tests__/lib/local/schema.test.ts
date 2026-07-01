import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Task 3 — the `imp_*` raw snapshot schema. One table per contract snapshot table
 * (docs/snapshot-format.md, data class 1), each holding the source row verbatim as JSONB.
 * The `lib/local/*` layer (Tasks 11-20) assembles API view shapes from these at read time.
 */

const mockQuery = vi.fn()
vi.mock('pg', () => ({
  Pool: function () {
    return { query: mockQuery, on: vi.fn() }
  },
}))

// The 17 class-1 snapshot tables from the v1 contract.
const EXPECTED_TABLES = [
  'assessment_engagement',
  'ato_package',
  'organization',
  'requirement_status',
  'objective_status',
  'objective_status_snapshot',
  'assessment_snapshot',
  'assessment_finding',
  'assessment_report',
  'engagement_comment',
  'evidence',
  'evidence_objective_mapping',
  'poam',
  'asset',
  'ssp',
  'external_service_provider',
  'esp_requirement_mapping',
]

describe('lib/local/schema — imp_* raw tables', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('IMPORTED_TABLES enumerates all 17 class-1 snapshot tables', async () => {
    const { IMPORTED_TABLES } = await import('@/lib/local/schema')
    expect([...IMPORTED_TABLES].sort()).toEqual([...EXPECTED_TABLES].sort())
  })

  it('creates one idempotent imp_ table per snapshot table with a JSONB payload', async () => {
    const { IMPORTED_SCHEMA_DDL } = await import('@/lib/local/schema')
    for (const t of EXPECTED_TABLES) {
      expect(IMPORTED_SCHEMA_DDL).toContain(`CREATE TABLE IF NOT EXISTS imp_${t} (`)
    }
    expect(IMPORTED_SCHEMA_DDL).toMatch(/data\s+JSONB NOT NULL/)
    expect(IMPORTED_SCHEMA_DDL).toMatch(/engagement_id\s+TEXT NOT NULL/)
  })

  it('indexes each imp_ table by engagement_id for per-engagement queries', async () => {
    const { IMPORTED_SCHEMA_DDL } = await import('@/lib/local/schema')
    for (const t of EXPECTED_TABLES) {
      expect(IMPORTED_SCHEMA_DDL).toContain(`idx_imp_${t}_engagement`)
    }
  })

  it('provides a queryable evidence↔objective link table', async () => {
    const { IMPORTED_SCHEMA_DDL } = await import('@/lib/local/schema')
    expect(IMPORTED_SCHEMA_DDL).toContain('CREATE TABLE IF NOT EXISTS imp_evidence_objective_link (')
    expect(IMPORTED_SCHEMA_DDL).toContain('evidence_id')
    expect(IMPORTED_SCHEMA_DDL).toContain('objective_id')
  })

  it('ensureImportedSchema runs the DDL against the pool', async () => {
    const { ensureImportedSchema, IMPORTED_SCHEMA_DDL } = await import('@/lib/local/schema')
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })

    const { getPool } = await import('@/lib/db')
    await ensureImportedSchema(getPool())

    expect(mockQuery).toHaveBeenCalledWith(IMPORTED_SCHEMA_DDL)
  })

  it('ensureSchema (db.ts) creates the imp_ tables (Task 3 hook)', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })
    const { ensureSchema } = await import('@/lib/db')

    await ensureSchema()

    const allSql = mockQuery.mock.calls.map((c) => c[0] as string).join(' ')
    expect(allSql).toContain('CREATE TABLE IF NOT EXISTS imp_assessment_engagement (')
    expect(allSql).toContain('CREATE TABLE IF NOT EXISTS imp_objective_status (')
  })
})
