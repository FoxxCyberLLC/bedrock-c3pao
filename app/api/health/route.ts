import { NextResponse } from 'next/server'
import { getSyncQueueCount, getMeta } from '@/lib/db'

export async function GET() {
  try {
    const pendingSync = getSyncQueueCount()
    const lastHeartbeat = getMeta('last_heartbeat_at')
    const lastSync = getMeta('last_sync_at')

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      sync: {
        pendingItems: pendingSync,
        lastHeartbeat,
        lastSync,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
