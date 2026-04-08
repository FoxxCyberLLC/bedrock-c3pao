'use server'

/**
 * Conflicts of Interest register server actions.
 *
 * Wraps the Go API /coi endpoints for the /coi page, the pre-assessment
 * checklist derived "COI Cleared" item (Task 9), and the engagement-time
 * guard in assignAssessorToEngagement.
 */

import { requireAuth } from '@/lib/auth'
import {
  fetchCOIList,
  createCOI as apiCreateCOI,
  updateCOI as apiUpdateCOI,
  checkCOIAssignment,
  type COIDisclosure,
  type CheckCOIResult,
  type CreateCOIInput,
  type UpdateCOIInput,
} from '@/lib/api-client'

export interface COIListResponse {
  success: boolean
  data?: COIDisclosure[]
  error?: string
}

export interface COIDisclosureResponse {
  success: boolean
  data?: COIDisclosure
  error?: string
}

export interface CheckCOIResponse {
  success: boolean
  data?: CheckCOIResult
  error?: string
}

/** List every COI disclosure visible to the C3PAO (lead-only page). */
export async function getCOIList(): Promise<COIListResponse> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await fetchCOIList(session.apiToken)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load COI register',
    }
  }
}

/** Create a new disclosure (defaults to status ACTIVE). */
export async function createCOIDisclosure(
  input: CreateCOIInput,
): Promise<COIDisclosureResponse> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await apiCreateCOI(input, session.apiToken)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create disclosure',
    }
  }
}

/** Update a disclosure's status or details. */
export async function updateCOIDisclosure(
  id: string,
  input: UpdateCOIInput,
): Promise<COIDisclosureResponse> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await apiUpdateCOI(id, input, session.apiToken)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update disclosure',
    }
  }
}

/**
 * Engagement-time COI guard: returns the conflict status for assigning the
 * given assessor to the engagement. The Go API resolves the
 * engagement → customer → organization chain internally.
 */
export async function checkCOIForAssignment(
  engagementId: string,
  assessorId: string,
): Promise<CheckCOIResponse> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await checkCOIAssignment(
      engagementId,
      assessorId,
      session.apiToken,
    )
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check COI',
    }
  }
}
