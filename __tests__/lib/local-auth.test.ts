import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'

// Mock the database dependency
const mockRun = vi.fn().mockReturnValue({ changes: 1 })
const mockGet = vi.fn()
const mockPrepare = vi.fn().mockReturnValue({ get: mockGet, run: mockRun })

vi.mock('@/lib/db', () => ({
  getConfigDb: vi.fn(() => ({ prepare: mockPrepare })),
}))

// Import AFTER mocking
const { authenticateLocalUser, createLocalUser, resetLocalUserPassword } = await import('@/lib/local-auth')

// ── Helpers ────────────────────────────────────────────────────────────────

/** Produce a legacy hash using default scrypt N=16384 */
function legacyHash(password: string): string {
  const salt = crypto.randomBytes(32)
  const hash = crypto.scryptSync(password, salt, 64)
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

/** Produce a v2 hash using N=65536, maxmem=128MB */
function v2Hash(password: string): string {
  const salt = crypto.randomBytes(32)
  const hash = crypto.scryptSync(password, salt, 64, { N: 65536, maxmem: 134217728 })
  return `v2:${salt.toString('hex')}:${hash.toString('hex')}`
}

const baseUser = {
  id: 'local-abc',
  email: 'admin@c3pao.test',
  name: 'Test Admin',
  role: 'admin',
  created_at: new Date().toISOString(),
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('scrypt hardening', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockRun.mockReset()
    mockRun.mockReturnValue({ changes: 1 })
    mockPrepare.mockClear()
  })

  describe('createLocalUser', () => {
    it('stores a v2: prefixed hash', () => {
      mockPrepare.mockReturnValue({ get: mockGet, run: mockRun })
      createLocalUser('user@test.com', 'Test User', 'StrongPassword123!', 'user')
      // run() called with INSERT — first positional arg after id/email/name is the hash
      const insertCall = mockRun.mock.calls[0]
      const storedHash = insertCall[3] // (id, email, name, password_hash, role)
      expect(storedHash).toMatch(/^v2:/)
    })
  })

  describe('resetLocalUserPassword', () => {
    it('stores a v2: prefixed hash after reset', () => {
      resetLocalUserPassword('local-abc', 'NewPassword123!')
      const updateCall = mockRun.mock.calls[0]
      const storedHash = updateCall[0] // (password_hash, id)
      expect(storedHash).toMatch(/^v2:/)
    })
  })

  describe('authenticateLocalUser', () => {
    it('accepts valid v2 hash without re-hashing', () => {
      const password = 'SecurePass456!'
      mockGet.mockReturnValueOnce({ ...baseUser, password_hash: v2Hash(password) })

      const result = authenticateLocalUser(baseUser.email, password)

      expect(result).not.toBeNull()
      expect(result?.email).toBe(baseUser.email)
      // SELECT called, no UPDATE for re-hash
      expect(mockPrepare).toHaveBeenCalledTimes(1)
      expect(mockRun).not.toHaveBeenCalled()
    })

    it('accepts legacy N=16384 hash and transparently re-hashes to v2', () => {
      const password = 'LegacyPass789!'
      mockGet.mockReturnValueOnce({ ...baseUser, password_hash: legacyHash(password) })

      const result = authenticateLocalUser(baseUser.email, password)

      expect(result).not.toBeNull()
      // UPDATE was called to re-hash
      expect(mockRun).toHaveBeenCalledOnce()
      const [newHash] = mockRun.mock.calls[0]
      expect(newHash).toMatch(/^v2:/)
    })

    it('returns null for wrong password (legacy hash) and does NOT re-hash', () => {
      mockGet.mockReturnValueOnce({ ...baseUser, password_hash: legacyHash('CorrectPassword1!') })

      const result = authenticateLocalUser(baseUser.email, 'WrongPassword1!')

      expect(result).toBeNull()
      expect(mockRun).not.toHaveBeenCalled()
    })

    it('returns null for wrong password (v2 hash) and does NOT re-hash', () => {
      const correct = 'CorrectV2Pass1!'
      mockGet.mockReturnValueOnce({ ...baseUser, password_hash: v2Hash(correct) })

      const result = authenticateLocalUser(baseUser.email, 'WrongV2Pass1!')

      expect(result).toBeNull()
      expect(mockRun).not.toHaveBeenCalled()
    })

    it('returns null for unknown email', () => {
      mockGet.mockReturnValueOnce(undefined)

      const result = authenticateLocalUser('nobody@test.com', 'AnyPassword1!')

      expect(result).toBeNull()
      expect(mockRun).not.toHaveBeenCalled()
    })

    it('returns null for malformed stored hash (no crash)', () => {
      mockGet.mockReturnValueOnce({ ...baseUser, password_hash: 'garbage-no-colon' })

      const result = authenticateLocalUser(baseUser.email, 'AnyPassword1!')

      expect(result).toBeNull()
    })

    it('returns null for malformed v2: hash (no crash)', () => {
      mockGet.mockReturnValueOnce({ ...baseUser, password_hash: 'v2:short:short' })

      const result = authenticateLocalUser(baseUser.email, 'AnyPassword1!')

      expect(result).toBeNull()
    })
  })
})
