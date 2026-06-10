import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth-edge', () => ({
  decryptC3PAOSession: vi.fn().mockResolvedValue(null),
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
    saved = process.env.INSTANCE_API_KEY
    delete process.env.INSTANCE_API_KEY
  })
  afterEach(() => {
    if (saved === undefined) delete process.env.INSTANCE_API_KEY
    else process.env.INSTANCE_API_KEY = saved
  })

  it('a forged bedrock_instance_configured cookie cannot block first-run /setup', async () => {
    const res = await middleware(req('/setup', { bedrock_instance_configured: 'true' }))
    // Setup stays reachable — the middleware passes it through (no redirect),
    // so there is no Location header bouncing it to /login.
    expect(res.headers.get('location')).toBeNull()
  })

  it('an unconfigured instance redirects a protected page to /setup', async () => {
    const res = await middleware(req('/'))
    expect(res.headers.get('location')).toMatch(/\/setup$/)
  })

  it('a configured instance (server env key set) bounces /setup to /login', async () => {
    process.env.INSTANCE_API_KEY = 'bri-test-key'
    const res = await middleware(req('/setup'))
    expect(res.headers.get('location')).toMatch(/\/login$/)
  })
})
