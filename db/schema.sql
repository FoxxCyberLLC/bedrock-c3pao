-- =============================================================================
-- Bedrock C3PAO - SQLite Schema
-- Local-only database for assessment work and cached SaaS data
-- =============================================================================

-- -------------------------
-- Assessment Data (local work product)
-- -------------------------

CREATE TABLE IF NOT EXISTS assessment_findings (
    id TEXT PRIMARY KEY,
    engagement_id TEXT NOT NULL,
    control_id TEXT NOT NULL,
    objective_id TEXT,
    assessor_id TEXT NOT NULL,
    determination TEXT,                -- NOT_ASSESSED, MET, NOT_MET, NOT_APPLICABLE
    assessment_methods TEXT,           -- JSON array: ["INTERVIEW", "EXAMINE", "TEST"]
    finding_text TEXT,
    objective_evidence TEXT,
    deficiency TEXT,
    recommendation TEXT,
    risk_level TEXT,                    -- LOW, MODERATE, HIGH, VERY_HIGH
    version INTEGER DEFAULT 1,
    synced_at TEXT,                     -- NULL = not yet pushed to SaaS
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_findings_engagement ON assessment_findings(engagement_id);
CREATE INDEX IF NOT EXISTS idx_findings_control ON assessment_findings(engagement_id, control_id);
CREATE INDEX IF NOT EXISTS idx_findings_unsynced ON assessment_findings(synced_at) WHERE synced_at IS NULL;

CREATE TABLE IF NOT EXISTS assessment_reports (
    id TEXT PRIMARY KEY,
    engagement_id TEXT NOT NULL,
    report_data TEXT,                  -- JSON blob of full report
    status TEXT DEFAULT 'DRAFT',       -- DRAFT, FINAL, SUBMITTED
    synced_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reports_engagement ON assessment_reports(engagement_id);

-- -------------------------
-- Cached SaaS Data (read-only mirror)
-- -------------------------

CREATE TABLE IF NOT EXISTS cached_engagements (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,                 -- JSON blob of full engagement
    fetched_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cached_controls (
    id TEXT PRIMARY KEY,
    engagement_id TEXT NOT NULL,
    data TEXT NOT NULL,                 -- JSON blob
    fetched_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cached_controls_engagement ON cached_controls(engagement_id);

CREATE TABLE IF NOT EXISTS cached_evidence (
    id TEXT PRIMARY KEY,
    engagement_id TEXT NOT NULL,
    data TEXT NOT NULL,                 -- JSON blob (metadata only, not file content)
    fetched_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cached_evidence_engagement ON cached_evidence(engagement_id);

CREATE TABLE IF NOT EXISTS cached_poams (
    id TEXT PRIMARY KEY,
    engagement_id TEXT NOT NULL,
    data TEXT NOT NULL,
    fetched_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cached_poams_engagement ON cached_poams(engagement_id);

CREATE TABLE IF NOT EXISTS cached_stigs (
    id TEXT PRIMARY KEY,
    engagement_id TEXT NOT NULL,
    data TEXT NOT NULL,
    fetched_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cached_stigs_engagement ON cached_stigs(engagement_id);

CREATE TABLE IF NOT EXISTS cached_team (
    id TEXT PRIMARY KEY,
    engagement_id TEXT NOT NULL,
    data TEXT NOT NULL,
    fetched_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cached_team_engagement ON cached_team(engagement_id);

CREATE TABLE IF NOT EXISTS cached_reference_data (
    key TEXT PRIMARY KEY,              -- e.g., 'nist-controls', 'cmmc-levels'
    data TEXT NOT NULL,                -- JSON blob
    fetched_at TEXT DEFAULT (datetime('now'))
);

-- -------------------------
-- Sync Queue (outbound changes)
-- -------------------------

CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,          -- 'finding', 'report', 'status'
    entity_id TEXT NOT NULL,
    engagement_id TEXT,
    action TEXT NOT NULL,               -- 'create', 'update', 'delete'
    payload TEXT NOT NULL,              -- JSON
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    last_error TEXT,
    next_retry_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_pending ON sync_queue(next_retry_at) WHERE attempts < max_attempts;

-- -------------------------
-- Local Session Cache
-- -------------------------

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    assessor_id TEXT NOT NULL,
    assessor_data TEXT NOT NULL,        -- JSON: { id, email, name, c3paoId, c3paoName, isLeadAssessor, status }
    saas_token TEXT NOT NULL,           -- Token for SaaS API calls
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_assessor ON sessions(assessor_id);

-- -------------------------
-- Audit Log (local copy)
-- -------------------------

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assessor_id TEXT NOT NULL,
    assessor_email TEXT,
    action TEXT NOT NULL,
    resource TEXT,
    resource_id TEXT,
    details TEXT,                       -- JSON
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_assessor ON audit_log(assessor_id);

-- -------------------------
-- App Metadata
-- -------------------------

CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
);
