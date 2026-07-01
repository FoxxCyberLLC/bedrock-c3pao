/**
 * Local (air-gapped) COI disclosures + QA reviews — Task 20.
 *
 * Both are C3PAO-org-local (managed by the C3PAO in this container), in local tables. Air-gapped
 * COI checks never see a remote register, so an unrecorded pairing is "clear". No network.
 */
import { randomUUID } from 'node:crypto'
import { query } from '@/lib/db'
import type { COIDisclosure, CheckCOIResult, QAReview, CreateCOIInput, CreateQAReviewInput } from '@/lib/api-client'

export const COI_QA_SCHEMA_DDL = `
  CREATE TABLE IF NOT EXISTS local_coi_disclosures (
    id              TEXT PRIMARY KEY,
    assessor_id     TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    disclosure_type TEXT NOT NULL,
    details         TEXT,
    status          TEXT NOT NULL DEFAULT 'ACTIVE',
    disclosed_by_id TEXT,
    disclosed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ
  );
  CREATE INDEX IF NOT EXISTS idx_local_coi_assessor ON local_coi_disclosures (assessor_id, organization_id);

  CREATE TABLE IF NOT EXISTS local_qa_reviews (
    id             TEXT PRIMARY KEY,
    engagement_id  TEXT NOT NULL,
    kind           TEXT NOT NULL,
    assigned_to_id TEXT NOT NULL,
    assigned_by_id TEXT,
    status         TEXT NOT NULL DEFAULT 'PENDING',
    notes          TEXT,
    self_attested  BOOLEAN NOT NULL DEFAULT FALSE,
    assigned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at   TIMESTAMPTZ
  );
  CREATE INDEX IF NOT EXISTS idx_local_qa_engagement ON local_qa_reviews (engagement_id);`

interface Queryable {
  query(text: string): Promise<{ rows: Array<Record<string, unknown>> }>
}
export async function ensureOrgSchema(pool: Queryable): Promise<void> {
  await pool.query(COI_QA_SCHEMA_DDL)
}

const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : String(v ?? ''))
const isoN = (v: unknown): string | null => (v == null ? null : iso(v))

function mapCoi(r: Record<string, unknown>): COIDisclosure {
  return {
    id: String(r.id), c3paoId: '', assessorId: String(r.assessor_id), assessorName: null,
    organizationId: String(r.organization_id), organizationName: null,
    disclosureType: String(r.disclosure_type), details: r.details != null ? String(r.details) : null,
    disclosedAt: iso(r.disclosed_at), expiresAt: isoN(r.expires_at), status: String(r.status),
    disclosedById: r.disclosed_by_id != null ? String(r.disclosed_by_id) : null,
  }
}

export async function getLocalCOIList(): Promise<COIDisclosure[]> {
  const result = await query(`SELECT * FROM local_coi_disclosures ORDER BY disclosed_at DESC`)
  return result.rows.map(mapCoi)
}

export async function createLocalCOI(input: CreateCOIInput): Promise<COIDisclosure> {
  const id = `local-coi-${randomUUID()}`
  await query(
    `INSERT INTO local_coi_disclosures (id, assessor_id, organization_id, disclosure_type, details, status, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, input.assessorId, input.organizationId, input.disclosureType, input.details ?? null, 'ACTIVE', input.expiresAt ?? null]
  )
  const rows = await query(`SELECT * FROM local_coi_disclosures WHERE id = $1`, [id])
  return mapCoi(rows.rows[0])
}

export async function updateLocalCOI(id: string, input: { status?: string; details?: string }): Promise<COIDisclosure | null> {
  await query(
    `UPDATE local_coi_disclosures SET status = COALESCE($2, status), details = COALESCE($3, details) WHERE id = $1`,
    [id, input.status ?? null, input.details ?? null]
  )
  const rows = await query(`SELECT * FROM local_coi_disclosures WHERE id = $1`, [id])
  return rows.rows.length ? mapCoi(rows.rows[0]) : null
}

/** Air-gapped COI check: only local disclosures exist; an unrecorded pairing is clear. */
export async function checkLocalCOIAssignment(engagementId: string, assessorId: string): Promise<CheckCOIResult> {
  void engagementId
  const result = await query(
    `SELECT * FROM local_coi_disclosures WHERE assessor_id = $1 AND status = 'ACTIVE'`,
    [assessorId]
  )
  const disclosures = result.rows.map(mapCoi)
  return { hasActive: disclosures.length > 0, reason: disclosures.length > 0 ? 'active_conflict' : 'clear', disclosures }
}

function mapQa(r: Record<string, unknown>): QAReview {
  return {
    id: String(r.id), c3paoId: '', engagementId: String(r.engagement_id), engagementName: null, organizationName: null,
    kind: String(r.kind) as QAReview['kind'], assignedToId: String(r.assigned_to_id), assignedToName: null,
    assignedById: r.assigned_by_id != null ? String(r.assigned_by_id) : null,
    status: String(r.status) as QAReview['status'], notes: r.notes != null ? String(r.notes) : null,
    assignedAt: iso(r.assigned_at), completedAt: isoN(r.completed_at), selfAttested: r.self_attested === true,
  }
}

export async function getLocalQAReviews(): Promise<QAReview[]> {
  const result = await query(`SELECT * FROM local_qa_reviews ORDER BY assigned_at DESC`)
  return result.rows.map(mapQa)
}

export async function getLocalEngagementQAReviews(engagementId: string): Promise<QAReview[]> {
  const result = await query(`SELECT * FROM local_qa_reviews WHERE engagement_id = $1 ORDER BY assigned_at DESC`, [engagementId])
  return result.rows.map(mapQa)
}

export async function createLocalQAReview(engagementId: string, input: CreateQAReviewInput): Promise<QAReview> {
  const id = `local-qa-${randomUUID()}`
  await query(
    `INSERT INTO local_qa_reviews (id, engagement_id, kind, assigned_to_id, status, notes, self_attested)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, engagementId, input.kind, input.assignedToId, 'PENDING', input.notes ?? null, input.selfAttested ?? false]
  )
  const rows = await query(`SELECT * FROM local_qa_reviews WHERE id = $1`, [id])
  return mapQa(rows.rows[0])
}

export async function updateLocalQAReview(id: string, input: { status?: string; notes?: string }): Promise<QAReview | null> {
  const completedAt = input.status === 'COMPLETED' ? new Date().toISOString() : null
  await query(
    `UPDATE local_qa_reviews SET status = COALESCE($2, status), notes = COALESCE($3, notes),
        completed_at = CASE WHEN $2 = 'COMPLETED' THEN $4::timestamptz ELSE completed_at END
      WHERE id = $1`,
    [id, input.status ?? null, input.notes ?? null, completedAt]
  )
  const rows = await query(`SELECT * FROM local_qa_reviews WHERE id = $1`, [id])
  return rows.rows.length ? mapQa(rows.rows[0]) : null
}
