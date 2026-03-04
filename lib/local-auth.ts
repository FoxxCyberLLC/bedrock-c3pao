import crypto from 'crypto'
import { getConfigDb } from './db'

const SCRYPT_KEYLEN = 64
const SALT_LENGTH = 32

interface LocalUser {
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

export function createLocalAdmin(email: string, name: string, password: string): LocalUser {
  const db = getConfigDb()
  const id = `local-${crypto.randomUUID()}`
  const passwordHash = hashPassword(password)

  db.prepare(
    `INSERT INTO local_users (id, email, name, password_hash, role)
     VALUES (?, ?, ?, ?, 'admin')`
  ).run(id, email, name, passwordHash)

  return { id, email, name, role: 'admin', created_at: new Date().toISOString() }
}

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
