/**
 * Data access layer for readiness checklist items + artifacts.
 * All SQL is parameterized; no business logic beyond status derivation
 * (which the item state machine requires at the DB layer).
 */

import { query, getClient } from './db'
import { READINESS_ITEM_KEYS } from './readiness-types'
import type {
  ReadinessArtifact,
  ReadinessItem,
  ReadinessItemKey,
  ReadinessItemStatus,
} from './readiness-types'

export interface Actor {
  id: string
  email: string
  name: string
}

export interface ArtifactInput {
  filename: string
  mimeType: string
  sizeBytes: number
  content: Buffer
  description?: string | null
  uploadedBy: string
  uploadedByEmail: string
}

interface ItemRow {
  id: string
  engagement_id: string
  item_key: ReadinessItemKey
  status: ReadinessItemStatus
  completed_by: string | null
  completed_by_email: string | null
  completed_at: string | Date | null
  waived_by: string | null
  waived_by_email: string | null
  waived_at: string | Date | null
  waiver_reason: string | null
  updated_at: string | Date
}

interface ArtifactRow {
  id: string
  item_id: string
  filename: string
  mime_type: string
  size_bytes: string | number
  description: string | null
  uploaded_by: string
  uploaded_by_email: string
  uploaded_at: string | Date
}

function toIso(value: string | Date | null): string | null {
  if (value === null) return null
  return value instanceof Date ? value.toISOString() : value
}

function toIsoRequired(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value
}

function mapArtifact(row: ArtifactRow): ReadinessArtifact {
  return {
    id: row.id,
    itemId: row.item_id,
    filename: row.filename,
    mimeType: row.mime_type,
    sizeBytes: typeof row.size_bytes === 'string' ? parseInt(row.size_bytes, 10) : row.size_bytes,
    description: row.description,
    uploadedBy: row.uploaded_by,
    uploadedByEmail: row.uploaded_by_email,
    uploadedAt: toIsoRequired(row.uploaded_at),
  }
}

function mapItem(row: ItemRow, artifacts: ReadinessArtifact[]): ReadinessItem {
  return {
    id: row.id,
    engagementId: row.engagement_id,
    itemKey: row.item_key,
    status: row.status,
    completedBy: row.completed_by,
    completedByEmail: row.completed_by_email,
    completedAt: toIso(row.completed_at),
    waivedBy: row.waived_by,
    waivedByEmail: row.waived_by_email,
    waivedAt: toIso(row.waived_at),
    waiverReason: row.waiver_reason,
    updatedAt: toIsoRequired(row.updated_at),
    artifacts,
  }
}

/** Seed 8 rows with status 'not_started' if none exist for this engagement. */
export async function ensureItemsSeeded(engagementId: string): Promise<void> {
  const values: string[] = []
  const params: unknown[] = [engagementId]
  for (let i = 0; i < READINESS_ITEM_KEYS.length; i++) {
    params.push(READINESS_ITEM_KEYS[i])
    values.push(`($1, $${i + 2}, 'not_started')`)
  }
  await query(
    `INSERT INTO readiness_checklist_items (engagement_id, item_key, status)
     VALUES ${values.join(', ')}
     ON CONFLICT (engagement_id, item_key) DO NOTHING`,
    params,
  )
}

/** Fetch all items for an engagement with their artifacts (metadata only). */
export async function getItems(engagementId: string): Promise<ReadinessItem[]> {
  const itemsResult = await query(
    `SELECT id, engagement_id, item_key, status,
            completed_by, completed_by_email, completed_at,
            waived_by, waived_by_email, waived_at, waiver_reason,
            updated_at
     FROM readiness_checklist_items
     WHERE engagement_id = $1`,
    [engagementId],
  )
  const items = itemsResult.rows as ItemRow[]
  if (items.length === 0) return []

  const itemIds = items.map((i) => i.id)
  const artifactsResult = await query(
    `SELECT id, item_id, filename, mime_type, size_bytes, description,
            uploaded_by, uploaded_by_email, uploaded_at
     FROM readiness_artifacts
     WHERE item_id = ANY($1::uuid[])
     ORDER BY uploaded_at ASC`,
    [itemIds],
  )
  const artifactsByItem = new Map<string, ReadinessArtifact[]>()
  for (const row of artifactsResult.rows as ArtifactRow[]) {
    const mapped = mapArtifact(row)
    const list = artifactsByItem.get(mapped.itemId) ?? []
    list.push(mapped)
    artifactsByItem.set(mapped.itemId, list)
  }

  const orderMap = new Map(READINESS_ITEM_KEYS.map((k, idx) => [k, idx]))
  return items
    .map((row) => mapItem(row, artifactsByItem.get(row.id) ?? []))
    .sort((a, b) => (orderMap.get(a.itemKey) ?? 99) - (orderMap.get(b.itemKey) ?? 99))
}

/** Fetch a single item by engagement + key, or null if not seeded yet. */
export async function getItemByKey(
  engagementId: string,
  key: ReadinessItemKey,
): Promise<ReadinessItem | null> {
  const itemResult = await query(
    `SELECT id, engagement_id, item_key, status,
            completed_by, completed_by_email, completed_at,
            waived_by, waived_by_email, waived_at, waiver_reason,
            updated_at
     FROM readiness_checklist_items
     WHERE engagement_id = $1 AND item_key = $2`,
    [engagementId, key],
  )
  const row = itemResult.rows[0] as ItemRow | undefined
  if (!row) return null

  const artifactsResult = await query(
    `SELECT id, item_id, filename, mime_type, size_bytes, description,
            uploaded_by, uploaded_by_email, uploaded_at
     FROM readiness_artifacts
     WHERE item_id = $1
     ORDER BY uploaded_at ASC`,
    [row.id],
  )
  const artifacts = (artifactsResult.rows as ArtifactRow[]).map(mapArtifact)
  return mapItem(row, artifacts)
}

