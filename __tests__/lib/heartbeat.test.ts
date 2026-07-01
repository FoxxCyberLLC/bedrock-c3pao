import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/instance-config', () => ({
  getInstanceConfig: vi.fn().mockResolvedValue(null),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

describe('sendHeartbeat (Task 10)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({ ok: true })
  })
  afterEach(() => {
    delete process.env.OFFLINE
  })

  it('makes no outbound request in air-gapped mode', async () => {
    process.env.OFFLINE = 'true'
    const { sendHeartbeat } = await import('@/lib/heartbeat')

    await sendHeartbeat()

    expect(mockFetch).not.toHaveBeenCalled()
  })
})
