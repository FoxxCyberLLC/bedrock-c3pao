'use server'

// Connection settings are no longer needed — the C3PAO client connects
// directly to the Go API via BEDROCK_API_URL environment variable.

export async function saveConnectionConfig(): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'Connection is configured via BEDROCK_API_URL environment variable' }
}

export async function getConnectionStatus() {
  const apiUrl = process.env.BEDROCK_API_URL || 'http://localhost:8080'

  try {
    const response = await fetch(`${apiUrl}/api/health`, { cache: 'no-store' })
    const data = await response.json()

    return {
      success: true,
      data: {
        apiUrl,
        connected: response.ok,
        apiVersion: data?.version || 'unknown',
        timestamp: new Date().toISOString(),
      },
    }
  } catch {
    return {
      success: true,
      data: {
        apiUrl,
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
