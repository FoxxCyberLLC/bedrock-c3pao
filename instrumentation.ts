export async function register() {
  if (process.env.DATABASE_URL) {
    const { ensureSchema } = await import('./lib/db')
    try {
      await ensureSchema()
      console.log('[instrumentation] Database schema initialized')
    } catch (err) {
      console.error('[instrumentation] Schema init failed:', err instanceof Error ? err.message : err)
    }
  }
}
