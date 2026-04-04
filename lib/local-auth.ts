import crypto from 'crypto'
import { query } from './db'

const SCRYPT_KEYLEN = 64
const SALT_LENGTH = 32
const SCRYPT_N_CURRENT = 65536
const SCRYPT_N_LEGACY = 16384
const SCRYPT_MAXMEM = 134217728

export interface LocalUser {
  id: string
  email: string
  name: string
  role: string
  created_at: string
}

/**
 * Hash password with scrypt + random salt.
 * Format: "v2:<saltHex>:<hashHex>" — uses SCRYPT_N_CURRENT (N=65536).
 */
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH)
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N_CURRENT,
    maxmem: SCRYPT_MAXMEM,
  })
  return `v2:${salt.toString('hex')}:${hash.toString('hex')}`
}

/**
 * Verify password against a stored hash.
 * Supports both legacy format ("saltHex:hashHex", N=16384) and
 * current format ("v2:saltHex:hashHex", N=65536).
 */
function verifyPassword(password: string, stored: string): boolean {
  let N: number
  let saltHex: string
  let hashHex: string

  if (stored.startsWith('v2:')) {
    const rest = stored.slice(3)
    const colon = rest.indexOf(':')
    if (colon <= 0) return false
    saltHex = rest.slice(0, colon)
    hashHex = rest.slice(colon + 1)
    if (saltHex.length !== 64 || hashHex.length !== 128) return false
    N = SCRYPT_N_CURRENT
  } else {
    const colon = stored.indexOf(':')
    if (colon <= 0) return false
    saltHex = stored.slice(0, colon)
    hashHex = stored.slice(colon + 1)
    if (saltHex.length !== 64 || hashHex.length !== 128) return false
    N = SCRYPT_N_LEGACY
  }

  try {
    const salt = Buffer.from(saltHex, 'hex')
    const expectedHash = Buffer.from(hashHex, 'hex')
    const actualHash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, {
      N,
      maxmem: SCRYPT_MAXMEM,
    })
    return crypto.timingSafeEqual(expectedHash, actualHash)
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createLocalUser(
  email: string,
  name: string,
  password: string,
  role: 'admin' | 'user' = 'user'
): Promise<LocalUser> {
  const id = `local-${crypto.randomUUID()}`
  const passwordHash = hashPassword(password)

  await query(
    `INSERT INTO local_users (id, email, name, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, email, name, passwordHash, role]
  )

  return { id, email, name, role, created_at: new Date().toISOString() }
}

/** Alias kept for setup wizard */
export async function createLocalAdmin(email: string, name: string, password: string): Promise<LocalUser> {
  return createLocalUser(email, name, password, 'admin')
}

export async function listLocalUsers(): Promise<LocalUser[]> {
  const result = await query('SELECT id, email, name, role, created_at FROM local_users ORDER BY created_at ASC')
  return result.rows as LocalUser[]
}

export async function getLocalUserById(id: string): Promise<LocalUser | null> {
  const result = await query(
    'SELECT id, email, name, role, created_at FROM local_users WHERE id = $1',
    [id]
  )
  return (result.rows[0] as LocalUser) ?? null
}

export async function updateLocalUser(
  id: string,
  updates: { name?: string; email?: string; role?: string }
): Promise<boolean> {
  const fields: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (updates.name) {
    fields.push(`name = $${paramIndex++}`)
    values.push(updates.name)
  }
  if (updates.email) {
    fields.push(`email = $${paramIndex++}`)
    values.push(updates.email)
  }
  if (updates.role) {
    fields.push(`role = $${paramIndex++}`)
    values.push(updates.role)
  }

  if (fields.length === 0) return false

  values.push(id)
  const result = await query(
    `UPDATE local_users SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
    values
  )
  return (result.rowCount ?? 0) > 0
}

export async function resetLocalUserPassword(id: string, newPassword: string): Promise<boolean> {
  const passwordHash = hashPassword(newPassword)
  const result = await query(
    'UPDATE local_users SET password_hash = $1 WHERE id = $2',
    [passwordHash, id]
  )
  return (result.rowCount ?? 0) > 0
}

export async function deleteLocalUser(id: string): Promise<boolean> {
  const result = await query('DELETE FROM local_users WHERE id = $1', [id])
  return (result.rowCount ?? 0) > 0
}

export async function countAdmins(): Promise<number> {
  const result = await query(
    "SELECT COUNT(*) as count FROM local_users WHERE role = 'admin'"
  )
  return parseInt(result.rows[0]?.count, 10)
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function authenticateLocalUser(
  email: string,
  password: string
): Promise<LocalUser | null> {
  const result = await query(
    'SELECT id, email, name, password_hash, role, created_at FROM local_users WHERE email = $1',
    [email]
  )
  const row = result.rows[0] as (LocalUser & { password_hash: string }) | undefined

  if (!row) return null
  if (!verifyPassword(password, row.password_hash)) return null

  // Transparent migration: re-hash legacy hashes to current cost params on login
  if (!row.password_hash.startsWith('v2:')) {
    const upgraded = hashPassword(password)
    await query('UPDATE local_users SET password_hash = $1 WHERE id = $2', [upgraded, row.id])
  }

  return { id: row.id, email: row.email, name: row.name, role: row.role, created_at: row.created_at }
}

export async function getLocalAdmin(): Promise<LocalUser | null> {
  const result = await query(
    "SELECT id, email, name, role, created_at FROM local_users WHERE role = 'admin' LIMIT 1"
  )
  return (result.rows[0] as LocalUser) ?? null
}
