'use server'

/**
 * Engagement comments server actions (Task 13a).
 */

import { requireAuth } from '@/lib/auth'
import {
  fetchEngagementComments,
  createEngagementComment as apiCreateComment,
  type EngagementCommentItem,
  type CreateCommentInput,
} from '@/lib/api-client'

export interface CommentListResponse {
  success: boolean
  data?: EngagementCommentItem[]
  error?: string
}

export interface CommentResponse {
  success: boolean
  data?: EngagementCommentItem
  error?: string
}

/** Fetch the comment thread for an engagement. */
export async function getEngagementComments(
  engagementId: string,
): Promise<CommentListResponse> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await fetchEngagementComments(engagementId, session.apiToken)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to load comments',
    }
  }
}

/** Post a new comment (with optional @mention array). */
export async function createEngagementCommentAction(
  engagementId: string,
  input: CreateCommentInput,
): Promise<CommentResponse> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await apiCreateComment(engagementId, input, session.apiToken)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to post comment',
    }
  }
}
