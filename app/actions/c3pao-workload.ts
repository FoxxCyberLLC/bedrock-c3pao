'use server'

/**
 * C3PAO workload server actions.
 *
 * Task 12: the Go API workload endpoint now returns the full shape
 * (pending/completed counts, per-assessor engagement list, skills, cert
 * expiry). This module just wraps it with the standard server-action
 * shape. The previous hard-coded zero mapping (pendingEngagements: 0,
 * completedEngagements: 0, engagements: []) is gone.
 */

import { requireAuth } from '@/lib/auth'
import {
  fetchWorkload,
  updateAssessorSkills as apiUpdateSkills,
  type AssessorWorkloadItem,
  type AssessorSkillItem,
} from '@/lib/api-client'

export interface WorkloadOverview {
  assessors: AssessorWorkloadItem[]
  totalAssessors: number
  totalActiveEngagements: number
  totalPendingEngagements: number
  totalCompletedEngagements: number
}

export interface WorkloadOverviewResponse {
  success: boolean
  data?: WorkloadOverview
  error?: string
}

export async function getC3PAOWorkloadOverview(): Promise<WorkloadOverviewResponse> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const assessors = await fetchWorkload(session.apiToken)
    const overview: WorkloadOverview = {
      assessors,
      totalAssessors: assessors.length,
      totalActiveEngagements: assessors.reduce(
        (sum, a) => sum + (a.activeEngagements ?? 0),
        0,
      ),
      totalPendingEngagements: assessors.reduce(
        (sum, a) => sum + (a.pendingEngagements ?? 0),
        0,
      ),
      totalCompletedEngagements: assessors.reduce(
        (sum, a) => sum + (a.completedEngagements ?? 0),
        0,
      ),
    }
    return { success: true, data: overview }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to load workload overview',
    }
  }
}

/** Get a single assessor's workload detail (just a filter over the list). */
export async function getAssessorWorkload(
  assessorId: string,
): Promise<{ success: boolean; data?: AssessorWorkloadItem; error?: string }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const assessors = await fetchWorkload(session.apiToken)
    const match = assessors.find((a) => a.assessorId === assessorId)
    if (!match) return { success: false, error: 'Assessor not found' }
    return { success: true, data: match }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to load assessor workload',
    }
  }
}

/** Update an assessor's skill matrix. */
export async function updateAssessorSkillsAction(
  assessorId: string,
  skills: AssessorSkillItem[],
): Promise<{
  success: boolean
  data?: AssessorSkillItem[]
  error?: string
}> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await apiUpdateSkills(assessorId, skills, session.apiToken)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update skills',
    }
  }
}
