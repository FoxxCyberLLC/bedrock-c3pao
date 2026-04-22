'use server'

/**
 * Pre-assessment readiness checklist server actions for the CAP v2.0
 * Phase 1 workspace (Task 9).
 */

import { requireAuth } from '@/lib/auth'
import {
  fetchPreAssess,
  updatePreAssess as apiUpdatePreAssess,
  fetchCustomerReadiness,
  confirmCustomerReadinessItem as apiConfirmCustomerReadinessItem,
  type PreAssessChecklist,
  type UpdatePreAssessInput,
  type CustomerReadinessItem,
  type CustomerReadinessItemType,
} from '@/lib/api-client'

export interface PreAssessResponse {
  success: boolean
  data?: PreAssessChecklist
  error?: string
}

export interface CustomerReadinessResponse {
  success: boolean
  data?: CustomerReadinessItem[]
  error?: string
}

export interface CustomerReadinessItemResponse {
  success: boolean
  data?: CustomerReadinessItem
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

/** Fetch the OSC's contractor-readiness list for this engagement. */
export async function getCustomerReadiness(
  engagementId: string,
): Promise<CustomerReadinessResponse> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await fetchCustomerReadiness(engagementId, session.apiToken)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to load customer readiness',
    }
  }
}

/** Confirm a single customer readiness item as reviewed by the C3PAO. */
export async function confirmCustomerReadiness(
  engagementId: string,
  itemType: CustomerReadinessItemType,
): Promise<CustomerReadinessItemResponse> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await apiConfirmCustomerReadinessItem(
      engagementId,
      itemType,
      session.apiToken,
    )
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to confirm readiness item',
    }
  }
}
