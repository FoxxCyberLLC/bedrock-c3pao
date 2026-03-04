import crypto from 'crypto'
import { getConfigDb } from './db'

const SCRYPT_KEYLEN = 64
const SALT_LENGTH = 32

export interface LocalUser {
  id: string
  email: string
  name: string
  role: string
  created_at: string
}

/** Hash password with scrypt + random salt → "salt:hash" (hex) */
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH)
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN)
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

/** Verify password against "salt:hash" */
function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':')
  const salt = Buffer.from(saltHex, 'hex')
  const expectedHash = Buffer.from(hashHex, 'hex')
  const actualHash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN)
  return crypto.timingSafeEqual(expectedHash, actualHash)
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function createLocalUser(
  email: string,
  name: string,
  password: string,
  role: 'admin' | 'user' = 'user'
): LocalUser {
  const db = getConfigDb()
  const id = `local-${crypto.randomUUID()}`
  const passwordHash = hashPassword(password)

  db.prepare(
    `INSERT INTO local_users (id, email, name, password_hash, role)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, email, name, passwordHash, role)

  return { id, email, name, role, created_at: new Date().toISOString() }
}

/** Alias kept for setup wizard */
export function createLocalAdmin(email: string, name: string, password: string): LocalUser {
  return createLocalUser(email, name, password, 'admin')
}

export function listLocalUsers(): LocalUser[] {
  const db = getConfigDb()
  return db
    .prepare('SELECT id, email, name, role, created_at FROM local_users ORDER BY created_at ASC')
    .all() as LocalUser[]
}

export function getLocalUserById(id: string): LocalUser | null {
  const db = getConfigDb()
  const row = db
    .prepare('SELECT id, email, name, role, created_at FROM local_users WHERE id = ?')
    .get(id) as LocalUser | undefined
  return row ?? null
}

export function updateLocalUser(
  id: string,
  updates: { name?: string; email?: string; role?: string }
): boolean {
  const db = getConfigDb()
  const fields: string[] = []
  const values: string[] = []

  if (updates.name) {
    fields.push('name = ?')
    values.push(updates.name)
  }
  if (updates.email) {
    fields.push('email = ?')
    values.push(updates.email)
  }
  if (updates.role) {
    fields.push('role = ?')
    values.push(updates.role)
  }

  if (fields.length === 0) return false

  values.push(id)
  const result = db
    .prepare(`UPDATE local_users SET ${fields.join(', ')} WHERE id = ?`)
    .run(...values)
  return result.changes > 0
}

export function resetLocalUserPassword(id: string, newPassword: string): boolean {
  const db = getConfigDb()
  const passwordHash = hashPassword(newPassword)
  const result = db
    .prepare('UPDATE local_users SET password_hash = ? WHERE id = ?')
    .run(passwordHash, id)
  return result.changes > 0
}

export function deleteLocalUser(id: string): boolean {
  const db = getConfigDb()
  const result = db.prepare('DELETE FROM local_users WHERE id = ?').run(id)
  return result.changes > 0
}

export function countAdmins(): number {
  const db = getConfigDb()
  const row = db
    .prepare("SELECT COUNT(*) as count FROM local_users WHERE role = 'admin'")
    .get() as { count: number }
  return row.count
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export function authenticateLocalUser(
  email: string,
  password: string
): LocalUser | null {
  const db = getConfigDb()
  const row = db
    .prepare('SELECT id, email, name, password_hash, role, created_at FROM local_users WHERE email = ?')
    .get(email) as (LocalUser & { password_hash: string }) | undefined

  if (!row) return null
  if (!verifyPassword(password, row.password_hash)) return null

  return { id: row.id, email: row.email, name: row.name, role: row.role, created_at: row.created_at }
}

export function getLocalAdmin(): LocalUser | null {
  const db = getConfigDb()
  const row = db
    .prepare("SELECT id, email, name, role, created_at FROM local_users WHERE role = 'admin' LIMIT 1")
    .get() as LocalUser | undefined
  return row ?? null
}
