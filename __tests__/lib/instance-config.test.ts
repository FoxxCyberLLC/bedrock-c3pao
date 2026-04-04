import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockGetConfig = vi.fn()
const mockIsAppConfigured = vi.fn()

vi.mock('@/lib/config', () => ({
  getConfig: mockGetConfig,
  isAppConfigured: mockIsAppConfigured,
}))

const { getInstanceConfig, isInstanceConfigured } = await import('@/lib/instance-config')

describe('lib/instance-config', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.INSTANCE_API_KEY
    delete process.env.C3PAO_ID
    delete process.env.C3PAO_NAME
    delete process.env.ACTIVATED_AT
    delete process.env.BEDROCK_API_URL
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('getInstanceConfig()', () => {
    it('should return null when INSTANCE_API_KEY is not set', async () => {
      const result = await getInstanceConfig()
      expect(result).toBeNull()
    })

    it('should return config from env vars when available', async () => {
      process.env.INSTANCE_API_KEY = 'bri-test-key'
      process.env.C3PAO_ID = 'c3pao-123'
      process.env.C3PAO_NAME = 'Test C3PAO'
      process.env.ACTIVATED_AT = '2026-01-01'
      process.env.BEDROCK_API_URL = 'https://api.test.com'

      const result = await getInstanceConfig()

      expect(result).toEqual({
        instanceApiKey: 'bri-test-key',
        c3paoId: 'c3pao-123',
        c3paoName: 'Test C3PAO',
        activatedAt: '2026-01-01',
        apiUrl: 'https://api.test.com',
      })
      // Should not call DB when env vars are set
      expect(mockGetConfig).not.toHaveBeenCalled()
    })

    it('should fall back to DB config when env vars are missing', async () => {
      process.env.INSTANCE_API_KEY = 'bri-test-key'
      mockGetConfig
        .mockResolvedValueOnce('c3pao-from-db')  // C3PAO_ID
        .mockResolvedValueOnce('DB C3PAO')         // C3PAO_NAME
        .mockResolvedValueOnce('2026-02-01')       // ACTIVATED_AT

      const result = await getInstanceConfig()

      expect(result!.c3paoId).toBe('c3pao-from-db')
      expect(result!.c3paoName).toBe('DB C3PAO')
      expect(result!.activatedAt).toBe('2026-02-01')
    })
  })

  describe('isInstanceConfigured()', () => {
    it('should return true when INSTANCE_API_KEY is set', async () => {
      process.env.INSTANCE_API_KEY = 'bri-test-key'

      const result = await isInstanceConfigured()
      expect(result).toBe(true)
      expect(mockIsAppConfigured).not.toHaveBeenCalled()
    })

    it('should fall back to isAppConfigured when env var is missing', async () => {
      mockIsAppConfigured.mockResolvedValueOnce(true)

      const result = await isInstanceConfigured()
      expect(result).toBe(true)
      expect(mockIsAppConfigured).toHaveBeenCalledOnce()
    })

    it('should return false when neither env var nor DB config exists', async () => {
      mockIsAppConfigured.mockResolvedValueOnce(false)

      const result = await isInstanceConfigured()
      expect(result).toBe(false)
    })
  })
})
