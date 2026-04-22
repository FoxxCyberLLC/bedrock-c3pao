/**
 * Append-only audit log for readiness/notes activity.
 * Callers should not let audit failures abort user-visible mutations;
 * wrap `appendAudit` in try/catch and log the error.
 */

import { query } from './db'
import type { AuditAction, AuditEntry } from './readiness-types'

export interface Actor {
  id: string
  email: string
  name: string
}

export interface AppendAuditParams {
  engagementId: string
  itemId?: string | null
  actor: Actor
  action: AuditAction
  details?: Record<string, unknown>
}

interface AuditRow {
  id: string
  engagement_id: string
  item_id: string | null
  actor_id: string
  actor_email: string
  actor_name: string
  action: AuditAction
  details: Record<string, unknown> | null
  created_at: string | Date
}

function mapRow(row: AuditRow): AuditEntry {
  return {
    id: row.id,
    engagementId: row.engagement_id,
    itemId: row.item_id,
    actorId: row.actor_id,
    actorEmail: row.actor_email,
    actorName: row.actor_name,
    action: row.action,
    details: row.details,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  }
}

/** Insert a single audit row. Throws on DB error so tests can assert it. */
export async function appendAudit(params: AppendAuditParams): Promise<void> {
  await query(
    `INSERT INTO readiness_audit_log
       (engagement_id, item_id, actor_id, actor_email, actor_name, action, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      params.engagementId,
      params.itemId ?? null,
      params.actor.id,
      params.actor.email,
      params.actor.name,
      params.action,
      params.details ? JSON.stringify(params.details) : null,
    ],
  )
}

export interface GetAuditLogOptions {
  itemId?: string
  limit?: number
}

/** Read audit entries ordered newest-first. Default limit 500. */
export async function getAuditLog(
  engagementId: string,
  opts: GetAuditLogOptions = {},
): Promise<AuditEntry[]> {
  const limit = opts.limit ?? 500
  const params: unknown[] = [engagementId]
  let sql = `SELECT id, engagement_id, item_id, actor_id, actor_email, actor_name,
                    action, details, created_at
             FROM readiness_audit_log
             WHERE engagement_id = $1`
  if (opts.itemId) {
    params.push(opts.itemId)
    sql += ` AND item_id = $${params.length}`
  }
  params.push(limit)
  sql += ` ORDER BY created_at DESC LIMIT $${params.length}`

  const result = await query(sql, params)
  return (result.rows as AuditRow[]).map(mapRow)
}
