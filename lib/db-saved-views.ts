/**
 * Data access for per-user saved filter views on the engagements list.
 * Each row has a UUID id, a user_id (owner), a free-form name, and a
 * JSONB filter blob shaped by `SavedViewFilter`.
 */

import { query } from './db'
import type { SavedView, SavedViewFilter } from './personal-views-types'

interface SavedViewRow {
  id: string
  user_id: string
  name: string
  filter: SavedViewFilter
  created_at: string | Date
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value
}

function mapRow(row: SavedViewRow): SavedView {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    filter: row.filter,
    createdAt: toIso(row.created_at),
  }
}

/** Saved views for the user, ordered by created_at ascending. */
export async function listSavedViews(userId: string): Promise<SavedView[]> {
  const result = await query(
    `SELECT id, user_id, name, filter, created_at
     FROM engagement_saved_views
     WHERE user_id = $1
     ORDER BY created_at ASC`,
    [userId],
  )
  return (result.rows as SavedViewRow[]).map(mapRow)
}

export async function createSavedView(input: {
  userId: string
  name: string
  filter: SavedViewFilter
}): Promise<SavedView> {
  const result = await query(
    `INSERT INTO engagement_saved_views (user_id, name, filter)
     VALUES ($1, $2, $3::jsonb)
     RETURNING id, user_id, name, filter, created_at`,
    [input.userId, input.name, JSON.stringify(input.filter)],
  )
  return mapRow(result.rows[0] as SavedViewRow)
}

/**
 * Update the name and/or filter for a saved view. Always scoped by user_id
 * so a user can only mutate their own views. If the patch contains neither
 * `name` nor `filter`, this is a no-op (the row is fetched and returned
 * unchanged).
 */
export async function updateSavedView(input: {
  id: string
  userId: string
  patch: Partial<{ name: string; filter: SavedViewFilter }>
}): Promise<SavedView> {
  const sets: string[] = []
  const params: unknown[] = []

  if (input.patch.name !== undefined) {
    params.push(input.patch.name)
    sets.push(`name = $${params.length}`)
  }
  if (input.patch.filter !== undefined) {
    params.push(JSON.stringify(input.patch.filter))
    sets.push(`filter = $${params.length}::jsonb`)
  }

  if (sets.length === 0) {
    // No-op: just fetch and return current row (still user-scoped).
    params.push(input.id)
    const idIdx = params.length
    params.push(input.userId)
    const userIdx = params.length
    const result = await query(
      `SELECT id, user_id, name, filter, created_at
       FROM engagement_saved_views
       WHERE id = $${idIdx} AND user_id = $${userIdx}`,
      params,
    )
    const row = result.rows[0] as SavedViewRow | undefined
    if (!row) throw new Error('Saved view not found')
    return mapRow(row)
  }

  params.push(input.id)
  const idIdx = params.length
  params.push(input.userId)
  const userIdx = params.length

  const result = await query(
    `UPDATE engagement_saved_views
     SET ${sets.join(', ')}
     WHERE id = $${idIdx} AND user_id = $${userIdx}
     RETURNING id, user_id, name, filter, created_at`,
    params,
  )
  const row = result.rows[0] as SavedViewRow | undefined
  if (!row) throw new Error('Saved view not found')
  return mapRow(row)
}

/** User-scoped delete. Deleting another user's view affects zero rows. */
export async function deleteSavedView(
  id: string,
  userId: string,
): Promise<void> {
  await query(
    `DELETE FROM engagement_saved_views
     WHERE id = $1 AND user_id = $2`,
    [id, userId],
  )
}
