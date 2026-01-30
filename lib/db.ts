/**
 * SQLite Database Client
 *
 * Local-only database for assessment findings, cached SaaS data, and sync queue.
 * Uses better-sqlite3 for synchronous, high-performance SQLite access.
 */

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = path.join(process.cwd(), 'data', 'c3pao.db')
const SCHEMA_PATH = path.join(process.cwd(), 'db', 'schema.sql')

// Singleton pattern for the database connection
const globalForDb = globalThis as unknown as {
  db: Database.Database | undefined
}

function createDatabase(): Database.Database {
  // Ensure data directory exists
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const db = new Database(DB_PATH)

  // Enable WAL mode for better concurrent read/write performance
  db.pragma('journal_mode = WAL')
  db.pragma('busy_timeout = 5000')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')

  // Initialize schema if needed
  if (fs.existsSync(SCHEMA_PATH)) {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8')
    db.exec(schema)
  }

  return db
}

export const db = globalForDb.db ?? createDatabase()

if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db
}

// ---- Helper Types ----

export interface AssessmentFinding {
  id: string
  engagement_id: string
  control_id: string
  objective_id: string | null
  assessor_id: string
  determination: string | null
  assessment_methods: string | null  // JSON array
  finding_text: string | null
  objective_evidence: string | null
  deficiency: string | null
  recommendation: string | null
  risk_level: string | null
  version: number
  synced_at: string | null
  created_at: string
  updated_at: string
}

export interface AssessmentReport {
  id: string
  engagement_id: string
  report_data: string | null          // JSON
  status: string
  synced_at: string | null
  created_at: string
  updated_at: string
}

export interface SyncQueueItem {
  id: number
  entity_type: string
  entity_id: string
  engagement_id: string | null
  action: string
  payload: string                     // JSON
  attempts: number
  max_attempts: number
  last_error: string | null
  next_retry_at: string | null
  created_at: string
}

export interface CachedItem {
  id: string
  data: string                        // JSON
  fetched_at: string
  engagement_id?: string
}

// ---- Finding Operations ----

export function getFinding(engagementId: string, controlId: string, assessorId: string): AssessmentFinding | undefined {
  return db.prepare(
    'SELECT * FROM assessment_findings WHERE engagement_id = ? AND control_id = ? AND assessor_id = ?'
  ).get(engagementId, controlId, assessorId) as AssessmentFinding | undefined
}

export function getFindings(engagementId: string): AssessmentFinding[] {
  return db.prepare(
    'SELECT * FROM assessment_findings WHERE engagement_id = ? ORDER BY control_id'
  ).all(engagementId) as AssessmentFinding[]
}

export function upsertFinding(finding: Omit<AssessmentFinding, 'created_at' | 'updated_at' | 'synced_at'>): void {
  db.prepare(`
    INSERT INTO assessment_findings (id, engagement_id, control_id, objective_id, assessor_id, determination, assessment_methods, finding_text, objective_evidence, deficiency, recommendation, risk_level, version)
    VALUES (@id, @engagement_id, @control_id, @objective_id, @assessor_id, @determination, @assessment_methods, @finding_text, @objective_evidence, @deficiency, @recommendation, @risk_level, @version)
    ON CONFLICT(id) DO UPDATE SET
      determination = excluded.determination,
      assessment_methods = excluded.assessment_methods,
      finding_text = excluded.finding_text,
      objective_evidence = excluded.objective_evidence,
      deficiency = excluded.deficiency,
      recommendation = excluded.recommendation,
      risk_level = excluded.risk_level,
      version = excluded.version,
      synced_at = NULL,
      updated_at = datetime('now')
  `).run(finding)
}

export function markFindingSynced(id: string): void {
  db.prepare(
    "UPDATE assessment_findings SET synced_at = datetime('now') WHERE id = ?"
  ).run(id)
}

// ---- Report Operations ----

export function getReport(engagementId: string): AssessmentReport | undefined {
  return db.prepare(
    'SELECT * FROM assessment_reports WHERE engagement_id = ? ORDER BY updated_at DESC LIMIT 1'
  ).get(engagementId) as AssessmentReport | undefined
}

export function upsertReport(report: { id: string; engagement_id: string; report_data: string; status: string }): void {
  db.prepare(`
    INSERT INTO assessment_reports (id, engagement_id, report_data, status)
    VALUES (@id, @engagement_id, @report_data, @status)
    ON CONFLICT(id) DO UPDATE SET
      report_data = excluded.report_data,
      status = excluded.status,
      synced_at = NULL,
      updated_at = datetime('now')
  `).run(report)
}

// ---- Cache Operations ----

