import { NextResponse } from 'next/server'

export async function GET() {
  const apiUrl = process.env.BEDROCK_API_URL || 'http://localhost:8080'
  let apiStatus = 'unknown'

  try {
    const response = await fetch(`${apiUrl}/api/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    apiStatus = response.ok ? 'connected' : 'error'
  } catch {
    apiStatus = 'unreachable'
  }

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    api: {
      url: apiUrl,
      status: apiStatus,
    },
  })
}
