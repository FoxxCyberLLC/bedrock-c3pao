import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
const mockClientQuery = vi.fn()
const mockClientRelease = vi.fn()

vi.mock('@/lib/db', () => ({
  query: mockQuery,
  getClient: vi.fn().mockResolvedValue({
    query: mockClientQuery,
    release: mockClientRelease,
  }),
}))

const {
  getConfig,
  getAllConfig,
  setConfig,
  setConfigBatch,
  isAppConfigured,
} = await import('@/lib/config')

describe('lib/config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getConfig()', () => {
    it('should return value when key exists', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ value: 'https://api.test.com' }],
        rowCount: 1,
      })

      const result = await getConfig('BEDROCK_API_URL')

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT value FROM app_config WHERE key = $1'),
        ['BEDROCK_API_URL']
      )
      expect(result).toBe('https://api.test.com')
    })

    it('should return null when key does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const result = await getConfig('NONEXISTENT')
      expect(result).toBeNull()
    })
  })

  describe('getAllConfig()', () => {
    it('should return all config as key-value record', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { key: 'BEDROCK_API_URL', value: 'https://api.test.com' },
          { key: 'C3PAO_NAME', value: 'Test C3PAO' },
        ],
        rowCount: 2,
      })

      const result = await getAllConfig()

      expect(result).toEqual({
        BEDROCK_API_URL: 'https://api.test.com',
        C3PAO_NAME: 'Test C3PAO',
      })
    })

    it('should return empty object when no config exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const result = await getAllConfig()
      expect(result).toEqual({})
    })
  })

  describe('setConfig()', () => {
    it('should upsert a config value', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      await setConfig('BEDROCK_API_URL', 'https://api.test.com')

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO app_config'),
        ['BEDROCK_API_URL', 'https://api.test.com']
      )
    })
  })

  describe('setConfigBatch()', () => {
    it('should upsert multiple values in a transaction using dedicated client', async () => {
      mockClientQuery.mockResolvedValue({ rows: [], rowCount: 1 })

      await setConfigBatch({
        BEDROCK_API_URL: 'https://api.test.com',
        C3PAO_NAME: 'Test C3PAO',
      })

      const calls = mockClientQuery.mock.calls.map((c: unknown[]) => c[0] as string)
      expect(calls[0]).toBe('BEGIN')
      expect(calls[calls.length - 1]).toBe('COMMIT')
      const inserts = calls.filter((sql: string) => sql.includes('INSERT INTO app_config'))
      expect(inserts).toHaveLength(2)
      expect(mockClientRelease).toHaveBeenCalledOnce()
    })

    it('should ROLLBACK on insert failure and release client', async () => {
      mockClientQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockRejectedValueOnce(new Error('insert failed'))  // first INSERT
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // ROLLBACK

      await expect(
        setConfigBatch({ KEY: 'value' })
      ).rejects.toThrow('insert failed')

      const calls = mockClientQuery.mock.calls.map((c: unknown[]) => c[0] as string)
      expect(calls).toContain('BEGIN')
      expect(calls).toContain('ROLLBACK')
      expect(calls).not.toContain('COMMIT')
      expect(mockClientRelease).toHaveBeenCalledOnce()
    })
  })

  describe('isAppConfigured()', () => {
    it('should return true when both keys exist', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '2' }],
        rowCount: 1,
      })

      const result = await isAppConfigured()
      expect(result).toBe(true)
    })

    it('should return false when keys are missing', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        rowCount: 1,
      })

      const result = await isAppConfigured()
      expect(result).toBe(false)
    })

    it('should return false when only one key exists', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '1' }],
        rowCount: 1,
      })

      const result = await isAppConfigured()
      expect(result).toBe(false)
    })
  })
})
