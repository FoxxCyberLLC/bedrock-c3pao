import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ c3paoUser: { id: 'u1' } }),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

describe('getConnectionStatus (Task 10)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ version: '1' }) })
  })
  afterEach(() => {
    delete process.env.OFFLINE
  })

  it('reports disconnected+offline without probing a remote host when offline', async () => {
    process.env.OFFLINE = 'true'
    const { getConnectionStatus } = await import('@/app/actions/connection')

    const res = await getConnectionStatus()

    expect(res.success).toBe(true)
    expect(res.data).toMatchObject({ connected: false, offline: true })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('probes the API when online', async () => {
    const { getConnectionStatus } = await import('@/app/actions/connection')

    const res = await getConnectionStatus()

    expect(res.success).toBe(true)
    expect(res.data?.connected).toBe(true)
    expect(mockFetch).toHaveBeenCalled()
  })
})
