'use server'

/**
 * Server Actions for the C3PAO-internal review thread (evidence + diagrams).
 *
 * These notes are never sent to the OSC or round-tripped through the Go API —
 * they live only in the container's local Postgres. See `lib/internal-reviews`
 * for the rationale (CAP v2.0 constraint).
 */

import { requireAuth } from '@/lib/auth'
import {
  listInternalReviews,
  createInternalReview,
  deleteInternalReview,
  summarizeReviews,
  type InternalReview,
  type InternalReviewEntityType,
  type ReviewSummary,
} from '@/lib/internal-reviews'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

export async function listEntityReviews(
  engagementId: string,
  entityType: InternalReviewEntityType,
  entityId: string,
): Promise<ActionResult<InternalReview[]>> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await listInternalReviews(engagementId, entityType, entityId)
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load reviews' }
  }
}

export async function addEntityReview(input: {
  engagementId: string
  entityType: InternalReviewEntityType
  entityId: string
  comment: string | null
}): Promise<ActionResult<InternalReview>> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const trimmed = input.comment?.trim() || null
    const data = await createInternalReview({
      engagementId: input.engagementId,
      entityType: input.entityType,
      entityId: input.entityId,
      reviewerId: session.c3paoUser.id,
      reviewerName: session.c3paoUser.name,
      comment: trimmed,
    })
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to save review' }
  }
}

export async function removeEntityReview(id: string): Promise<ActionResult<null>> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const ok = await deleteInternalReview(id, session.c3paoUser.id)
    if (!ok) return { success: false, error: 'Review not found or not owned by you' }
    return { success: true, data: null }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete review' }
  }
}

export async function summarizeEntityReviews(
  engagementId: string,
  entityType: InternalReviewEntityType,
  entityIds: string[],
): Promise<ActionResult<Record<string, ReviewSummary>>> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const map = await summarizeReviews(engagementId, entityType, entityIds)
    const obj: Record<string, ReviewSummary> = {}
    for (const [k, v] of map.entries()) obj[k] = v
    return { success: true, data: obj }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to summarize reviews' }
  }
}
