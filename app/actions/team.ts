'use server'

import { requireAuth } from '@/lib/auth'
import { getTeam } from '@/lib/cache'

export async function getEngagementTeamData(engagementId: string) {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const team = await getTeam(engagementId, session.saasToken)
    return { success: true, data: team }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load team' }
  }
}

// Workload data is read-only from SaaS in the standalone
export async function getWorkloadData() {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }

    // Workload is aggregated from engagements
    return { success: true, data: null as any }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load workload' }
  }
}
