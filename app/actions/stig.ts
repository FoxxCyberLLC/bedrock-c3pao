'use server'

import { requireAuth } from '@/lib/auth'
import {
  fetchSTIGs,
  fetchSTIGTargetDetail,
  type STIGTargetDetail,
} from '@/lib/api-client'
import type { STIGStatistics, STIGTargetWithStats } from '@/lib/stig/types'

// The C3PAO does NOT import, upload, link, delete, or otherwise mutate STIG data.
// All STIG authoring is OSC-owned. These two reads expose what the OSC has imported
// so the assessor can review results during assessment.

export async function getSTIGTargets(
  engagementId: string,
): Promise<{
  success: boolean
  data?: STIGTargetWithStats[]
  error?: string
}> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const stigs = await fetchSTIGs(engagementId, session.apiToken)
    return {
      success: true,
      data: (stigs.targets || []) as unknown as STIGTargetWithStats[],
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load STIGs',
    }
  }
}

export async function getSTIGTargetDetail(
  engagementId: string,
  targetId: string,
): Promise<{ success: boolean; data?: STIGTargetDetail; error?: string }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const detail = await fetchSTIGTargetDetail(
      engagementId,
      targetId,
      session.apiToken,
    )
    return { success: true, data: detail }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to load STIG target detail',
    }
  }
}

export async function getSTIGStatistics(
  engagementId: string,
): Promise<{
  success: boolean
  data?: STIGStatistics
  error?: string
}> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const stigs = await fetchSTIGs(engagementId, session.apiToken)
    const defaultStats: STIGStatistics = {
      totalTargets: 0,
      totalChecklists: 0,
      totalRules: 0,
      byStatus: { OPEN: 0, NOT_A_FINDING: 0, NOT_APPLICABLE: 0, NOT_REVIEWED: 0 },
      bySeverity: { HIGH: 0, MEDIUM: 0, LOW: 0 },
      compliancePercentage: 0,
      recentImports: [],
    }
    return {
      success: true,
      data: { ...defaultStats, ...(stigs.statistics || {}) } as STIGStatistics,
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to load STIG statistics',
    }
  }
}
