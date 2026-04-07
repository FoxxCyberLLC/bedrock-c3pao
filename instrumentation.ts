export async function register() {
  // Only run in Node.js runtime (not Edge) — pg requires Node.js crypto module
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.DATABASE_URL) {
    const { ensureSchema, query } = await import('./lib/db')
    try {
      await ensureSchema()
      console.log('[instrumentation] Database schema initialized')

      // Load all config from app_config into process.env so middleware
      // (Edge runtime) and other code can read AUTH_SECRET, INSTANCE_API_KEY,
      // BEDROCK_API_URL, etc. at startup. This restores the behavior that
      // start.js provides in Docker mode for the Fargate (server.js) path.
      const result = await query('SELECT key, value FROM app_config')
      let loaded = 0
      for (const row of result.rows) {
        process.env[row.key] = row.value
        loaded++
      }
      if (loaded > 0) {
        console.log(`[instrumentation] Loaded ${loaded} config values from PostgreSQL`)
      } else {
        console.log('[instrumentation] No config found — setup wizard will be shown')
      }
    } catch (err) {
      console.error('[instrumentation] Schema/config init failed:', err instanceof Error ? err.message : err)
    }
  }
}
