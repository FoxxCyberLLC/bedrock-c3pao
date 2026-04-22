'use server'

import { requireAuth } from '@/lib/auth'
import {
  fetchESPsForEngagement,
  fetchESPDetailForEngagement,
  type ESPView,
  type ESPDetailView,
} from '@/lib/api-client'

export async function getESPsByEngagement(
  engagementId: string,
): Promise<{ success: boolean; data?: ESPView[]; error?: string }> {
  const session = await requireAuth()
  if (!session) return { success: false, error: 'Unauthorized' }
  try {
    const esps = await fetchESPsForEngagement(engagementId, session.apiToken)
    return { success: true, data: esps }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load ESPs',
    }
  }
}

export async function getESPDetailForEngagement(
  engagementId: string,
  espId: string,
): Promise<{ success: boolean; data?: ESPDetailView; error?: string }> {
  const session = await requireAuth()
  if (!session) return { success: false, error: 'Unauthorized' }
  try {
    const esp = await fetchESPDetailForEngagement(
      engagementId,
      espId,
      session.apiToken,
    )
    return { success: true, data: esp }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to load ESP detail',
    }
  }
}
