import { NextResponse } from 'next/server'
import { sendHeartbeat } from '@/lib/heartbeat'
import { isOffline } from '@/lib/mode'

export async function GET() {
  let apiStatus = 'unknown'

  if (isOffline()) {
    // Air-gapped: report offline without contacting any remote host.
    apiStatus = 'offline'
  } else {
    const apiUrl = process.env.BEDROCK_API_URL || 'http://localhost:8080'
    try {
      const response = await fetch(`${apiUrl}/api/health`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      })
      apiStatus = response.ok ? 'connected' : 'error'
    } catch {
      apiStatus = 'unreachable'
    }

    // Fire-and-forget heartbeat (piggybacks on Docker healthcheck every 30s).
    sendHeartbeat()
  }

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    api: {
      // Note: api.url intentionally omitted — this endpoint is unauthenticated
      // and internal API URL is sensitive configuration
      status: apiStatus,
    },
  })
}
