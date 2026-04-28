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
  fetchTeam,
  fetchWorkload,
  updateAssessorSkills as apiUpdateSkills,
  type AssessorWorkloadItem,
  type AssessorSkillItem,
  type TeamMember,
} from '@/lib/api-client'
import {
  collectActiveEngagementIds,
  deriveAssessorActivity,
  type AssessorActivityItem,
} from '@/lib/workload/assessment-activity'

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

export interface AssessmentActivityResponse {
  success: boolean
  data?: AssessorActivityItem[]
  error?: string
}

/**
 * Build the per-assessor "Assessment Activity" rows for the workload page.
 *
 * Strategy: pull the workload payload (which already carries
 * `objectivesAssessed` and the engagement list per assessor), then fan out
 * `fetchTeam` for each unique active engagement to recover the per-engagement
 * domain assignments. We union the assignments across all of an assessor's
 * active engagements to get their currently-assigned CMMC family set.
 *
 * Failures from individual `fetchTeam` calls are treated as "no domain data
 * for that engagement" rather than fatal — the rest of the row still renders.
 */
export async function getC3PAOAssessmentActivity(): Promise<AssessmentActivityResponse> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const assessors = await fetchWorkload(session.apiToken)
    const engagementIds = collectActiveEngagementIds(assessors)

    const teamResults = await Promise.all(
      engagementIds.map(async (id) => {
        try {
          const team = await fetchTeam(id, session.apiToken)
          return [id, team] as const
        } catch {
          return [id, [] as TeamMember[]] as const
        }
      }),
    )
    const teamsByEngagement = new Map<string, TeamMember[]>(teamResults)

    const data = assessors.map((a) =>
      deriveAssessorActivity(a, teamsByEngagement),
    )
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to load assessment activity',
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
