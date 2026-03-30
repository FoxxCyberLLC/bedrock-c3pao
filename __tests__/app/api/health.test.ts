import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the heartbeat and fetch to avoid real network calls
vi.mock('@/lib/heartbeat', () => ({
  sendHeartbeat: vi.fn(),
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.resetModules()
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) })
  })

  it('does not include api.url in response', async () => {
    process.env.BEDROCK_API_URL = 'http://internal-api:8080'
    const { GET } = await import('@/app/api/health/route')
    const response = await GET()
    const body = await response.json()

    expect(body).not.toHaveProperty('api.url')
    // Verify the api object doesn't contain a url property
    if (body.api) {
      expect(body.api).not.toHaveProperty('url')
    }
  })

  it('includes api.status in response for health checks', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) })
    const { GET } = await import('@/app/api/health/route')
    const response = await GET()
    const body = await response.json()

    expect(body.api).toBeDefined()
    expect(body.api.status).toBeDefined()
    expect(['connected', 'error', 'unreachable', 'unknown']).toContain(body.api.status)
  })

  it('returns healthy status', async () => {
    const { GET } = await import('@/app/api/health/route')
    const response = await GET()
    const body = await response.json()

    expect(body.status).toBe('healthy')
    expect(body.timestamp).toBeDefined()
  })
})
