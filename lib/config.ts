import { query, getClient } from './db'

export async function getConfig(key: string): Promise<string | null> {
  const result = await query('SELECT value FROM app_config WHERE key = $1', [key])
  return result.rows[0]?.value ?? null
}

export async function getAllConfig(): Promise<Record<string, string>> {
  const result = await query('SELECT key, value FROM app_config')
  const config: Record<string, string> = {}
  for (const row of result.rows) {
    config[row.key] = row.value
  }
  return config
}

export async function setConfig(key: string, value: string): Promise<void> {
  await query(
    `INSERT INTO app_config (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, value]
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
        [key, value]
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
