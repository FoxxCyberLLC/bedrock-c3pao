import { Pool, type QueryResult } from 'pg'

let _pool: Pool | null = null
let _schemaPromise: Promise<void> | null = null

export function getPool(): Pool {
  if (_pool) return _pool

  // Strip sslmode from URL and configure SSL separately — pg-connection-string
  // parses sslmode=require as verify-full, which fails without the RDS CA bundle.
  // Aurora traffic is already encrypted in transit within the VPC.
  const connStr = (process.env.DATABASE_URL || '').replace(/[?&]sslmode=[^&]*/g, '')
  _pool = new Pool({
    connectionString: connStr,
    max: 3,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    ssl: process.env.DATABASE_URL?.includes('sslmode=')
      ? { rejectUnauthorized: false }
      : undefined,
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

      -- C3PAO-internal reviews and comments on evidence/diagrams.
      -- Per CAP v2.0, the C3PAO only provides MET/NOT_MET verdicts to the OSC —
      -- no remediation guidance. These notes stay local to the container and are
      -- never round-tripped through the Go API or surfaced to contractors.
      CREATE TABLE IF NOT EXISTS c3pao_internal_reviews (
        id TEXT PRIMARY KEY,
        engagement_id TEXT NOT NULL,
        entity_type TEXT NOT NULL CHECK (entity_type IN ('EVIDENCE', 'SSP_DIAGRAM')),
        entity_id TEXT NOT NULL,
        reviewer_id TEXT NOT NULL,
        reviewer_name TEXT NOT NULL,
        reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        comment TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_c3pao_reviews_entity
        ON c3pao_internal_reviews (engagement_id, entity_type, entity_id);
    `)
  })()

  return _schemaPromise
}