export function getCached(table: string, id: string): CachedItem | undefined {
  return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as CachedItem | undefined
}

export function getCachedByEngagement(table: string, engagementId: string): CachedItem[] {
  return db.prepare(`SELECT * FROM ${table} WHERE engagement_id = ?`).all(engagementId) as CachedItem[]
}

export function setCached(table: string, id: string, data: string, engagementId?: string): void {
  if (engagementId) {
    db.prepare(`
      INSERT INTO ${table} (id, engagement_id, data, fetched_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET data = excluded.data, fetched_at = datetime('now')
    `).run(id, engagementId, data)
  } else {
    db.prepare(`
      INSERT INTO ${table} (id, data, fetched_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET data = excluded.data, fetched_at = datetime('now')
    `).run(id, data)
  }
}

export function setCachedReference(key: string, data: string): void {
  db.prepare(`
    INSERT INTO cached_reference_data (key, data, fetched_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET data = excluded.data, fetched_at = datetime('now')
  `).run(key, data)
}

export function getCachedReference(key: string): CachedItem | undefined {
  return db.prepare('SELECT key as id, data, fetched_at FROM cached_reference_data WHERE key = ?').get(key) as CachedItem | undefined
}

export function clearCacheForEngagement(engagementId: string): void {
  const tables = ['cached_controls', 'cached_evidence', 'cached_poams', 'cached_stigs', 'cached_team']
  const tx = db.transaction(() => {
    for (const table of tables) {
      db.prepare(`DELETE FROM ${table} WHERE engagement_id = ?`).run(engagementId)
    }
    db.prepare('DELETE FROM cached_engagements WHERE id = ?').run(engagementId)
  })
  tx()
}

// ---- Sync Queue Operations ----

export function enqueueSync(item: { entity_type: string; entity_id: string; engagement_id?: string; action: string; payload: string }): void {
  db.prepare(`
    INSERT INTO sync_queue (entity_type, entity_id, engagement_id, action, payload, next_retry_at)
    VALUES (@entity_type, @entity_id, @engagement_id, @action, @payload, datetime('now'))
  `).run(item)
}

export function getPendingSyncItems(limit: number = 50): SyncQueueItem[] {
  return db.prepare(`
    SELECT * FROM sync_queue
    WHERE attempts < max_attempts AND (next_retry_at IS NULL OR next_retry_at <= datetime('now'))
    ORDER BY created_at ASC
    LIMIT ?
  `).all(limit) as SyncQueueItem[]
}

export function markSyncSuccess(id: number): void {
  db.prepare('DELETE FROM sync_queue WHERE id = ?').run(id)
}

export function markSyncFailed(id: number, error: string): void {
  db.prepare(`
    UPDATE sync_queue SET
      attempts = attempts + 1,
      last_error = ?,
      next_retry_at = datetime('now', '+' || (attempts * 30) || ' seconds')
    WHERE id = ?
  `).run(error, id)
}

export function getSyncQueueCount(): number {
  const row = db.prepare('SELECT COUNT(*) as count FROM sync_queue WHERE attempts < max_attempts').get() as { count: number }
  return row.count
}

// ---- Session Operations ----

export function getSession(id: string) {
  return db.prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > datetime(\'now\')').get(id) as {
    id: string
    assessor_id: string
    assessor_data: string
    saas_token: string
    expires_at: string
  } | undefined
}

export function setSession(session: { id: string; assessor_id: string; assessor_data: string; saas_token: string; expires_at: string }): void {
  db.prepare(`
    INSERT INTO sessions (id, assessor_id, assessor_data, saas_token, expires_at)
    VALUES (@id, @assessor_id, @assessor_data, @saas_token, @expires_at)
    ON CONFLICT(id) DO UPDATE SET
      assessor_data = excluded.assessor_data,
      saas_token = excluded.saas_token,
      expires_at = excluded.expires_at
  `).run(session)
}

export function deleteSession(id: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id)
}

export function cleanExpiredSessions(): void {
  db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run()
}

// ---- Audit Log ----

export function logAudit(entry: { assessor_id: string; assessor_email?: string; action: string; resource?: string; resource_id?: string; details?: string }): void {
  db.prepare(`
    INSERT INTO audit_log (assessor_id, assessor_email, action, resource, resource_id, details)
    VALUES (@assessor_id, @assessor_email, @action, @resource, @resource_id, @details)
  `).run(entry)
}

// ---- App Metadata ----

export function getMeta(key: string): string | undefined {
  const row = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value
}

export function setMeta(key: string, value: string): void {
  db.prepare(`
    INSERT INTO app_meta (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run(key, value)
}

export default db