async function requireItem(engagementId: string, key: ReadinessItemKey): Promise<ReadinessItem> {
  const item = await getItemByKey(engagementId, key)
  if (!item) {
    throw new Error(`Readiness item '${key}' not found for engagement ${engagementId}`)
  }
  return item
}

/** Mark an item complete. Clears any waiver. */
export async function markItemComplete(
  engagementId: string,
  key: ReadinessItemKey,
  actor: Actor,
): Promise<ReadinessItem> {
  await query(
    `UPDATE readiness_checklist_items
     SET status = 'complete',
         completed_by = $3,
         completed_by_email = $4,
         completed_at = NOW(),
         waived_by = NULL,
         waived_by_email = NULL,
         waived_at = NULL,
         waiver_reason = NULL,
         updated_at = NOW()
     WHERE engagement_id = $1 AND item_key = $2`,
    [engagementId, key, actor.name, actor.email],
  )
  return requireItem(engagementId, key)
}

/**
 * Clear completion. Status becomes `in_progress` if artifacts exist,
 * otherwise `not_started`.
 */
export async function unmarkItemComplete(
  engagementId: string,
  key: ReadinessItemKey,
): Promise<ReadinessItem> {
  const current = await requireItem(engagementId, key)
  const hasArtifacts = current.artifacts.length > 0
  const newStatus: ReadinessItemStatus = hasArtifacts ? 'in_progress' : 'not_started'
  await query(
    `UPDATE readiness_checklist_items
     SET status = $3,
         completed_by = NULL,
         completed_by_email = NULL,
         completed_at = NULL,
         updated_at = NOW()
     WHERE engagement_id = $1 AND item_key = $2`,
    [engagementId, key, newStatus],
  )
  return requireItem(engagementId, key)
}

/** Apply a waiver. Reason length validation is the caller's responsibility. */
export async function waiveItem(
  engagementId: string,
  key: ReadinessItemKey,
  reason: string,
  actor: Actor,
): Promise<ReadinessItem> {
  await query(
    `UPDATE readiness_checklist_items
     SET status = 'waived',
         waived_by = $3,
         waived_by_email = $4,
         waived_at = NOW(),
         waiver_reason = $5,
         completed_by = NULL,
         completed_by_email = NULL,
         completed_at = NULL,
         updated_at = NOW()
     WHERE engagement_id = $1 AND item_key = $2`,
    [engagementId, key, actor.name, actor.email, reason],
  )
  return requireItem(engagementId, key)
}

/**
 * Revoke a waiver. Status becomes `in_progress` if artifacts exist,
 * otherwise `not_started`.
 */
export async function unwaiveItem(
  engagementId: string,
  key: ReadinessItemKey,
): Promise<ReadinessItem> {
  const current = await requireItem(engagementId, key)
  const hasArtifacts = current.artifacts.length > 0
  const newStatus: ReadinessItemStatus = hasArtifacts ? 'in_progress' : 'not_started'
  await query(
    `UPDATE readiness_checklist_items
     SET status = $3,
         waived_by = NULL,
         waived_by_email = NULL,
         waived_at = NULL,
         waiver_reason = NULL,
         updated_at = NOW()
     WHERE engagement_id = $1 AND item_key = $2`,
    [engagementId, key, newStatus],
  )
  return requireItem(engagementId, key)
}

/**
 * Persist an artifact blob. Also advances the item status to `in_progress`
 * if it was `not_started`. Runs in a transaction so the metadata row and
 * the status update are atomic.
 */
export async function addArtifact(
  itemId: string,
  input: ArtifactInput,
): Promise<ReadinessArtifact> {
  const client = await getClient()
  try {
    await client.query('BEGIN')
    const artifactResult = await client.query(
      `INSERT INTO readiness_artifacts
         (item_id, filename, mime_type, size_bytes, content, description,
          uploaded_by, uploaded_by_email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, item_id, filename, mime_type, size_bytes, description,
                 uploaded_by, uploaded_by_email, uploaded_at`,
      [
        itemId,
        input.filename,
        input.mimeType,
        input.sizeBytes,
        input.content,
        input.description ?? null,
        input.uploadedBy,
        input.uploadedByEmail,
      ],
    )
    await client.query(
      `UPDATE readiness_checklist_items
       SET status = 'in_progress', updated_at = NOW()
       WHERE id = $1 AND status = 'not_started'`,
      [itemId],
    )
    await client.query('COMMIT')
    return mapArtifact(artifactResult.rows[0] as ArtifactRow)
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

/** Remove an artifact row. Caller handles audit + authorization. */
export async function removeArtifact(artifactId: string): Promise<void> {
  await query(`DELETE FROM readiness_artifacts WHERE id = $1`, [artifactId])
}

/** Download-path only: read the bytea blob. */
export async function getArtifactContent(
  artifactId: string,
): Promise<{ filename: string; mimeType: string; content: Buffer } | null> {
  const result = await query(
    `SELECT filename, mime_type, content
     FROM readiness_artifacts
     WHERE id = $1`,
    [artifactId],
  )
  const row = result.rows[0] as { filename: string; mime_type: string; content: Buffer } | undefined
  if (!row) return null
  return {
    filename: row.filename,
    mimeType: row.mime_type,
    content: row.content,
  }
}
