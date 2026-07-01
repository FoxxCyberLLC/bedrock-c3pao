'use server'

import { requireAuth } from '@/lib/auth'
import { isOffline } from '@/lib/mode'
import { setLocalAssessmentMode } from '@/lib/local/engagements'
import { toggleAssessmentMode as apiToggle } from '@/lib/api-client'

export async function toggleAssessmentMode(engagementId: string, active: boolean): Promise<{ success: boolean; assessmentModeActive: boolean; error?: string }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, assessmentModeActive: active, error: 'Unauthorized' }
    if (isOffline()) {
      await setLocalAssessmentMode(engagementId, active)
    } else {
      await apiToggle(engagementId, active, session.apiToken)
    }
    return { success: true, assessmentModeActive: active }
  } catch (error) {
    return { success: false, assessmentModeActive: !active, error: error instanceof Error ? error.message : 'Failed to toggle assessment mode' }
  }
}
