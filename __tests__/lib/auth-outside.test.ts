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

const mockGetOutsideEngagementLeadId = vi.fn()
vi.mock('@/lib/db-outside-engagement', () => ({
  getOutsideEngagementLeadId: mockGetOutsideEngagementLeadId,
}))

process.env.AUTH_SECRET = 'test-secret-for-auth-tests-0123456789'

async function buildValidSessionCookie(
  payload: Partial<C3PAOSessionPayload>,
): Promise<string> {
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

describe('requireOutsideLeadAssessor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns Unauthorized when there is no session', async () => {
    mockCookiesGet.mockReturnValue(undefined)
    const { requireOutsideLeadAssessor } = await import('@/lib/auth')

    const result = await requireOutsideLeadAssessor('eng-1')

    expect(result.session).toBeNull()
    expect(result.isLead).toBe(false)
    expect(result.error).toBe('Unauthorized')
    expect(mockFetchTeam).not.toHaveBeenCalled()
  })

  it('returns isLead=true when session user matches the outside engagement lead', async () => {
    const cookie = await buildValidSessionCookie({
      c3paoUser: {
        id: 'assessor-1',
        email: 'a@c3pao.test',
        name: 'Lead A',
        c3paoId: 'c3pao-1',
        c3paoName: 'Test C3PAO',
        isLeadAssessor: false,
        status: 'active',
      },
    })
    mockCookiesGet.mockReturnValue({ value: cookie })
    mockGetOutsideEngagementLeadId.mockResolvedValueOnce('assessor-1')

    const { requireOutsideLeadAssessor } = await import('@/lib/auth')
    const result = await requireOutsideLeadAssessor('eng-1')

    expect(result.isLead).toBe(true)
    expect(mockFetchTeam).not.toHaveBeenCalled()
    expect(mockGetOutsideEngagementLeadId).toHaveBeenCalledWith('eng-1')
  })

  it('returns isLead=false when session user does NOT match the lead', async () => {
    const cookie = await buildValidSessionCookie({
      c3paoUser: {
        id: 'assessor-2',
        email: 'b@c3pao.test',
        name: 'Other',
        c3paoId: 'c3pao-1',
        c3paoName: 'Test C3PAO',
        isLeadAssessor: false,
        status: 'active',
      },
    })
    mockCookiesGet.mockReturnValue({ value: cookie })
    mockGetOutsideEngagementLeadId.mockResolvedValueOnce('assessor-1')

    const { requireOutsideLeadAssessor } = await import('@/lib/auth')
    const result = await requireOutsideLeadAssessor('eng-1')

    expect(result.isLead).toBe(false)
    expect(mockFetchTeam).not.toHaveBeenCalled()
  })

  it('returns isLead=true for local admin without consulting the engagement', async () => {
    const cookie = await buildValidSessionCookie({
      c3paoUser: {
        id: 'admin-1',
        email: 'admin@c3pao.test',
        name: 'Admin',
        c3paoId: 'c3pao-1',
        c3paoName: 'Test C3PAO',
        isLeadAssessor: false,
        status: 'active',
      },
      isLocalAdmin: true,
    })
    mockCookiesGet.mockReturnValue({ value: cookie })

    const { requireOutsideLeadAssessor } = await import('@/lib/auth')
    const result = await requireOutsideLeadAssessor('eng-1')

    expect(result.isLead).toBe(true)
    expect(mockGetOutsideEngagementLeadId).not.toHaveBeenCalled()
    expect(mockFetchTeam).not.toHaveBeenCalled()
  })

  it('NEVER calls the Go API even when fetchTeam would throw', async () => {
    mockFetchTeam.mockRejectedValue(new Error('Go API exploded'))
    const cookie = await buildValidSessionCookie({
      c3paoUser: {
        id: 'assessor-1',
        email: 'a@c3pao.test',
        name: 'A',
        c3paoId: 'c3pao-1',
        c3paoName: 'Test C3PAO',
        isLeadAssessor: false,
        status: 'active',
      },
    })
    mockCookiesGet.mockReturnValue({ value: cookie })
    mockGetOutsideEngagementLeadId.mockResolvedValueOnce('assessor-1')

    const { requireOutsideLeadAssessor } = await import('@/lib/auth')
    const result = await requireOutsideLeadAssessor('eng-1')

    expect(result.isLead).toBe(true)
    expect(mockFetchTeam).not.toHaveBeenCalled()
  })

  it('returns isLead=false with an error when DB lookup throws', async () => {
    const cookie = await buildValidSessionCookie({
      c3paoUser: {
        id: 'assessor-1',
        email: 'a@c3pao.test',
        name: 'A',
        c3paoId: 'c3pao-1',
        c3paoName: 'Test C3PAO',
        isLeadAssessor: false,
        status: 'active',
      },
    })
    mockCookiesGet.mockReturnValue({ value: cookie })
    mockGetOutsideEngagementLeadId.mockRejectedValueOnce(new Error('db down'))

    const { requireOutsideLeadAssessor } = await import('@/lib/auth')
    const result = await requireOutsideLeadAssessor('eng-1')

    expect(result.isLead).toBe(false)
    expect(result.error).toBeDefined()
  })
})

describe('requireLeadAssessorByKind', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("dispatches to the outside helper when kind is 'outside_osc'", async () => {
    const cookie = await buildValidSessionCookie({
      c3paoUser: {
        id: 'assessor-1',
        email: 'a@c3pao.test',
        name: 'A',
        c3paoId: 'c3pao-1',
        c3paoName: 'Test C3PAO',
        isLeadAssessor: false,
        status: 'active',
      },
    })
    mockCookiesGet.mockReturnValue({ value: cookie })
    mockGetOutsideEngagementLeadId.mockResolvedValueOnce('assessor-1')

    const { requireLeadAssessorByKind } = await import('@/lib/auth')
    const result = await requireLeadAssessorByKind('eng-1', 'outside_osc')

    expect(result.isLead).toBe(true)
    expect(mockFetchTeam).not.toHaveBeenCalled()
  })

  it("dispatches to the OSC helper (which may call fetchTeam) when kind is 'osc'", async () => {
    const cookie = await buildValidSessionCookie({
      c3paoUser: {
        id: 'assessor-1',
        email: 'a@c3pao.test',
        name: 'A',
        c3paoId: 'c3pao-1',
        c3paoName: 'Test C3PAO',
        isLeadAssessor: false,
        status: 'active',
      },
    })
    mockCookiesGet.mockReturnValue({ value: cookie })
    mockFetchTeam.mockResolvedValueOnce([
      { assessorId: 'assessor-1', role: 'LEAD_ASSESSOR' },
    ])

    const { requireLeadAssessorByKind } = await import('@/lib/auth')
    const result = await requireLeadAssessorByKind('eng-1', 'osc')

    expect(result.isLead).toBe(true)
    expect(mockFetchTeam).toHaveBeenCalled()
    expect(mockGetOutsideEngagementLeadId).not.toHaveBeenCalled()
  })
})
