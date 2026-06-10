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

const { encryptValue, isEncrypted } = await import('@/lib/crypto')

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

    it('should decrypt an encrypted sensitive value on read', async () => {
      const stored = encryptValue('the-real-secret')
      mockQuery.mockResolvedValueOnce({ rows: [{ value: stored }], rowCount: 1 })

      const result = await getConfig('AUTH_SECRET')
      expect(result).toBe('the-real-secret')
    })

    it('should re-encrypt a legacy-plaintext sensitive value on read (opportunistic migration)', async () => {
      // SELECT returns legacy plaintext; the opportunistic setConfig re-write
      // issues a second query storing the value as enc:v1.
      mockQuery
        .mockResolvedValueOnce({ rows: [{ value: 'legacy-plain-secret' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })

      const result = await getConfig('INSTANCE_API_KEY')
      expect(result).toBe('legacy-plain-secret')

      expect(mockQuery).toHaveBeenCalledTimes(2)
      const [, params] = mockQuery.mock.calls[1]
      expect(params[0]).toBe('INSTANCE_API_KEY')
      expect(isEncrypted(params[1] as string)).toBe(true)
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

    it('should encrypt a sensitive value at rest (AUTH_SECRET stored as enc:v1)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      await setConfig('AUTH_SECRET', 'top-secret-signing-key')

      const [, params] = mockQuery.mock.calls[0]
      expect(params[0]).toBe('AUTH_SECRET')
      expect(isEncrypted(params[1] as string)).toBe(true)
      expect(params[1]).not.toBe('top-secret-signing-key')
    })

    it('should not double-encrypt an already-encrypted sensitive value', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })
      const already = encryptValue('already-ciphertext')

      await setConfig('INSTANCE_API_KEY', already)

      const [, params] = mockQuery.mock.calls[0]
      expect(params[1]).toBe(already)
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

    it('should encrypt sensitive values and leave non-sensitive plaintext', async () => {
      mockClientQuery.mockResolvedValue({ rows: [], rowCount: 1 })

      await setConfigBatch({
        BEDROCK_API_URL: 'https://api.test.com',
        AUTH_SECRET: 'batch-secret',
      })

      const inserts = mockClientQuery.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).includes('INSERT INTO app_config')
      )
      const byKey = Object.fromEntries(
        inserts.map((c: unknown[]) => {
          const params = c[1] as string[]
          return [params[0], params[1]]
        })
      )
      expect(byKey['BEDROCK_API_URL']).toBe('https://api.test.com')
      expect(isEncrypted(byKey['AUTH_SECRET'])).toBe(true)
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
