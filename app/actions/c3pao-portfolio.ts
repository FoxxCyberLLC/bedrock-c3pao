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
