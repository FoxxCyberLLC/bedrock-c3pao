export async function register() {
  // Only run in Node.js runtime (not Edge) — pg requires Node.js crypto module
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.DATABASE_URL) {
    const { ensureSchema, query } = await import('./lib/db')
    const { decryptValue } = await import('./lib/crypto')

    try {
      await ensureSchema()
      console.log('[instrumentation] Database schema initialized')
    } catch (err) {
      // Schema-init hardening (retry/exit) is owned by the bootstrap path; log
      // here and continue so a transient DDL error doesn't block config load.
      console.error(
        '[instrumentation] Schema init failed:',
        err instanceof Error ? err.message : err
      )
    }

    // Load all config from app_config into process.env so middleware (Edge
    // runtime) and other code can read AUTH_SECRET, INSTANCE_API_KEY,
    // BEDROCK_API_URL, etc. Sensitive values are stored encrypted — decrypt
    // them here (read-through for legacy plaintext). A decrypt failure is FATAL:
    // a missing/ciphertext AUTH_SECRET silently breaks every login, so we
    // surface it rather than swallow it like before.
    const result = await query('SELECT key, value FROM app_config')
    let loaded = 0
    for (const row of result.rows) {
      process.env[row.key] = decryptValue(row.value)
      loaded++
    }
    if (loaded > 0) {
      console.log(`[instrumentation] Loaded ${loaded} config values from PostgreSQL`)
    } else {
      console.log('[instrumentation] No config found — setup wizard will be shown')
    }
  }
}
