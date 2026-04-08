'use server'

/**
 * QA review queue server actions for the CAP v2.0 Phase 1 / Phase 3
 * independent reviewer workflow (Task 11a).
 */

import { requireAuth } from '@/lib/auth'
import {
  fetchQAReviews,
  fetchEngagementQAReviews,
  createQAReview as apiCreateQAReview,
  updateQAReview as apiUpdateQAReview,
  type QAReview,
  type CreateQAReviewInput,
  type UpdateQAReviewInput,
} from '@/lib/api-client'

export interface QAReviewListResponse {
  success: boolean
  data?: QAReview[]
  error?: string
}

export interface QAReviewResponse {
  success: boolean
  data?: QAReview
  error?: string
}

/** List QA reviews. Pass `mine=true` to restrict to current user's assignments. */
export async function getQAReviews(mine = false): Promise<QAReviewListResponse> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await fetchQAReviews(session.apiToken, mine)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to load QA reviews',
    }
  }
}

/** List QA reviews for a specific engagement. */
export async function getEngagementQAReviews(
  engagementId: string,
): Promise<QAReviewListResponse> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await fetchEngagementQAReviews(engagementId, session.apiToken)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to load engagement QA reviews',
    }
  }
}

/** Create a new QA review with independent-reviewer enforcement. */
export async function createQAReviewAction(
  engagementId: string,
  input: CreateQAReviewInput,
): Promise<QAReviewResponse> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await apiCreateQAReview(engagementId, input, session.apiToken)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create QA review',
    }
  }
}

/** Update a QA review's status or notes. */
export async function updateQAReviewAction(
  reviewId: string,
  input: UpdateQAReviewInput,
): Promise<QAReviewResponse> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await apiUpdateQAReview(reviewId, input, session.apiToken)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update QA review',
    }
  }
}
