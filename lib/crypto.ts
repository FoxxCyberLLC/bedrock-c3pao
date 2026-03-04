import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const KEY_PATH = path.join(process.cwd(), 'data', '.encryption-key')
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16

let _cachedKey: Buffer | null = null

export function getEncryptionKey(): Buffer {
  if (_cachedKey) return _cachedKey

  const dir = path.dirname(KEY_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  if (fs.existsSync(KEY_PATH)) {
    _cachedKey = Buffer.from(fs.readFileSync(KEY_PATH, 'utf-8').trim(), 'hex')
    return _cachedKey
  }

  // Generate new key on first run
  const key = crypto.randomBytes(32)
  fs.writeFileSync(KEY_PATH, key.toString('hex'), { mode: 0o600 })
  _cachedKey = key
  return key
}

/** Returns the encryption key as a hex string for display to admin */
export function getEncryptionKeyHex(): string {
  return getEncryptionKey().toString('hex')
}

/** Encrypt plaintext → "iv:authTag:ciphertext" (all base64) */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf-8', 'base64')
  encrypted += cipher.final('base64')
  const authTag = cipher.getAuthTag()

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

/** Decrypt "iv:authTag:ciphertext" → plaintext */
export function decrypt(packed: string): string {
  const key = getEncryptionKey()
  const [ivB64, authTagB64, ciphertext] = packed.split(':')

  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext, 'base64', 'utf-8')
  decrypted += decipher.final('utf-8')
  return decrypted
}
