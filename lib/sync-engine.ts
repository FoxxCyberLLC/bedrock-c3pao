/**
 * Sync Engine
 *
 * Background synchronization between the local SQLite database and the SaaS platform.
 * - Pull cycle: refresh cached engagement data from SaaS
 * - Push cycle: drain the sync queue, pushing local findings/reports to SaaS
 * - Offline resilience: queues writes locally when SaaS is unreachable
 */

import {
  getPendingSyncItems,
  markSyncSuccess,
  markSyncFailed,
  getSyncQueueCount,
  setMeta,
  getMeta,
} from './db'
import {
  pushFinding,
  pushReport,
  pushEngagementStatus,
  sendHeartbeat,
  type FindingPayload,
  ApiError,
} from './api-client'

export type SyncStatus = 'idle' | 'syncing' | 'pending' | 'offline' | 'error'

let currentStatus: SyncStatus = 'idle'
let syncInterval: ReturnType<typeof setInterval> | null = null

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncStatus {
  const pendingCount = getSyncQueueCount()
  if (currentStatus === 'offline') return 'offline'
  if (currentStatus === 'syncing') return 'syncing'
  if (pendingCount > 0) return 'pending'
  return 'idle'
}

/**
 * Get count of pending sync items
 */
export function getPendingCount(): number {
  return getSyncQueueCount()
}

/**
 * Get timestamp of last successful sync
 */
export function getLastSyncTime(): string | null {
  return getMeta('last_sync_at') || null
}

/**
 * Run one push cycle — drain pending items from the sync queue
 */
export async function pushCycle(assessorToken: string): Promise<{ pushed: number; failed: number }> {
  const items = getPendingSyncItems(50)
  let pushed = 0
  let failed = 0

  for (const item of items) {
    try {
      const payload = JSON.parse(item.payload)

      switch (item.entity_type) {
        case 'finding':
          await pushFinding(
            item.engagement_id || payload.engagementId,
            payload as FindingPayload,
            assessorToken
          )
          break

        case 'report':
          await pushReport(
            item.engagement_id || payload.engagementId,
            payload,
            assessorToken
          )
          break

        case 'status':
          await pushEngagementStatus(
            item.engagement_id || payload.engagementId,
            payload.status,
            assessorToken
          )
          break

        default:
          console.warn(`Unknown sync entity type: ${item.entity_type}`)
          markSyncFailed(item.id, `Unknown entity type: ${item.entity_type}`)
          failed++
          continue
      }

      markSyncSuccess(item.id)
      pushed++
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'

      if (error instanceof ApiError && error.status === 409) {
        // Conflict — the SaaS has a newer version
        // Mark as failed with conflict info so UI can prompt resolution
        markSyncFailed(item.id, `CONFLICT: ${message}`)
      } else {
        markSyncFailed(item.id, message)
      }

      failed++

      // If we get a network error, stop trying — we're probably offline
      if (!(error instanceof ApiError)) {
        currentStatus = 'offline'
        break
      }
    }
  }

  if (pushed > 0) {
    setMeta('last_sync_at', new Date().toISOString())
  }

  return { pushed, failed }
}

/**
 * Run a heartbeat check to verify SaaS connectivity
 */
export async function heartbeat(): Promise<boolean> {
  try {
    await sendHeartbeat()
    if (currentStatus === 'offline') {
      currentStatus = 'idle'
    }
    setMeta('last_heartbeat_at', new Date().toISOString())
    return true
  } catch {
    currentStatus = 'offline'
    return false
  }
}

/**
 * Run a full sync cycle (heartbeat + push)
 */
export async function runSyncCycle(assessorToken: string): Promise<void> {
  if (currentStatus === 'syncing') return // Already running

  currentStatus = 'syncing'

  try {
    // Check connectivity first
    const online = await heartbeat()

    if (online) {
      // Push pending changes
      await pushCycle(assessorToken)
    }
  } catch (error) {
    console.error('Sync cycle error:', error)
    currentStatus = 'error'
  } finally {
    if (currentStatus === 'syncing') {
      currentStatus = getSyncQueueCount() > 0 ? 'pending' : 'idle'
    }
  }
}

/**
 * Start the background sync loop
 */
export function startSyncLoop(getToken: () => string | null): void {
  if (syncInterval) return // Already running

  const intervalMs = parseInt(process.env.SYNC_INTERVAL_MS || '30000', 10)

  syncInterval = setInterval(async () => {
    const token = getToken()
    if (token) {
      await runSyncCycle(token)
    }
  }, intervalMs)
}

/**
 * Stop the background sync loop
 */
export function stopSyncLoop(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}
