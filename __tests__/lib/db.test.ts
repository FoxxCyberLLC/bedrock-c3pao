import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPoolQuery = vi.fn()
const mockPoolOn = vi.fn()

vi.mock('pg', () => {
  return {
    Pool: function () {
      return {
        query: mockPoolQuery,
        on: mockPoolOn,
      }
    },
  }
})

describe('lib/db', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Reset module to clear cached pool and schema promise
    vi.resetModules()
    vi.mock('pg', () => ({
      Pool: function () {
        return {
          query: mockPoolQuery,
          on: mockPoolOn,
        }
      },
    }))
  })

  describe('query()', () => {
    it('should delegate to pool.query with text and params', async () => {
      const { query } = await import('@/lib/db')
      const mockResult = { rows: [{ id: 1 }], rowCount: 1 }
      mockPoolQuery.mockResolvedValueOnce(mockResult)

      const result = await query('SELECT * FROM app_config WHERE key = $1', ['test'])

      expect(mockPoolQuery).toHaveBeenCalledWith('SELECT * FROM app_config WHERE key = $1', ['test'])
      expect(result).toEqual(mockResult)
    })

    it('should work with no params', async () => {
      const { query } = await import('@/lib/db')
      const mockResult = { rows: [], rowCount: 0 }
      mockPoolQuery.mockResolvedValueOnce(mockResult)

      const result = await query('SELECT 1')

      expect(mockPoolQuery).toHaveBeenCalledWith('SELECT 1', undefined)
      expect(result).toEqual(mockResult)
    })
  })

  describe('getPool()', () => {
    it('should return a pool with query method', async () => {
      const { getPool } = await import('@/lib/db')
      const pool = getPool()
      expect(pool).toBeDefined()
      expect(pool.query).toBeDefined()
    })

    it('should return the same pool on repeated calls', async () => {
      const { getPool } = await import('@/lib/db')
      const pool1 = getPool()
      const pool2 = getPool()
      expect(pool1).toBe(pool2)
    })
  })

  describe('ensureSchema()', () => {
    it('should create app_config and local_users tables', async () => {
      const { ensureSchema } = await import('@/lib/db')
      mockPoolQuery.mockResolvedValue({ rows: [], rowCount: 0 })

      await ensureSchema()

      const calls = mockPoolQuery.mock.calls.map((c: unknown[]) => c[0] as string)
      const createCalls = calls.filter((sql: string) => sql.includes('CREATE TABLE IF NOT EXISTS'))
      expect(createCalls.length).toBeGreaterThanOrEqual(1)

      const allSql = createCalls.join(' ')
      expect(allSql).toContain('app_config')
      expect(allSql).toContain('local_users')
    })

    it('should only run schema init once (singleton promise)', async () => {
      const { ensureSchema } = await import('@/lib/db')
      mockPoolQuery.mockResolvedValue({ rows: [], rowCount: 0 })

      await ensureSchema()
      const callCount1 = mockPoolQuery.mock.calls.length

      await ensureSchema()
      const callCount2 = mockPoolQuery.mock.calls.length

      expect(callCount2).toBe(callCount1)
    })
  })
})
