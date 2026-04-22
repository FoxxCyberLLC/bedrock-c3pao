/**
 * C3PAO-internal review thread storage.
 *
 * Per CAP v2.0, C3PAO assessors may only return MET / NOT_MET verdicts to the
 * contractor — no comments, remediation guidance, or feedback. So the internal
 * notes the assessment team shares while reviewing evidence/diagrams are kept
 * strictly inside the VDI container. These never leave the local Postgres and
 * are not round-tripped through the Go API.
 */

import { randomUUID } from 'node:crypto'
import { ensureSchema, query } from './db'

export type InternalReviewEntityType = 'EVIDENCE' | 'SSP_DIAGRAM'

export interface InternalReview {
  id: string
  engagementId: string
  entityType: InternalReviewEntityType
  entityId: string
  reviewerId: string
  reviewerName: string
  reviewedAt: string
  comment: string | null
  createdAt: string
}

function rowToReview(row: Record<string, unknown>): InternalReview {
  return {
    id: String(row.id),
    engagementId: String(row.engagement_id),
    entityType: row.entity_type as InternalReviewEntityType,
    entityId: String(row.entity_id),
    reviewerId: String(row.reviewer_id),
    reviewerName: String(row.reviewer_name),
    reviewedAt: new Date(row.reviewed_at as string).toISOString(),
    comment: (row.comment as string | null) ?? null,
    createdAt: new Date(row.created_at as string).toISOString(),
  }
}

/** List every review/comment for one entity in chronological order. */
export async function listInternalReviews(
  engagementId: string,
  entityType: InternalReviewEntityType,
  entityId: string,
): Promise<InternalReview[]> {
  await ensureSchema()
  const result = await query(
    `SELECT id, engagement_id, entity_type, entity_id,
            reviewer_id, reviewer_name, reviewed_at, comment, created_at
       FROM c3pao_internal_reviews
      WHERE engagement_id = $1 AND entity_type = $2 AND entity_id = $3
      ORDER BY created_at ASC`,
    [engagementId, entityType, entityId],
  )
  return result.rows.map(rowToReview)
}

/** Add a new review/comment entry. Comment is optional — a null comment is a pure "mark reviewed" record. */
export async function createInternalReview(input: {
  engagementId: string
  entityType: InternalReviewEntityType
  entityId: string
  reviewerId: string
  reviewerName: string
  comment: string | null
}): Promise<InternalReview> {
  await ensureSchema()
  const id = randomUUID()
  const result = await query(
    `INSERT INTO c3pao_internal_reviews
       (id, engagement_id, entity_type, entity_id,
        reviewer_id, reviewer_name, comment)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, engagement_id, entity_type, entity_id,
               reviewer_id, reviewer_name, reviewed_at, comment, created_at`,
    [
      id,
      input.engagementId,
      input.entityType,
      input.entityId,
      input.reviewerId,
      input.reviewerName,
      input.comment,
    ],
  )
  return rowToReview(result.rows[0])
}

/** Delete an entry. Only the original reviewer may delete their own entries. */
export async function deleteInternalReview(id: string, reviewerId: string): Promise<boolean> {
  await ensureSchema()
  const result = await query(
    `DELETE FROM c3pao_internal_reviews
      WHERE id = $1 AND reviewer_id = $2`,
    [id, reviewerId],
  )
  return (result.rowCount ?? 0) > 0
}

/**
 * Compact summary of review state across many entities — used to badge list
 * views ("3 reviewed of 12 evidence files"). One query, groups by entity_id.
 */
export interface ReviewSummary {
  entityId: string
  reviewCount: number
  latestReviewedAt: string
  latestReviewerName: string
}

export async function summarizeReviews(
  engagementId: string,
  entityType: InternalReviewEntityType,
  entityIds: string[],
): Promise<Map<string, ReviewSummary>> {
  const map = new Map<string, ReviewSummary>()
  if (entityIds.length === 0) return map
  await ensureSchema()
  const result = await query(
    `SELECT entity_id,
            COUNT(*)::int AS review_count,
            MAX(reviewed_at) AS latest_reviewed_at,
            (SELECT reviewer_name
               FROM c3pao_internal_reviews r2
              WHERE r2.engagement_id = r1.engagement_id
                AND r2.entity_type = r1.entity_type
                AND r2.entity_id = r1.entity_id
              ORDER BY reviewed_at DESC
              LIMIT 1) AS latest_reviewer_name
       FROM c3pao_internal_reviews r1
      WHERE engagement_id = $1 AND entity_type = $2 AND entity_id = ANY($3::text[])
      GROUP BY entity_id, engagement_id, entity_type`,
    [engagementId, entityType, entityIds],
  )
  for (const row of result.rows) {
    map.set(String(row.entity_id), {
      entityId: String(row.entity_id),
      reviewCount: Number(row.review_count),
      latestReviewedAt: new Date(row.latest_reviewed_at as string).toISOString(),
      latestReviewerName: String(row.latest_reviewer_name),
    })
  }
  return map
}
