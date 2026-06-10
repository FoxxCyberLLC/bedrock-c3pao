import { Pool, type QueryResult } from 'pg'

let _pool: Pool | null = null
let _schemaPromise: Promise<void> | null = null

/** Verified-TLS config passed to pg's `ssl` option. */
export interface DbSslConfig {
  ca: string
  rejectUnauthorized: true
}

/**
 * Build the pg SSL config from the connection URL and an optional CA cert.
 *
 * - No `sslmode=` in the URL → SSL disabled (undefined): the bundled local DB
 *   runs on an internal/loopback network where TLS isn't used.
 * - `sslmode=` present → SSL is required AND the server certificate is verified
 *   against the supplied CA (`rejectUnauthorized: true`). If no CA is provided
 *   we fail closed (throw) rather than silently disabling verification with
 *   `rejectUnauthorized: false` — an unverified TLS connection is open to MITM.
 *
 * Mirror this logic in `start.js` (CommonJS) if it changes.
 */
export function buildSslConfig(
  databaseUrl: string | undefined,
  caCert: string | undefined
): DbSslConfig | undefined {
  if (!databaseUrl || !databaseUrl.includes('sslmode=')) {
    return undefined
  }
  if (!caCert || caCert.trim() === '') {
    throw new Error(
      'DATABASE_URL requests SSL (sslmode=) but DATABASE_CA_CERT is not set. ' +
        'Provide the server CA certificate (PEM) so the connection can be verified, ' +
        'or remove sslmode from DATABASE_URL for an unencrypted internal connection.'
    )
  }
  return { ca: caCert, rejectUnauthorized: true }
}

export function getPool(): Pool {
  if (_pool) return _pool

  // Strip sslmode from the URL and configure SSL separately — pg-connection-string
  // would otherwise parse sslmode itself. When sslmode is present we require a
  // verified TLS connection (DATABASE_CA_CERT); see buildSslConfig.
  const connStr = (process.env.DATABASE_URL || '').replace(/[?&]sslmode=[^&]*/g, '')
  _pool = new Pool({
    connectionString: connStr,
    max: 3,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    ssl: buildSslConfig(process.env.DATABASE_URL, process.env.DATABASE_CA_CERT),
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

      -- Per-user pinned engagements (personal watch list).
      CREATE TABLE IF NOT EXISTS engagement_pins (
        user_id TEXT NOT NULL,
        engagement_id TEXT NOT NULL,
        pinned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, engagement_id)
      );

      -- Engagement-level tags (team-visible labels).
      CREATE TABLE IF NOT EXISTS engagement_tags (
        engagement_id TEXT NOT NULL,
        label TEXT NOT NULL,
        color TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (engagement_id, label)
      );
      CREATE INDEX IF NOT EXISTS engagement_tags_label_idx ON engagement_tags (label);

      -- Per-user snoozes (hide an engagement from default view until a date).
      CREATE TABLE IF NOT EXISTS engagement_snoozes (
        user_id TEXT NOT NULL,
        engagement_id TEXT NOT NULL,
        hidden_until TIMESTAMPTZ NOT NULL,
        reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, engagement_id)
      );

      -- Per-user saved custom filter views.
      CREATE TABLE IF NOT EXISTS engagement_saved_views (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        filter JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS engagement_saved_views_user_idx ON engagement_saved_views (user_id);

      -- Outside-OSC engagements: c3pao-local engagements not represented as
      -- ATO packages in bedrock-cmmc. Self-contained — no Go API roundtrip.
      -- Same CMMC controls/objectives catalog as OSC engagements; assessment
      -- status, evidence, and links live here. UUID PKs deliberately diverge
      -- from the Go API's TEXT IDs so dispatch-by-id never collides.
      CREATE TABLE IF NOT EXISTS outside_engagements (
        id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name                   TEXT NOT NULL,
        client_name            TEXT NOT NULL,
        client_poc_name        TEXT NOT NULL,
        client_poc_email       TEXT NOT NULL,
        scope                  TEXT,
        target_level           TEXT NOT NULL DEFAULT 'L2'
                               CHECK (target_level IN ('L1', 'L2', 'L3')),
        status                 TEXT NOT NULL DEFAULT 'PLANNING'
                               CHECK (status IN ('PLANNING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
        lead_assessor_id       TEXT NOT NULL,
        lead_assessor_name     TEXT NOT NULL,
        scheduled_start_date   DATE NOT NULL,
        scheduled_end_date     DATE NOT NULL,
        created_by             TEXT NOT NULL,
        created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS outside_control_assessments (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        engagement_id   UUID NOT NULL REFERENCES outside_engagements(id) ON DELETE CASCADE,
        requirement_id  TEXT NOT NULL,
        status          TEXT NOT NULL DEFAULT 'NOT_ASSESSED'
                        CHECK (status IN ('NOT_ASSESSED', 'MET', 'NOT_MET', 'NOT_APPLICABLE', 'IN_POAM')),
        notes           TEXT,
        updated_by      TEXT NOT NULL,
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        version         INT NOT NULL DEFAULT 1,
        UNIQUE (engagement_id, requirement_id)
      );
      CREATE INDEX IF NOT EXISTS idx_outside_control_assessments_engagement
        ON outside_control_assessments (engagement_id);

      CREATE TABLE IF NOT EXISTS outside_objective_assessments (
        id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        engagement_id            UUID NOT NULL REFERENCES outside_engagements(id) ON DELETE CASCADE,
        requirement_id           TEXT NOT NULL,
        objective_id             TEXT NOT NULL,
        status                   TEXT NOT NULL DEFAULT 'NOT_ASSESSED'
                                 CHECK (status IN ('NOT_ASSESSED', 'MET', 'NOT_MET', 'NOT_APPLICABLE')),
        assessment_notes         TEXT,
        evidence_description     TEXT,
        artifacts_reviewed       TEXT,
        interviewees             TEXT,
        examine_description      TEXT,
        test_description         TEXT,
        time_to_assess_minutes   INT,
        official_assessor_id     TEXT,
        official_assessed_at     TIMESTAMPTZ,
        version                  INT NOT NULL DEFAULT 1,
        updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (engagement_id, objective_id)
      );
      CREATE INDEX IF NOT EXISTS idx_outside_objective_assessments_engagement
        ON outside_objective_assessments (engagement_id, requirement_id);

      CREATE TABLE IF NOT EXISTS outside_evidence (
        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        engagement_id      UUID NOT NULL REFERENCES outside_engagements(id) ON DELETE CASCADE,
        file_name          TEXT NOT NULL,
        mime_type          TEXT NOT NULL,
        size_bytes         BIGINT NOT NULL,
        content            BYTEA NOT NULL,
        description        TEXT,
        uploaded_by        TEXT NOT NULL,
        uploaded_by_email  TEXT NOT NULL,
        uploaded_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_outside_evidence_engagement
        ON outside_evidence (engagement_id);

      CREATE TABLE IF NOT EXISTS outside_evidence_objective_links (
        evidence_id    UUID NOT NULL REFERENCES outside_evidence(id) ON DELETE CASCADE,
        objective_id   TEXT NOT NULL,
        linked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        linked_by      TEXT NOT NULL,
        PRIMARY KEY (evidence_id, objective_id)
      );
      CREATE INDEX IF NOT EXISTS idx_outside_evidence_objective_links_objective
        ON outside_evidence_objective_links (objective_id);
    `)
  })()

  return _schemaPromise
}
