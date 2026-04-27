/**
 * Data access for engagement tags (team-visible labels).
 * Color is stored per (engagement_id, label) — re-adding a tag updates color.
 */

import { query } from './db'
import type { EngagementTag, TagColor } from './personal-views-types'

interface TagRow {
  engagement_id: string
  label: string
  color: TagColor
  created_by: string
  created_at: string | Date
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value
}

function mapTag(row: TagRow): EngagementTag {
  return {
    engagementId: row.engagement_id,
    label: row.label,
    color: row.color,
    createdBy: row.created_by,
    createdAt: toIso(row.created_at),
  }
}

/** Tags for a single engagement, ordered by label. */
export async function listTagsForEngagement(
  engagementId: string,
): Promise<EngagementTag[]> {
  const result = await query(
    `SELECT engagement_id, label, color, created_by, created_at
     FROM engagement_tags
     WHERE engagement_id = $1
     ORDER BY label ASC`,
    [engagementId],
  )
  return (result.rows as TagRow[]).map(mapTag)
}

/**
 * Single-query bulk fetch: every tag in the system, grouped by engagement_id.
 * Used by the engagements list to render tags without N+1 queries.
 */
export async function listAllTagsByEngagement(): Promise<
  Record<string, EngagementTag[]>
> {
  const result = await query(
    `SELECT engagement_id, label, color, created_by, created_at
     FROM engagement_tags
     ORDER BY engagement_id ASC, label ASC`,
  )
  const out: Record<string, EngagementTag[]> = {}
  for (const row of result.rows as TagRow[]) {
    const tag = mapTag(row)
    if (!out[tag.engagementId]) out[tag.engagementId] = []
    out[tag.engagementId].push(tag)
  }
  return out
}

/** Distinct labels used anywhere, alphabetically sorted. */
export async function listAllLabels(): Promise<string[]> {
  const result = await query(
    `SELECT DISTINCT label
     FROM engagement_tags
     ORDER BY label ASC`,
  )
  return (result.rows as Array<{ label: string }>).map((r) => r.label)
}

/**
 * Upsert a tag on (engagement_id, label). Re-adding updates color and
 * created_by — created_at is preserved on conflict.
 */
export async function addTag(input: {
  engagementId: string
  label: string
  color: TagColor
  createdBy: string
}): Promise<EngagementTag> {
  const result = await query(
    `INSERT INTO engagement_tags (engagement_id, label, color, created_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (engagement_id, label) DO UPDATE
       SET color = EXCLUDED.color,
           created_by = EXCLUDED.created_by
     RETURNING engagement_id, label, color, created_by, created_at`,
    [input.engagementId, input.label, input.color, input.createdBy],
  )
  return mapTag(result.rows[0] as TagRow)
}

/** Idempotent: removing a non-existent tag is a no-op. */
export async function removeTag(
  engagementId: string,
  label: string,
): Promise<void> {
  await query(
    `DELETE FROM engagement_tags
     WHERE engagement_id = $1 AND label = $2`,
    [engagementId, label],
  )
}
