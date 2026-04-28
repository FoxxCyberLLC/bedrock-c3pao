/**
 * Data access layer for outside-OSC engagements (local-only c3pao engagements).
 * All SQL is parameterized. snake_case row columns are mapped to camelCase
 * shapes at this layer; nothing above this file sees snake_case.
 */

import { query, getClient } from './db'
import type {
  OutsideEngagement,
  OutsideEngagementStatus,
  OutsideEngagementTargetLevel,
} from './outside-engagement-types'

interface OutsideEngagementRow {
  id: string
  name: string
  client_name: string
  client_poc_name: string
  client_poc_email: string
  scope: string | null
  target_level: OutsideEngagementTargetLevel
  status: OutsideEngagementStatus
  lead_assessor_id: string
  lead_assessor_name: string
  scheduled_start_date: string | Date
  scheduled_end_date: string | Date
  created_by: string
  created_at: string | Date
  updated_at: string | Date
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function toDateString(value: string | Date): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return value.slice(0, 10)
}

function mapOutsideEngagementRow(row: OutsideEngagementRow): OutsideEngagement {
  return {
    id: row.id,
    kind: 'outside_osc',
    name: row.name,
    clientName: row.client_name,
    clientPocName: row.client_poc_name,
    clientPocEmail: row.client_poc_email,
    scope: row.scope,
    targetLevel: row.target_level,
    status: row.status,
    leadAssessorId: row.lead_assessor_id,
    leadAssessorName: row.lead_assessor_name,
    scheduledStartDate: toDateString(row.scheduled_start_date),
    scheduledEndDate: toDateString(row.scheduled_end_date),
    createdBy: row.created_by,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }
}

export interface OutsideEngagementInput {
  name: string
  clientName: string
  clientPocName: string
  clientPocEmail: string
  scope: string | null
  targetLevel: OutsideEngagementTargetLevel
  leadAssessorId: string
  leadAssessorName: string
  scheduledStartDate: string
  scheduledEndDate: string
  createdBy: string
}

export async function insertOutsideEngagement(
  input: OutsideEngagementInput,
): Promise<OutsideEngagement> {
  const result = await query(
    `INSERT INTO outside_engagements (
       name, client_name, client_poc_name, client_poc_email, scope,
       target_level, lead_assessor_id, lead_assessor_name,
       scheduled_start_date, scheduled_end_date, created_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      input.name,
      input.clientName,
      input.clientPocName,
      input.clientPocEmail,
      input.scope,
      input.targetLevel,
      input.leadAssessorId,
      input.leadAssessorName,
      input.scheduledStartDate,
      input.scheduledEndDate,
      input.createdBy,
    ],
  )
  return mapOutsideEngagementRow(result.rows[0] as OutsideEngagementRow)
}

export async function listOutsideEngagements(): Promise<OutsideEngagement[]> {
  const result = await query(
    `SELECT * FROM outside_engagements ORDER BY created_at DESC`,
  )
  return (result.rows as OutsideEngagementRow[]).map(mapOutsideEngagementRow)
}

export async function getOutsideEngagementById(
  id: string,
): Promise<OutsideEngagement | null> {
  const result = await query(`SELECT * FROM outside_engagements WHERE id = $1`, [id])
  if (result.rowCount === 0) return null
  return mapOutsideEngagementRow(result.rows[0] as OutsideEngagementRow)
}

export type OutsideEngagementPatch = Partial<
  Omit<OutsideEngagementInput, 'createdBy'>
> & {
  status?: OutsideEngagementStatus
}

const PATCH_COLUMN_MAP: Record<string, string> = {
  name: 'name',
  clientName: 'client_name',
  clientPocName: 'client_poc_name',
  clientPocEmail: 'client_poc_email',
  scope: 'scope',
  targetLevel: 'target_level',
  status: 'status',
  leadAssessorId: 'lead_assessor_id',
  leadAssessorName: 'lead_assessor_name',
  scheduledStartDate: 'scheduled_start_date',
  scheduledEndDate: 'scheduled_end_date',
}

export async function updateOutsideEngagement(
  id: string,
  patch: OutsideEngagementPatch,
): Promise<OutsideEngagement | null> {
  const fields: string[] = []
  const values: unknown[] = []
  let i = 1

  for (const [key, val] of Object.entries(patch)) {
    if (val === undefined) continue
    const col = PATCH_COLUMN_MAP[key]
    if (!col) continue
    fields.push(`${col} = $${i}`)
    values.push(val)
    i += 1
  }

  if (fields.length === 0) {
    return getOutsideEngagementById(id)
  }

  fields.push('updated_at = NOW()')
  values.push(id)

  const result = await query(
    `UPDATE outside_engagements SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values,
  )
  if (result.rowCount === 0) return null
  return mapOutsideEngagementRow(result.rows[0] as OutsideEngagementRow)
}

/**
 * Hard-delete an outside engagement and all related rows across shared tables
 * that lack a FK to engagements. outside_*_assessments, outside_evidence, and
 * outside_evidence_objective_links cascade automatically via FK.
 *
 * Returns true if the engagement existed and was deleted.
 */
export async function deleteOutsideEngagement(id: string): Promise<boolean> {
  const client = await getClient()
  try {
    await client.query('BEGIN')

    await client.query('DELETE FROM engagement_pins WHERE engagement_id = $1', [id])
    await client.query('DELETE FROM engagement_tags WHERE engagement_id = $1', [id])
    await client.query('DELETE FROM engagement_snoozes WHERE engagement_id = $1', [id])
    await client.query('DELETE FROM engagement_schedule WHERE engagement_id = $1', [id])
    await client.query(
      `DELETE FROM assessment_note_revisions
       WHERE note_id IN (SELECT id FROM assessment_notes WHERE engagement_id = $1)`,
      [id],
    )
    await client.query('DELETE FROM assessment_notes WHERE engagement_id = $1', [id])
    await client.query(
      `DELETE FROM readiness_artifacts
       WHERE item_id IN (SELECT id FROM readiness_checklist_items WHERE engagement_id = $1)`,
      [id],
    )
    await client.query('DELETE FROM readiness_checklist_items WHERE engagement_id = $1', [
      id,
    ])
    await client.query('DELETE FROM readiness_audit_log WHERE engagement_id = $1', [id])
    await client.query('DELETE FROM c3pao_internal_reviews WHERE engagement_id = $1', [id])

    const res = await client.query('DELETE FROM outside_engagements WHERE id = $1', [id])

    await client.query('COMMIT')
    return (res.rowCount ?? 0) > 0
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Used by requireOutsideLeadAssessor — does not call Go API.
 */
export async function getOutsideEngagementLeadId(id: string): Promise<string | null> {
  const result = await query(
    `SELECT lead_assessor_id FROM outside_engagements WHERE id = $1`,
    [id],
  )
  if (result.rowCount === 0) return null
  return (result.rows[0] as { lead_assessor_id: string }).lead_assessor_id
}
