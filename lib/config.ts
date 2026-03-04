import { getConfigDb } from './db'
import { encrypt, decrypt } from './crypto'

/** Keys whose values are encrypted at rest in SQLite */
const SENSITIVE_KEYS = new Set(['AUTH_SECRET', 'INSTANCE_API_KEY'])

export function getConfig(key: string): string | null {
  const db = getConfigDb()
  const row = db.prepare('SELECT value, encrypted FROM app_config WHERE key = ?').get(key) as
    | { value: string; encrypted: number }
    | undefined
  if (!row) return null
  return row.encrypted ? decrypt(row.value) : row.value
}

export function getAllConfig(): Record<string, string> {
  const db = getConfigDb()
  const rows = db.prepare('SELECT key, value, encrypted FROM app_config').all() as {
    key: string
    value: string
    encrypted: number
  }[]
  const config: Record<string, string> = {}
  for (const row of rows) {
    config[row.key] = row.encrypted ? decrypt(row.value) : row.value
  }
  return config
}

export function setConfig(key: string, value: string): void {
  const db = getConfigDb()
  const isSensitive = SENSITIVE_KEYS.has(key)
  const storedValue = isSensitive ? encrypt(value) : value
  db.prepare(
    `INSERT INTO app_config (key, value, encrypted, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, encrypted = excluded.encrypted, updated_at = datetime('now')`
  ).run(key, storedValue, isSensitive ? 1 : 0)
}

export function setConfigBatch(entries: Record<string, string>): void {
  const db = getConfigDb()
  const stmt = db.prepare(
    `INSERT INTO app_config (key, value, encrypted, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, encrypted = excluded.encrypted, updated_at = datetime('now')`
  )
  const tx = db.transaction(() => {
    for (const [key, value] of Object.entries(entries)) {
      const isSensitive = SENSITIVE_KEYS.has(key)
      const storedValue = isSensitive ? encrypt(value) : value
      stmt.run(key, storedValue, isSensitive ? 1 : 0)
    }
  })
  tx()
}

export function isAppConfigured(): boolean {
  return getConfig('INSTANCE_API_KEY') !== null && getConfig('BEDROCK_API_URL') !== null
}

export function injectConfigToEnv(): void {
  const config = getAllConfig()
  for (const [key, value] of Object.entries(config)) {
    if (value) process.env[key] = value
  }
}
