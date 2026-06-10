import { query, getClient } from './db'
import { encryptValue, decryptValue, isEncrypted } from './crypto'

/**
 * Keys whose values are secrets and must be encrypted at rest in `app_config`.
 * AUTH_SECRET is the HS256 session-signing key; INSTANCE_API_KEY authenticates
 * this container to the Go API. BEDROCK_API_URL, C3PAO_ID/NAME etc. are not
 * secrets and stay plaintext (they're operational config, often inspected).
 */
const SENSITIVE_KEYS = new Set(['AUTH_SECRET', 'INSTANCE_API_KEY'])

/** Encrypt a sensitive value for storage; pass non-sensitive values through. */
function encodeForStore(key: string, value: string): string {
  if (!SENSITIVE_KEYS.has(key)) return value
  return isEncrypted(value) ? value : encryptValue(value)
}

export async function getConfig(key: string): Promise<string | null> {
  const result = await query('SELECT value FROM app_config WHERE key = $1', [key])
  const raw = result.rows[0]?.value ?? null
  if (raw === null) return null

  const plain = decryptValue(raw)

  // Opportunistic migration: a sensitive value still stored as legacy plaintext
  // gets re-encrypted on read. Best-effort — never let migration block a read.
  if (SENSITIVE_KEYS.has(key) && !isEncrypted(raw)) {
    try {
      await setConfig(key, plain)
    } catch {
      // ignore — the value is still readable; it will migrate on the next write
    }
  }

  return plain
}

export async function getAllConfig(): Promise<Record<string, string>> {
  const result = await query('SELECT key, value FROM app_config')
  const config: Record<string, string> = {}
  for (const row of result.rows) {
    config[row.key] = decryptValue(row.value)
  }
  return config
}

export async function setConfig(key: string, value: string): Promise<void> {
  await query(
    `INSERT INTO app_config (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, encodeForStore(key, value)]
  )
}

export async function setConfigBatch(entries: Record<string, string>): Promise<void> {
  const client = await getClient()
  try {
    await client.query('BEGIN')
    for (const [key, value] of Object.entries(entries)) {
      await client.query(
        `INSERT INTO app_config (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, encodeForStore(key, value)]
      )
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function isAppConfigured(): Promise<boolean> {
  const result = await query(
    `SELECT COUNT(*) as count FROM app_config WHERE key IN ('INSTANCE_API_KEY', 'BEDROCK_API_URL')`
  )
  return parseInt(result.rows[0]?.count, 10) === 2
}
