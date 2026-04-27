/**
 * Data access for per-user engagement snoozes.
 * A snooze hides an engagement from the user's default list view until a
 * specified date. Each (user, engagement) pair has at most one snooze.
 */

import { query } from './db'
import type { ActiveSnooze } from './personal-views-types'

interface SnoozeRow {
  engagement_id: string
  hidden_until: string | Date
  reason: string | null
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value
}

/**
 * Active (still-hidden) snoozes for the user. The optional `now` argument
 * exists for testability; in production it defaults to the current time.
 */
export async function listActiveSnoozes(
  userId: string,
  now: Date = new Date(),
): Promise<ActiveSnooze[]> {
  const result = await query(
    `SELECT engagement_id, hidden_until, reason
     FROM engagement_snoozes
     WHERE user_id = $1 AND hidden_until > $2
     ORDER BY hidden_until ASC`,
    [userId, now.toISOString()],
  )
  return (result.rows as SnoozeRow[]).map((row) => ({
    engagementId: row.engagement_id,
    hiddenUntil: toIso(row.hidden_until),
    reason: row.reason,
  }))
}

/**
 * Upsert a snooze. Re-snoozing the same engagement overwrites the prior
 * hidden_until and reason.
 */
export async function snooze(input: {
  userId: string
  engagementId: string
  hiddenUntil: Date
  reason?: string | null
}): Promise<void> {
  await query(
    `INSERT INTO engagement_snoozes (user_id, engagement_id, hidden_until, reason)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, engagement_id) DO UPDATE
       SET hidden_until = EXCLUDED.hidden_until,
           reason = EXCLUDED.reason`,
    [
      input.userId,
      input.engagementId,
      input.hiddenUntil.toISOString(),
      input.reason ?? null,
    ],
  )
}

/** Idempotent: removing a non-existent snooze is a no-op. */
export async function unsnooze(
  userId: string,
  engagementId: string,
): Promise<void> {
  await query(
    `DELETE FROM engagement_snoozes
     WHERE user_id = $1 AND engagement_id = $2`,
    [userId, engagementId],
  )
}
