'use server'

/**
 * CAP v2.0 phase + lifecycle server actions.
 *
 * Thin wrappers around the Go API phase endpoints used by the pre-assessment
 * workspace (Task 9), the kanban board drag-drop (Task 8 upgrade path), and
 * the engagement detail lifecycle stepper (Task 14).
 */

import { requireAuth } from '@/lib/auth'
import {
  fetchEngagementPhase,
  updateEngagementPhase as apiUpdateEngagementPhase,
  fetchEngagementLifecycle,
  type EngagementPhase,
  type EngagementPhaseName,
  type LifecycleEvent,
} from '@/lib/api-client'

export interface EngagementPhaseResponse {
  success: boolean
  data?: EngagementPhase
  error?: string
}

export interface LifecycleResponse {
  success: boolean
  data?: LifecycleEvent[]
  error?: string
}

/** Fetch the full phase + lifecycle metadata for an engagement. */
export async function getEngagementPhase(
  engagementId: string,
): Promise<EngagementPhaseResponse> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await fetchEngagementPhase(engagementId, session.apiToken)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to load engagement phase',
    }
  }
}

/**
 * Transition an engagement to the given CAP phase. Returns the updated
 * phase metadata on success, or a structured error on invalid transitions.
 */
export async function updateEngagementPhase(
  engagementId: string,
  phase: EngagementPhaseName,
): Promise<EngagementPhaseResponse> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await apiUpdateEngagementPhase(
      engagementId,
      phase,
      session.apiToken,
    )
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update phase',
    }
  }
}

/** Fetch the chronological lifecycle timeline for the engagement stepper. */
export async function getEngagementLifecycle(
  engagementId: string,
): Promise<LifecycleResponse> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await fetchEngagementLifecycle(engagementId, session.apiToken)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to load lifecycle',
    }
  }
}
