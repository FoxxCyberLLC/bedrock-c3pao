/**
 * Local schema for imported OSC snapshots (Task 3).
 *
 * Each `imp_<table>` holds the RAW source rows exactly as the Go exporter emits them
 * (docs/snapshot-format.md, data class 1) — a JSONB payload per row, NOT an assembled API
 * view. This keeps the import lossless and resilient to Go schema drift; the `lib/local/*`
 * domain layer (Tasks 11-20) assembles the API view shapes (`data->>'field'`, casts) at read
 * time, exactly as `db-outside-*` does over its own tables.
 *
 * Namespaced `imp_*` to avoid colliding with `outside_*` and the seeded reference catalog.
 * Every row is tagged with the `engagement_id` it was imported under so one container can host
 * multiple engagements and re-import idempotently (delete-by-engagement, then reload).
 *
 * This covers only the SNAPSHOT data class. Reference catalog = Task 23; org-local tables
 * (assessors, team, QA, COI, notifications) are added by Tasks 9/20.
 */

/** Minimal shape shared by `pg.Pool` and `pg.PoolClient`. */
interface Queryable {
  query(text: string): Promise<{ rows: Array<Record<string, unknown>> }>
}

/** The 17 class-1 snapshot tables (one raw `imp_` table each). */
export const IMPORTED_TABLES = [
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
] as const

/** Uniform raw-row table: source `id`, the importing `engagement_id`, the row as JSONB. */
function rawTableDdl(name: string): string {
  return `
  CREATE TABLE IF NOT EXISTS imp_${name} (
    id            TEXT PRIMARY KEY,
    engagement_id TEXT NOT NULL,
    data          JSONB NOT NULL,
    imported_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_imp_${name}_engagement ON imp_${name} (engagement_id);`
}

/** Denormalized evidence → objective (control) links from `evidence-links.json`. */
const LINK_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS imp_evidence_objective_link (
    engagement_id  TEXT NOT NULL,
    evidence_id    TEXT NOT NULL,
    objective_id   TEXT NOT NULL,
    requirement_id TEXT,
    PRIMARY KEY (evidence_id, objective_id)
  );
  CREATE INDEX IF NOT EXISTS idx_imp_evidence_link_engagement ON imp_evidence_objective_link (engagement_id);
  CREATE INDEX IF NOT EXISTS idx_imp_evidence_link_objective ON imp_evidence_objective_link (objective_id);`

/** DDL for every `imp_*` snapshot table plus the evidence-link table. Idempotent. */
export const IMPORTED_SCHEMA_DDL = IMPORTED_TABLES.map(rawTableDdl).join('\n') + '\n' + LINK_TABLE_DDL

/** Create the imported-snapshot tables. Idempotent (`CREATE TABLE IF NOT EXISTS`). */
export async function ensureImportedSchema(pool: Queryable): Promise<void> {
  await pool.query(IMPORTED_SCHEMA_DDL)
}
