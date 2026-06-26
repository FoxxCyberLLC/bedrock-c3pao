import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth-edge', () => ({
  decryptC3PAOSession: vi.fn().mockResolvedValue(null),
}))

// The configured-gate consults the durable Postgres truth via isInstanceConfigured.
// Mock it so the middleware gate tests drive the configured state directly,
// without a database. (The env-or-DB logic of isInstanceConfigured itself is
// unit-tested in __tests__/lib/instance-config.test.ts.)
const mockIsInstanceConfigured = vi.fn()
vi.mock('@/lib/instance-config', () => ({
  isInstanceConfigured: mockIsInstanceConfigured,
}))

const { middleware } = await import('@/middleware')

function req(path: string, cookies: Record<string, string> = {}): NextRequest {
  const r = new NextRequest(`http://localhost${path}`)
  for (const [k, v] of Object.entries(cookies)) r.cookies.set(k, v)
  return r
}

describe('middleware instance-configured gate (L4)', () => {
  let saved: string | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsInstanceConfigured.mockResolvedValue(false) // default: unconfigured
    saved = process.env.INSTANCE_API_KEY
    delete process.env.INSTANCE_API_KEY
  })
  afterEach(() => {
    if (saved === undefined) delete process.env.INSTANCE_API_KEY
    else process.env.INSTANCE_API_KEY = saved
  })

  it('a forged bedrock_instance_configured cookie cannot block first-run /setup', async () => {
    mockIsInstanceConfigured.mockResolvedValue(false)
    const res = await middleware(req('/setup', { bedrock_instance_configured: 'true' }))
    // Setup stays reachable — the middleware passes it through (no redirect),
    // so there is no Location header bouncing it to /login.
    expect(res.headers.get('location')).toBeNull()
  })

  it('an unconfigured instance redirects a protected page to /setup', async () => {
    mockIsInstanceConfigured.mockResolvedValue(false)
    const res = await middleware(req('/'))
    expect(res.headers.get('location')).toMatch(/\/setup$/)
  })

  it('a configured instance bounces /setup to /login', async () => {
    mockIsInstanceConfigured.mockResolvedValue(true)
    const res = await middleware(req('/setup'))
    expect(res.headers.get('location')).toMatch(/\/login$/)
  })

  // Regression: the setup-loop bug. After setup, the durable config lives in
  // Postgres but this worker's process.env.INSTANCE_API_KEY is not yet populated
  // (only start.js/instrumentation.ts set it, at boot). The gate must consult the
  // DB truth (isInstanceConfigured) — NOT process.env alone — so a freshly
  // configured instance is not bounced back to /setup.
  it('configured via DB only (env key absent in this worker) does NOT loop back to /setup', async () => {
    mockIsInstanceConfigured.mockResolvedValue(true)
    delete process.env.INSTANCE_API_KEY // env not yet set in this worker
    const res = await middleware(req('/'))
    // No session → /login. The bug sent it to /setup instead.
    expect(res.headers.get('location')).not.toMatch(/\/setup$/)
    expect(res.headers.get('location')).toMatch(/\/login$/)
  })
})
