import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
vi.mock('@/lib/db', () => ({ query: mockQuery }))

const { isLockedOut, recordFailedLogin, clearLoginAttempts, MAX_FAILED_ATTEMPTS } = await import(
  '@/lib/login-attempts'
)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('isLockedOut', () => {
  it('is not locked when there is no attempt row', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    const result = await isLockedOut('a@b.com')
    expect(result.locked).toBe(false)
  })

  it('is locked when locked_until is in the future, with a positive retryAfterSec', async () => {
    const future = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    mockQuery.mockResolvedValueOnce({ rows: [{ locked_until: future }], rowCount: 1 })
    const result = await isLockedOut('a@b.com')
    expect(result.locked).toBe(true)
    expect(result.retryAfterSec).toBeGreaterThan(0)
  })

  it('auto-expires: not locked when locked_until is in the past (sole-admin self-heal)', async () => {
    const past = new Date(Date.now() - 1000).toISOString()
    mockQuery.mockResolvedValueOnce({ rows: [{ locked_until: past }], rowCount: 1 })
    const result = await isLockedOut('a@b.com')
    expect(result.locked).toBe(false)
  })
})

describe('recordFailedLogin', () => {
  it('inserts count=1 with no lock on the first failure', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // SELECT current state
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPSERT
    await recordFailedLogin('a@b.com')
    const [, params] = mockQuery.mock.calls[1]
    expect(params[1]).toBe(1) // failed_count
    expect(params[2]).toBeNull() // locked_until
  })

  it('sets locked_until once the failure count reaches the threshold', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ failed_count: MAX_FAILED_ATTEMPTS - 1, locked_until: null }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
    await recordFailedLogin('a@b.com')
    const [, params] = mockQuery.mock.calls[1]
    expect(params[1]).toBe(MAX_FAILED_ATTEMPTS)
    expect(params[2]).not.toBeNull() // locked_until set
  })

  it('resets the count to 1 when a prior lock has already expired', async () => {
    const past = new Date(Date.now() - 1000).toISOString()
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ failed_count: MAX_FAILED_ATTEMPTS, locked_until: past }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
    await recordFailedLogin('a@b.com')
    const [, params] = mockQuery.mock.calls[1]
    expect(params[1]).toBe(1)
    expect(params[2]).toBeNull()
  })
})

describe('clearLoginAttempts', () => {
  it('deletes the attempt row', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })
    await clearLoginAttempts('a@b.com')
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('DELETE FROM login_attempts')
    expect(params[0]).toBe('a@b.com')
  })
})
