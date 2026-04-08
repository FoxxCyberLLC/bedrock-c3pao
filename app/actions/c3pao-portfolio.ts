'use server'

/**
 * C3PAO portfolio server actions.
 *
 * Thin wrappers around the Go API portfolio endpoints for the lead-assessor
 * dashboard KPI hero, the kanban board (Task 5), and the engagements list
 * rebuild (Task 7).
 */

import { requireAuth } from '@/lib/auth'
import {
  fetchPortfolioStats,
  fetchPortfolioList,
  fetchTeam,
  addTeamMember,
  updateTeamMemberRole,
  type PortfolioStats,
  type PortfolioListItem,
} from '@/lib/api-client'

export interface PortfolioStatsResponse {
  success: boolean
  data?: PortfolioStats
  error?: string
}

export interface PortfolioListResponse {
  success: boolean
  data?: PortfolioListItem[]
  error?: string
}

/** Fetch the KPI rollup for the lead-assessor dashboard. */
export async function getPortfolioStats(): Promise<PortfolioStatsResponse> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await fetchPortfolioStats(session.apiToken)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to load portfolio stats',
    }
  }
}

/**
 * Fetch the engagement list with pre-joined per-row progress stats.
 * Replaces the N+1 per-card fetchStats pattern on the kanban board.
 */
export async function getPortfolioList(): Promise<PortfolioListResponse> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await fetchPortfolioList(session.apiToken)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to load portfolio list',
    }
  }
}

/**
 * Assign (or re-assign) a lead assessor to a batch of engagements.
 *
 * Used by the engagements list rebuild's bulk-action bar. For each
 * engagement we:
 *   1. Load the current team
 *   2. If the target user is not on the team yet, add them as LEAD
 *   3. Otherwise update their existing role to LEAD
 *
 * Errors on individual engagements are captured and returned so the UI
 * can display partial success.
 */
export async function bulkUpdateLead(
  engagementIds: readonly string[],
  newLeadAssessorId: string,
): Promise<{
  success: boolean
  succeeded: string[]
  failed: { id: string; error: string }[]
  error?: string
}> {
  try {
    const session = await requireAuth()
    if (!session) {
      return {
        success: false,
        succeeded: [],
        failed: [],
        error: 'Unauthorized',
      }
    }
    if (engagementIds.length === 0) {
      return { success: true, succeeded: [], failed: [] }
    }

    const succeeded: string[] = []
    const failed: { id: string; error: string }[] = []

    for (const engagementId of engagementIds) {
      try {
        const team = await fetchTeam(engagementId, session.apiToken)
        const existing = team.find((m) => m.assessorId === newLeadAssessorId)
        if (existing) {
          await updateTeamMemberRole(
            engagementId,
            newLeadAssessorId,
            'LEAD',
            session.apiToken,
          )
        } else {
          await addTeamMember(
            engagementId,
            { assessorId: newLeadAssessorId, role: 'LEAD' },
            session.apiToken,
          )
        }
        succeeded.push(engagementId)
      } catch (error) {
        failed.push({
          id: engagementId,
          error:
            error instanceof Error ? error.message : 'unknown error',
        })
      }
    }

    return { success: failed.length === 0, succeeded, failed }
  } catch (error) {
    return {
      success: false,
      succeeded: [],
      failed: [],
      error:
        error instanceof Error ? error.message : 'Failed to bulk update lead',
    }
  }
}
