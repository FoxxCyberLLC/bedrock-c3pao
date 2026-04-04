import { Pool, type QueryResult } from 'pg'

let _pool: Pool | null = null
let _schemaPromise: Promise<void> | null = null

export function getPool(): Pool {
  if (_pool) return _pool

  _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
  })

  _pool.on('error', (err) => {
    console.error('[db] Pool error:', err.message)
  })

  return _pool
}

export async function query(text: string, params?: unknown[]): Promise<QueryResult> {
  const pool = getPool()
  return pool.query(text, params)
}

export async function getClient() {
  const pool = getPool()
  return pool.connect()
}

export async function ensureSchema(): Promise<void> {
  if (_schemaPromise) return _schemaPromise

  _schemaPromise = (async () => {
    const pool = getPool()
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS local_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)
  })()

  return _schemaPromise
}
