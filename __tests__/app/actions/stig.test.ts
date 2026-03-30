import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/api-client', () => ({ fetchSTIGs: vi.fn() }))

const { requireAuth } = await import('@/lib/auth')
const { fetchSTIGs } = await import('@/lib/api-client')

async function getHandler() {
  const mod = await import('@/app/actions/stig')
  return mod
}

beforeEach(() => {
  vi.mocked(requireAuth).mockResolvedValue({ apiToken: 'tok', email: 'a@b.com' } as any)
  vi.mocked(fetchSTIGs).mockResolvedValue({ targets: [], statistics: {} } as any)
})

describe('getSTIGTargets (H14: auth masking)', () => {
  it('returns success: true with data when authenticated', async () => {
    const { getSTIGTargets } = await getHandler()
    const result = await getSTIGTargets('eng1')
    expect(result.success).toBe(true)
  })

  it('returns success: false with error when unauthenticated (H14)', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(null)
    const { getSTIGTargets } = await getHandler()
    const result = await getSTIGTargets('eng1')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/unauthorized/i)
  })
})

describe('getSTIGStatistics (H14: auth masking)', () => {
  it('returns success: true with statistics when authenticated', async () => {
    const { getSTIGStatistics } = await getHandler()
    const result = await getSTIGStatistics('eng1')
    expect(result.success).toBe(true)
  })

  it('returns success: false with error when unauthenticated (H14)', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(null)
    const { getSTIGStatistics } = await getHandler()
    const result = await getSTIGStatistics('eng1')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/unauthorized/i)
  })
})
