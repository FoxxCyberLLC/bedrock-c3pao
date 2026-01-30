'use server'

import { requireAuth } from '@/lib/auth'
import { getSyncStatus, getPendingCount, getLastSyncTime, runSyncCycle } from '@/lib/sync-engine'
import { clearCacheForEngagement } from '@/lib/db'

export async function getSyncInfo(): Promise<{
  status: string
  pendingCount: number
  lastSyncAt: string | null
}> {
  return {
    status: getSyncStatus(),
    pendingCount: getPendingCount(),
    lastSyncAt: getLastSyncTime(),
  }
}

export async function triggerSync(): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }

    await runSyncCycle(session.saasToken)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Sync failed' }
  }
}

export async function refreshEngagementCache(engagementId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }

    clearCacheForEngagement(engagementId)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to refresh cache' }
  }
}
