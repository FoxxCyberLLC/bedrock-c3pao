import { describe, it, expect, vi, beforeEach } from 'vitest'

const isAppConfigured = vi.fn()
const setConfigBatch = vi.fn()
const createLocalAdmin = vi.fn()

vi.mock('@/lib/config', () => ({
  isAppConfigured: () => isAppConfigured(),
  setConfigBatch: (...a: unknown[]) => setConfigBatch(...a),
  getConfig: vi.fn(),
}))
vi.mock('@/lib/local-auth', () => ({
  createLocalAdmin: (...a: unknown[]) => createLocalAdmin(...a),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

const params = {
  c3paoId: 'c3-1',
  c3paoName: 'Acme C3PAO',
  adminName: 'Admin',
  adminEmail: 'admin@c3pao.test',
  adminPassword: 'a-strong-password',
}

describe('completeOfflineSetup (Task 10)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isAppConfigured.mockResolvedValue(false)
    setConfigBatch.mockResolvedValue(undefined)
    createLocalAdmin.mockResolvedValue({ id: 'local-1' })
  })

  it('completes with no network call and stores the offline marker', async () => {
    const { completeOfflineSetup } = await import('@/app/actions/setup')

    const res = await completeOfflineSetup(params)

    expect(res.success).toBe(true)
    expect(mockFetch).not.toHaveBeenCalled()
    const stored = setConfigBatch.mock.calls[0][0]
    expect(stored).toMatchObject({ OFFLINE: 'true', C3PAO_ID: 'c3-1', C3PAO_NAME: 'Acme C3PAO' })
    expect(stored).toHaveProperty('AUTH_SECRET')
    // never persists remote-API credentials
    expect(stored).not.toHaveProperty('BEDROCK_API_URL')
    expect(stored).not.toHaveProperty('INSTANCE_API_KEY')
    expect(createLocalAdmin).toHaveBeenCalledWith('admin@c3pao.test', 'Admin', 'a-strong-password')
  })

  it('refuses to re-run once configured', async () => {
    isAppConfigured.mockResolvedValue(true)
    const { completeOfflineSetup } = await import('@/app/actions/setup')

    const res = await completeOfflineSetup(params)

    expect(res.success).toBe(false)
    expect(setConfigBatch).not.toHaveBeenCalled()
  })
})
