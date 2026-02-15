'use server'

import { requireAuth } from '@/lib/auth'
import { fetchTeam, fetchWorkload } from '@/lib/api-client'

export async function getEngagementTeamData(engagementId: string) {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const team = await fetchTeam(engagementId, session.apiToken)
    return { success: true, data: team }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load team' }
  }
}

export async function getWorkloadData() {
  try {
    const session = await requireAuth()
    if (!session) return { success: true, data: null }
    const workload = await fetchWorkload(session.apiToken)
    return { success: true, data: workload }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load workload' }
  }
}
