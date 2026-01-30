'use server'

import { requireAuth } from '@/lib/auth'
import { sendHeartbeat } from '@/lib/api-client'
import { getMeta, setMeta } from '@/lib/db'
import { getSyncStatus, getPendingCount, getLastSyncTime, runSyncCycle } from '@/lib/sync-engine'

/**
 * Save connection configuration (SaaS URL and API key) to the local database.
 */
export async function saveConnectionConfig(formData: FormData) {
  const session = await requireAuth()
  if (!session) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const saasUrl = formData.get('saasUrl') as string
    const apiKey = formData.get('apiKey') as string

    if (saasUrl) {
      // Normalize: strip trailing slash
      const normalized = saasUrl.replace(/\/+$/, '')
      setMeta('saas_url', normalized)
    }

    if (apiKey) {
      setMeta('instance_api_key', apiKey)
      // Store prefix for display (first 12 chars)
      setMeta('instance_api_key_prefix', apiKey.substring(0, 12))
    }

    return { success: true }
  } catch (error) {
    console.error('Error saving connection config:', error)
    return { success: false, error: 'Failed to save configuration' }
  }
}

/**
 * Get the current connection status to the SaaS platform.
 */
export async function getConnectionStatus() {
  const session = await requireAuth()
  if (!session) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // Read from DB first, fall back to env vars
    const saasUrl = getMeta('saas_url') || process.env.SAAS_API_URL || ''
    const storedApiKey = getMeta('instance_api_key')
    const envApiKey = process.env.INSTANCE_API_KEY
    const apiKeyConfigured = !!(storedApiKey || envApiKey)
    const apiKeyPrefix = getMeta('instance_api_key_prefix') || envApiKey?.substring(0, 12) || ''

    // Get sync info from local DB
    const syncStatus = getSyncStatus()
    const pendingCount = getPendingCount()
    const lastSyncTime = getLastSyncTime()
    const lastHeartbeat = getMeta('last_heartbeat')
    const lastHeartbeatStatus = getMeta('last_heartbeat_status')
    const instanceName = getMeta('instance_name')

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
    const result = await sendHeartbeat()
    const latencyMs = Date.now() - start

    // Store heartbeat result
    setMeta('last_heartbeat', new Date().toISOString())
    setMeta('last_heartbeat_status', 'connected')

    // Store instance info if returned
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const heartbeatResult = result as any
    if (heartbeatResult?.instanceId) {
      setMeta('instance_id', heartbeatResult.instanceId)
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
    setMeta('last_heartbeat', new Date().toISOString())
    setMeta('last_heartbeat_status', 'disconnected')

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
    setMeta('last_manual_sync', new Date().toISOString())

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
