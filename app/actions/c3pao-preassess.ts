'use server'

/**
 * Customer readiness coordination server actions.
 *
 * Surfaces the OSC-maintained readiness list so the C3PAO can confirm
 * each item during pre-assessment review. The original "pre-assess
 * checklist" (fetchPreAssess / updatePreAssess) has been retired — the
 * replacement lives in `c3pao-readiness.ts` and uses the local Postgres
 * readiness items table.
 */

import { requireAuth } from '@/lib/auth'
import {
  fetchCustomerReadiness,
  confirmCustomerReadinessItem as apiConfirmCustomerReadinessItem,
  type CustomerReadinessItem,
  type CustomerReadinessItemType,
} from '@/lib/api-client'

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
