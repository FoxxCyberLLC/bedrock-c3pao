'use server'

import { requireAuth } from '@/lib/auth'

// Connection settings are configured during the setup wizard and stored in PostgreSQL.

export async function saveConnectionConfig(): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'Connection is configured during setup. To reconfigure, clear the app_config table and restart.' }
}

export async function getConnectionStatus() {
  const session = await requireAuth()
  if (!session) return { success: false, error: 'Unauthorized' }

  const apiUrl = process.env.BEDROCK_API_URL || 'http://localhost:8080'

  try {
    const response = await fetch(`${apiUrl}/api/health`, { cache: 'no-store' })
    const data = await response.json()

    return {
      success: true,
      data: {
        connected: response.ok,
        apiVersion: data?.version || 'unknown',
        timestamp: new Date().toISOString(),
      },
    }
  } catch {
    return {
      success: true,
      data: {
        connected: false,
        apiVersion: null,
        timestamp: new Date().toISOString(),
      },
    }
  }
}

export async function testConnection() {
  return getConnectionStatus()
}

export async function triggerManualSync(): Promise<{ success: boolean }> {
  return { success: true }
}
