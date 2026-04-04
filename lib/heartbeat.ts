import { getInstanceConfig } from './instance-config'

const APP_VERSION = process.env.npm_package_version || '0.1.0'

/**
 * Send a heartbeat to the Go API.
 * Fire-and-forget — never throws, never blocks.
 */
export async function sendHeartbeat(): Promise<void> {
  try {
    const config = await getInstanceConfig()
    if (!config?.instanceApiKey) return

    const apiUrl = config.apiUrl || process.env.BEDROCK_API_URL || 'http://localhost:8080'

    await fetch(`${apiUrl}/api/instance/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Instance-Key': config.instanceApiKey,
      },
      body: JSON.stringify({ version: APP_VERSION }),
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    // Fire-and-forget — heartbeat failure is not critical
  }
}
