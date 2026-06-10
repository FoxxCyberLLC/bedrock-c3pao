/**
 * AES-256-GCM encryption for at-rest config values (the sensitive `app_config`
 * rows: AUTH_SECRET, INSTANCE_API_KEY).
 *
 * Wire format: `enc:v1:<ivB64>:<tagB64>:<ctB64>` — a single self-describing
 * string. This format is INTENTIONALLY shared with the standalone CommonJS
 * decrypt inlined in `start.js` (the Docker/standalone entrypoint cannot import
 * this TS module). Keep both in sync if the format ever changes.
 *
 * The key comes from `CONFIG_ENCRYPTION_KEY` (32 bytes, hex or base64) and is
 * read lazily per call — never at module load — so importing this module never
 * throws and tests/tools that don't touch secrets don't need the key set.
 */

import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const KEY_BYTES = 32
const PREFIX = 'enc:v1:'

/** Load and validate the 32-byte key from CONFIG_ENCRYPTION_KEY (hex or base64). */
function loadKey(): Buffer {
  const raw = process.env.CONFIG_ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      'CONFIG_ENCRYPTION_KEY is not set — cannot encrypt or decrypt config values',
    )
  }
  const key = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, 'hex')
    : Buffer.from(raw, 'base64')
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `CONFIG_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${key.length}); provide a 32-byte hex or base64 key`,
    )
  }
  return key
}

/** True when the value carries the enc:v1 prefix (i.e. is ciphertext, not legacy plaintext). */
export function isEncrypted(value: string): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX)
}

/** Encrypt a plaintext string into the `enc:v1:<iv>:<tag>:<ct>` wire format. */
export function encryptValue(plain: string): string {
  const key = loadKey()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`
}

/**
 * Decrypt an `enc:v1` blob back to plaintext. Read-through: a value without the
 * prefix is returned unchanged so legacy plaintext rows keep working during
 * migration. Throws on malformed input or a failed GCM auth tag (tampering).
 */
export function decryptValue(blob: string): string {
  if (!isEncrypted(blob)) return blob
  const key = loadKey()
  const parts = blob.slice(PREFIX.length).split(':')
  if (parts.length !== 3) {
    throw new Error('Malformed enc:v1 ciphertext — expected iv:tag:ct')
  }
  const [ivB64, tagB64, ctB64] = parts
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  const pt = Buffer.concat([
    decipher.update(Buffer.from(ctB64, 'base64')),
    decipher.final(),
  ])
  return pt.toString('utf8')
}
