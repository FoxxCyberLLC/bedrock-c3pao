export async function register() {
  // Only run in Node.js runtime (not Edge) — pg requires Node.js crypto module
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.DATABASE_URL) {
    const { ensureSchema } = await import('./lib/db')
    try {
      await ensureSchema()
      console.log('[instrumentation] Database schema initialized')
    } catch (err) {
      console.error('[instrumentation] Schema init failed:', err instanceof Error ? err.message : err)
    }
  }
}
