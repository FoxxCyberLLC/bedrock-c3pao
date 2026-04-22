import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { C3PAOSessionPayload } from '@/lib/auth'

const mockCookiesGet = vi.fn()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: mockCookiesGet,
    set: vi.fn(),
    delete: vi.fn(),
  }),
}))

const mockFetchTeam = vi.fn()
vi.mock('@/lib/api-client', () => ({
  fetchTeam: mockFetchTeam,
}))

process.env.AUTH_SECRET = 'test-secret-for-auth-tests-0123456789'

async function buildValidSessionCookie(payload: Partial<C3PAOSessionPayload>): Promise<string> {
  const { encryptSession } = await import('@/lib/auth')
  const full: C3PAOSessionPayload = {
    c3paoUser: {
      id: 'user-1',
      email: 'user@c3pao.test',
      name: 'Test User',
      c3paoId: 'c3pao-1',
      c3paoName: 'Test C3PAO',
      isLeadAssessor: false,
      status: 'active',
    },
    apiToken: 'tok-123',
    expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    ...payload,
  } as C3PAOSessionPayload
  return encryptSession(full as unknown as Record<string, unknown>)
}

describe('requireLeadAssessor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns Unauthorized when there is no session', async () => {
    mockCookiesGet.mockReturnValue(undefined)
    const { requireLeadAssessor } = await import('@/lib/auth')

    const result = await requireLeadAssessor('eng-1')

    expect(result.session).toBeNull()
    expect(result.isLead).toBe(false)
    expect(result.error).toBe('Unauthorized')
    expect(mockFetchTeam).not.toHaveBeenCalled()
  })

  it('short-circuits to isLead=true when session has isLeadAssessor flag set', async () => {
    const cookie = await buildValidSessionCookie({
      c3paoUser: {
        id: 'user-1',
        email: 'lead@c3pao.test',
        name: 'Lead User',
        c3paoId: 'c3pao-1',
        c3paoName: 'Test C3PAO',
        isLeadAssessor: true,
        status: 'active',
      },
    })
    mockCookiesGet.mockReturnValue({ value: cookie })

    const { requireLeadAssessor } = await import('@/lib/auth')
    const result = await requireLeadAssessor('eng-1')

    expect(result.isLead).toBe(true)
    expect(result.session?.c3paoUser.id).toBe('user-1')
    expect(result.error).toBeUndefined()
    expect(mockFetchTeam).not.toHaveBeenCalled()
  })

  it('uses team API to verify lead role when session flag is false', async () => {
    const cookie = await buildValidSessionCookie({})
    mockCookiesGet.mockReturnValue({ value: cookie })

    mockFetchTeam.mockResolvedValueOnce([
      { assessorId: 'other-user', role: 'ASSESSOR' },
      { assessorId: 'user-1', role: 'LEAD_ASSESSOR' },
    ])

    const { requireLeadAssessor } = await import('@/lib/auth')
    const result = await requireLeadAssessor('eng-1')

    expect(mockFetchTeam).toHaveBeenCalledWith('eng-1', 'tok-123')
    expect(result.isLead).toBe(true)
  })

  it('returns isLead=false when caller is on team but not a lead', async () => {
    const cookie = await buildValidSessionCookie({})
    mockCookiesGet.mockReturnValue({ value: cookie })

    mockFetchTeam.mockResolvedValueOnce([
      { assessorId: 'user-1', role: 'ASSESSOR' },
    ])

    const { requireLeadAssessor } = await import('@/lib/auth')
    const result = await requireLeadAssessor('eng-1')

    expect(result.isLead).toBe(false)
    expect(result.error).toBeUndefined()
    expect(result.session).not.toBeNull()
  })

  it('surfaces an error when the team fetch throws', async () => {
    const cookie = await buildValidSessionCookie({})
    mockCookiesGet.mockReturnValue({ value: cookie })

    mockFetchTeam.mockRejectedValueOnce(new Error('network down'))

    const { requireLeadAssessor } = await import('@/lib/auth')
    const result = await requireLeadAssessor('eng-1')

    expect(result.isLead).toBe(false)
    expect(result.error).toBe('Failed to verify lead assessor status')
    expect(result.session).not.toBeNull()
  })
})
