import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'

// Mock the database dependency
const mockQuery = vi.fn()

vi.mock('@/lib/db', () => ({
  query: mockQuery,
}))

// Import AFTER mocking
const {
  authenticateLocalUser,
  createLocalUser,
  resetLocalUserPassword,
  listLocalUsers,
  getLocalUserById,
  updateLocalUser,
  deleteLocalUser,
  countAdmins,
  getLocalAdmin,
  createLocalAdmin,
} = await import('@/lib/local-auth')

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
    mockQuery.mockReset()
  })

  describe('createLocalUser', () => {
    it('should insert user with v2 hash and return user object', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      const user = await createLocalUser('test@example.com', 'Test', 'password123456', 'admin')

      expect(user.email).toBe('test@example.com')
      expect(user.name).toBe('Test')
      expect(user.role).toBe('admin')
      expect(user.id).toMatch(/^local-/)

      // Verify query was called with INSERT
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO local_users'),
        expect.arrayContaining(['test@example.com', 'Test'])
      )

      // The password hash (4th param) should be v2 format
      const params = mockQuery.mock.calls[0][1]
      expect(params[3]).toMatch(/^v2:/)
    })
  })

  describe('createLocalAdmin', () => {
    it('should create user with admin role', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      const user = await createLocalAdmin('admin@test.com', 'Admin', 'password123456')

      expect(user.role).toBe('admin')
    })
  })

  describe('authenticateLocalUser', () => {
    it('should return user for correct v2 password', async () => {
      const hash = v2Hash('correct-password')
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...baseUser, password_hash: hash }],
        rowCount: 1,
      })

      const result = await authenticateLocalUser('admin@c3pao.test', 'correct-password')

      expect(result).not.toBeNull()
      expect(result!.email).toBe('admin@c3pao.test')
    })

    it('should return null for wrong password', async () => {
      const hash = v2Hash('correct-password')
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...baseUser, password_hash: hash }],
        rowCount: 1,
      })

      const result = await authenticateLocalUser('admin@c3pao.test', 'wrong-password')
      expect(result).toBeNull()
    })

    it('should return null for non-existent user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const result = await authenticateLocalUser('nobody@test.com', 'password')
      expect(result).toBeNull()
    })

    it('should upgrade legacy hash on successful login', async () => {
      const hash = legacyHash('legacy-password')
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ ...baseUser, password_hash: hash }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE for re-hash

      const result = await authenticateLocalUser('admin@c3pao.test', 'legacy-password')

      expect(result).not.toBeNull()
      // Should have called UPDATE to re-hash
      expect(mockQuery).toHaveBeenCalledTimes(2)
      const updateCall = mockQuery.mock.calls[1]
      expect(updateCall[0]).toContain('UPDATE local_users SET password_hash')
      // New hash should be v2
      expect(updateCall[1][0]).toMatch(/^v2:/)
    })
  })

  describe('resetLocalUserPassword', () => {
    it('should update password hash and return true', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      const result = await resetLocalUserPassword('local-abc', 'new-password-123')

      expect(result).toBe(true)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE local_users SET password_hash'),
        expect.any(Array)
      )
      // Verify v2 hash format
      const params = mockQuery.mock.calls[0][1]
      expect(params[0]).toMatch(/^v2:/)
    })

    it('should return false when user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const result = await resetLocalUserPassword('nonexistent', 'password')
      expect(result).toBe(false)
    })
  })

  describe('listLocalUsers', () => {
    it('should return all users ordered by created_at', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [baseUser, { ...baseUser, id: 'local-def', email: 'user2@test.com' }],
        rowCount: 2,
      })

      const users = await listLocalUsers()
      expect(users).toHaveLength(2)
      expect(users[0].email).toBe('admin@c3pao.test')
    })
  })

  describe('getLocalUserById', () => {
    it('should return user when found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [baseUser], rowCount: 1 })

      const user = await getLocalUserById('local-abc')
      expect(user).not.toBeNull()
      expect(user!.id).toBe('local-abc')
    })

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const user = await getLocalUserById('nonexistent')
      expect(user).toBeNull()
    })
  })

  describe('updateLocalUser', () => {
    it('should update specified fields and return true', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      const result = await updateLocalUser('local-abc', { name: 'New Name' })
      expect(result).toBe(true)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE local_users SET name'),
        expect.arrayContaining(['New Name', 'local-abc'])
      )
    })

    it('should return false when no fields provided', async () => {
      const result = await updateLocalUser('local-abc', {})
      expect(result).toBe(false)
      expect(mockQuery).not.toHaveBeenCalled()
    })
  })

  describe('deleteLocalUser', () => {
    it('should delete user and return true', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      const result = await deleteLocalUser('local-abc')
      expect(result).toBe(true)
    })

    it('should return false when user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const result = await deleteLocalUser('nonexistent')
      expect(result).toBe(false)
    })
  })

  describe('countAdmins', () => {
    it('should return admin count', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '3' }], rowCount: 1 })

      const count = await countAdmins()
      expect(count).toBe(3)
    })
  })

  describe('getLocalAdmin', () => {
    it('should return first admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [baseUser], rowCount: 1 })

      const admin = await getLocalAdmin()
      expect(admin).not.toBeNull()
      expect(admin!.role).toBe('admin')
    })

    it('should return null when no admins', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const admin = await getLocalAdmin()
      expect(admin).toBeNull()
    })
  })
})
