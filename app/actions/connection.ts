'use server'

import { requireAuth } from '@/lib/auth'
import { apiClient } from '@/lib/api-client'
import { db } from '@/lib/db'
import { getSyncStatus, getPendingCount, getLastSyncTime, runSyncCycle } from '@/lib/sync-engine'

/**
 * Get the current connection status to the SaaS platform.
 */
export async function getConnectionStatus() {
  const session = await requireAuth()
  if (!session) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const saasUrl = process.env.SAAS_API_URL || 'Not configured'
    const apiKeyConfigured = !!process.env.INSTANCE_API_KEY
    const apiKeyPrefix = process.env.INSTANCE_API_KEY?.substring(0, 12) || ''

    // Get sync info from local DB
    const syncStatus = getSyncStatus()
    const pendingCount = getPendingCount()
    const lastSyncTime = getLastSyncTime()
    const lastHeartbeat = db.getMeta('last_heartbeat')
    const lastHeartbeatStatus = db.getMeta('last_heartbeat_status')
    const instanceName = db.getMeta('instance_name')

    return {
      success: true,
      data: {
        saasUrl,
        apiKeyConfigured,
        apiKeyPrefix,
        instanceName: instanceName || null,
        syncStatus,
        pendingCount,
        lastSyncTime,
        lastHeartbeat: lastHeartbeat || null,
        lastHeartbeatStatus: lastHeartbeatStatus || null,
      },
    }
  } catch (error) {
    console.error('Error getting connection status:', error)
    return { success: false, error: 'Failed to get connection status' }
  }
}

/**
 * Test the connection to the SaaS platform by sending a heartbeat.
 */
export async function testConnection() {
  const session = await requireAuth()
  if (!session) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const start = Date.now()
    const result = await apiClient.sendHeartbeat()
    const latencyMs = Date.now() - start

    // Store heartbeat result
    db.setMeta('last_heartbeat', new Date().toISOString())
    db.setMeta('last_heartbeat_status', 'connected')

    // Store instance info if returned
    if (result?.instanceId) {
      db.setMeta('instance_id', result.instanceId)
    }

    return {
      success: true,
      data: {
        connected: true,
        latencyMs,
        timestamp: new Date().toISOString(),
      },
    }
  } catch (error) {
    db.setMeta('last_heartbeat', new Date().toISOString())
    db.setMeta('last_heartbeat_status', 'disconnected')

    console.error('Connection test failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
      data: {
        connected: false,
        timestamp: new Date().toISOString(),
      },
    }
  }
}

/**
 * Trigger an immediate sync cycle.
 */
export async function triggerManualSync() {
  const session = await requireAuth()
  if (!session) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    await runSyncCycle(session.saasToken)
    db.setMeta('last_manual_sync', new Date().toISOString())

    return {
      success: true,
      data: {
        syncedAt: new Date().toISOString(),
        pendingCount: getPendingCount(),
      },
    }
  } catch (error) {
    console.error('Manual sync failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed',
    }
  }
}
