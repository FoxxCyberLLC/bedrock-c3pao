/**
 * Local (air-gapped) engagement team — Task 18 (team subsystem).
 *
 * Team assignment is a C3PAO-local action (the C3PAO assigns its own assessors to an imported
 * engagement — Task 9 trust boundary), NOT imported from the OSC. Members live in
 * `local_engagement_team` and resolve their identity from the local assessor accounts
 * (`local_users`). This is also the authoritative source for per-engagement lead-assessor checks.
 * No network.
 */
import { query } from '@/lib/db'
import type { TeamMember } from '@/lib/api-client'

export const TEAM_SCHEMA_DDL = `
  CREATE TABLE IF NOT EXISTS local_engagement_team (
    engagement_id TEXT NOT NULL,
    assessor_id   TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'ASSESSOR',
    domains       JSONB NOT NULL DEFAULT '[]',
    assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (engagement_id, assessor_id)
  );
  CREATE INDEX IF NOT EXISTS idx_local_team_engagement ON local_engagement_team (engagement_id);`

interface Queryable {
  query(text: string): Promise<{ rows: Array<Record<string, unknown>> }>
}

export async function ensureTeamSchema(pool: Queryable): Promise<void> {
  await pool.query(TEAM_SCHEMA_DDL)
}

const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : String(v ?? ''))

/** The engagement's assigned team, identity resolved from local assessor accounts. */
export async function getLocalTeam(engagementId: string): Promise<TeamMember[]> {
  const result = await query(
    `SELECT t.assessor_id, t.role, t.domains, t.assigned_at,
            u.name AS name, u.email AS email, u.role AS user_role
       FROM local_engagement_team t
       JOIN local_users u ON u.id = t.assessor_id
      WHERE t.engagement_id = $1
      ORDER BY t.assigned_at`,
    [engagementId]
  )
  return result.rows.map((r) => ({
    id: String(r.assessor_id),
    assessorId: String(r.assessor_id),
    name: String(r.name ?? ''),
    email: String(r.email ?? ''),
    role: String(r.role),
    assessorType: r.user_role === 'lead_assessor' ? 'LEAD' : 'ASSESSOR',
    jobTitle: null,
    assignedAt: iso(r.assigned_at),
    domains: Array.isArray(r.domains) ? (r.domains as string[]) : [],
  }))
}

/** Local assessor accounts not yet assigned to this engagement. */
export async function getLocalAvailableAssessors(engagementId: string): Promise<Record<string, unknown>[]> {
  const result = await query(
    `SELECT id, name, email, role
       FROM local_users
      WHERE role IN ('assessor', 'lead_assessor')
        AND id NOT IN (SELECT assessor_id FROM local_engagement_team WHERE engagement_id = $1)
      ORDER BY name`,
    [engagementId]
  )
  return result.rows.map((r) => ({
    id: String(r.id),
    assessorId: String(r.id),
    name: String(r.name ?? ''),
    email: String(r.email ?? ''),
    assessorType: r.role === 'lead_assessor' ? 'LEAD' : 'ASSESSOR',
  }))
}

export async function addLocalTeamMember(
  engagementId: string,
  assessorId: string,
  role: string
): Promise<void> {
  await query(
    `INSERT INTO local_engagement_team (engagement_id, assessor_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (engagement_id, assessor_id) DO UPDATE SET role = EXCLUDED.role`,
    [engagementId, assessorId, role]
  )
}

export async function updateLocalTeamMemberRole(
  engagementId: string,
  assessorId: string,
  role: string
): Promise<void> {
  await query(
    `UPDATE local_engagement_team SET role = $3 WHERE engagement_id = $1 AND assessor_id = $2`,
    [engagementId, assessorId, role]
  )
}

export async function removeLocalTeamMember(engagementId: string, assessorId: string): Promise<void> {
  await query(
    `DELETE FROM local_engagement_team WHERE engagement_id = $1 AND assessor_id = $2`,
    [engagementId, assessorId]
  )
}

export async function setLocalAssessorDomains(
  engagementId: string,
  assessorId: string,
  familyCodes: string[]
): Promise<void> {
  await query(
    `UPDATE local_engagement_team SET domains = $3::jsonb WHERE engagement_id = $1 AND assessor_id = $2`,
    [engagementId, assessorId, JSON.stringify(familyCodes)]
  )
}

/** True if the assessor is the local lead for this engagement (per-engagement team assignment). */
export async function isLocalEngagementLead(engagementId: string, assessorId: string): Promise<boolean> {
  const result = await query(
    `SELECT 1 FROM local_engagement_team
      WHERE engagement_id = $1 AND assessor_id = $2 AND role = 'LEAD_ASSESSOR' LIMIT 1`,
    [engagementId, assessorId]
  )
  return result.rows.length > 0
}
