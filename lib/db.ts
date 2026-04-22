import { Pool, type QueryResult } from 'pg'

let _pool: Pool | null = null
let _schemaPromise: Promise<void> | null = null

export function getPool(): Pool {
  if (_pool) return _pool

  // Strip sslmode from URL and configure SSL separately — pg-connection-string
  // parses sslmode=require as verify-full, which fails without the RDS CA bundle.
  // Aurora traffic is already encrypted in transit within the VPC.
  const connStr = (process.env.DATABASE_URL || '').replace(/[?&]sslmode=[^&]*/g, '')
  _pool = new Pool({
    connectionString: connStr,
    max: 3,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    ssl: process.env.DATABASE_URL?.includes('sslmode=')
      ? { rejectUnauthorized: false }
      : undefined,
  })

  _pool.on('error', (err) => {
    console.error('[db] Pool error:', err.message)
  })

  return _pool
}

export async function query(text: string, params?: unknown[]): Promise<QueryResult> {
  const pool = getPool()
  return pool.query(text, params)
}

export async function getClient() {
  const pool = getPool()
  return pool.connect()
}

export async function ensureSchema(): Promise<void> {
  if (_schemaPromise) return _schemaPromise

  _schemaPromise = (async () => {
    const pool = getPool()
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS local_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- C3PAO-internal reviews and comments on evidence/diagrams.
      -- Per CAP v2.0, the C3PAO only provides MET/NOT_MET verdicts to the OSC —
      -- no remediation guidance. These notes stay local to the container and are
      -- never round-tripped through the Go API or surfaced to contractors.
      CREATE TABLE IF NOT EXISTS c3pao_internal_reviews (
        id TEXT PRIMARY KEY,
        engagement_id TEXT NOT NULL,
        entity_type TEXT NOT NULL CHECK (entity_type IN ('EVIDENCE', 'SSP_DIAGRAM')),
        entity_id TEXT NOT NULL,
        reviewer_id TEXT NOT NULL,
        reviewer_name TEXT NOT NULL,
        reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        comment TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_c3pao_reviews_entity
        ON c3pao_internal_reviews (engagement_id, entity_type, entity_id);

      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS readiness_checklist_items (
        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        engagement_id      TEXT NOT NULL,
        item_key           TEXT NOT NULL,
        status             TEXT NOT NULL DEFAULT 'not_started',
        completed_by       TEXT,
        completed_by_email TEXT,
        completed_at       TIMESTAMPTZ,
        waived_by          TEXT,
        waived_by_email    TEXT,
        waived_at          TIMESTAMPTZ,
        waiver_reason      TEXT,
        updated_at         TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (engagement_id, item_key)
      );

      CREATE TABLE IF NOT EXISTS readiness_artifacts (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        item_id           UUID NOT NULL REFERENCES readiness_checklist_items(id) ON DELETE CASCADE,
        filename          TEXT NOT NULL,
        mime_type         TEXT NOT NULL,
        size_bytes        BIGINT NOT NULL,
        content           BYTEA NOT NULL,
        description       TEXT,
        uploaded_by       TEXT NOT NULL,
        uploaded_by_email TEXT NOT NULL,
        uploaded_at       TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS assessment_notes (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        engagement_id TEXT NOT NULL,
        author_id     TEXT NOT NULL,
        author_email  TEXT NOT NULL,
        author_name   TEXT NOT NULL,
        body          TEXT NOT NULL,
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW(),
        deleted_at    TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS assessment_note_revisions (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        note_id         UUID NOT NULL REFERENCES assessment_notes(id) ON DELETE CASCADE,
        body            TEXT NOT NULL,
        edited_by       TEXT NOT NULL,
        edited_by_email TEXT NOT NULL,
        revised_at      TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS readiness_audit_log (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        engagement_id TEXT NOT NULL,
        item_id       UUID,
        actor_id      TEXT NOT NULL,
        actor_email   TEXT NOT NULL,
        actor_name    TEXT NOT NULL,
        action        TEXT NOT NULL,
        details       JSONB,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS engagement_schedule (
        engagement_id         TEXT PRIMARY KEY,
        kickoff_date          DATE,
        onsite_start          DATE,
        onsite_end            DATE,
        interview_schedule    TEXT,
        deliverable_due_dates TEXT,
        phase_1_target        DATE,
        phase_2_target        DATE,
        phase_3_target        DATE,
        location_notes        TEXT,
        updated_at            TIMESTAMPTZ DEFAULT NOW(),
        updated_by            TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_readiness_items_engagement
        ON readiness_checklist_items(engagement_id);
      CREATE INDEX IF NOT EXISTS idx_readiness_audit_engagement
        ON readiness_audit_log(engagement_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_assessment_notes_engagement
        ON assessment_notes(engagement_id, created_at DESC);
    `)
  })()

  return _schemaPromise
}
