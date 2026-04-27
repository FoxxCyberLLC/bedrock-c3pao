/**
 * Data access for per-user pinned engagements.
 * Pins are personal watch-list entries — never shared across users.
 * All operations are idempotent.
 */

import { query } from './db'

interface PinRow {
  engagement_id: string
}

/** Returns engagement IDs for the user, most recently pinned first. */
export async function listPinnedIds(userId: string): Promise<string[]> {
  const result = await query(
    `SELECT engagement_id
     FROM engagement_pins
     WHERE user_id = $1
     ORDER BY pinned_at DESC`,
    [userId],
  )
  return (result.rows as PinRow[]).map((r) => r.engagement_id)
}

/** Idempotent: re-pinning the same engagement is a no-op. */
export async function pin(userId: string, engagementId: string): Promise<void> {
  await query(
    `INSERT INTO engagement_pins (user_id, engagement_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, engagement_id) DO NOTHING`,
    [userId, engagementId],
  )
}

/** Idempotent: unpinning a non-existent pin is a no-op. */
export async function unpin(userId: string, engagementId: string): Promise<void> {
  await query(
    `DELETE FROM engagement_pins
     WHERE user_id = $1 AND engagement_id = $2`,
    [userId, engagementId],
  )
}
