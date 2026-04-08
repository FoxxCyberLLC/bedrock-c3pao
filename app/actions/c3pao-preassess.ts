'use server'

/**
 * Pre-assessment readiness checklist server actions for the CAP v2.0
 * Phase 1 workspace (Task 9).
 */

import { requireAuth } from '@/lib/auth'
import {
  fetchPreAssess,
  updatePreAssess as apiUpdatePreAssess,
  type PreAssessChecklist,
  type UpdatePreAssessInput,
} from '@/lib/api-client'

export interface PreAssessResponse {
  success: boolean
  data?: PreAssessChecklist
  error?: string
}

/** Fetch the full pre-assessment readiness checklist for an engagement. */
export async function getPreAssessChecklist(
  engagementId: string,
): Promise<PreAssessResponse> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await fetchPreAssess(engagementId, session.apiToken)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to load pre-assessment checklist',
    }
  }
}

/** Toggle one or more manual checklist items. */
export async function updatePreAssessChecklist(
  engagementId: string,
  input: UpdatePreAssessInput,
): Promise<PreAssessResponse> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await apiUpdatePreAssess(
      engagementId,
      input,
      session.apiToken,
    )
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update checklist',
    }
  }
}
