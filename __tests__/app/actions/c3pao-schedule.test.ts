import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { EngagementSchedule } from '@/lib/db-schedule'

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
  requireLeadAssessor: vi.fn(),
}))

vi.mock('@/lib/db-schedule', () => ({
  getSchedule: vi.fn(),
  upsertSchedule: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const { requireAuth, requireLeadAssessor } = await import('@/lib/auth')
const { getSchedule, upsertSchedule } = await import('@/lib/db-schedule')

async function getActions() {
  return import('@/app/actions/c3pao-schedule')
}

function sessionFixture(overrides: Record<string, unknown> = {}): unknown {
  return {
    c3paoUser: {
      id: 'user-1',
      email: 'lead@c3pao.test',
      name: 'Lead User',
      c3paoId: 'c3pao-1',
      c3paoName: 'C3PAO Inc',
      isLeadAssessor: true,
      status: 'active',
    },
    apiToken: 'tok',
    expires: new Date(Date.now() + 3600_000).toISOString(),
    ...overrides,
  }
}

function leadResult(): Awaited<ReturnType<typeof requireLeadAssessor>> {
  return { session: sessionFixture() as never, isLead: true }
}
function nonLeadResult(): Awaited<ReturnType<typeof requireLeadAssessor>> {
  return {
    session: sessionFixture({
      c3paoUser: {
        id: 'user-2',
        email: 'member@c3pao.test',
        name: 'Member',
        c3paoId: 'c3pao-1',
        c3paoName: 'C3PAO Inc',
        isLeadAssessor: false,
        status: 'active',
      },
    }) as never,
    isLead: false,
  }
}

function makeSchedule(overrides: Partial<EngagementSchedule> = {}): EngagementSchedule {
  return {
    engagementId: 'eng-1',
    kickoffDate: null,
    onsiteStart: null,
    onsiteEnd: null,
    interviewSchedule: null,
    deliverableDueDates: null,
    phase1Target: null,
    phase2Target: null,
    phase3Target: null,
    locationNotes: null,
    updatedAt: new Date().toISOString(),
    updatedBy: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(requireAuth).mockResolvedValue(sessionFixture() as never)
})

describe('getEngagementSchedule', () => {
  it('returns unauthorized when no session', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(null)
    const { getEngagementSchedule } = await getActions()
    const result = await getEngagementSchedule('eng-1')
    expect(result.success).toBe(false)
    expect(getSchedule).not.toHaveBeenCalled()
  })

  it('returns null when no schedule row exists', async () => {
    vi.mocked(getSchedule).mockResolvedValueOnce(null)
    const { getEngagementSchedule } = await getActions()
    const result = await getEngagementSchedule('eng-1')
    expect(result.success).toBe(true)
    expect(result.data).toBeNull()
  })

  it('returns the schedule row when it exists', async () => {
    vi.mocked(getSchedule).mockResolvedValueOnce(
      makeSchedule({ kickoffDate: '2026-05-01' }),
    )
    const { getEngagementSchedule } = await getActions()
    const result = await getEngagementSchedule('eng-1')
    expect(result.success).toBe(true)
    expect(result.data?.kickoffDate).toBe('2026-05-01')
  })
})

describe('updateEngagementSchedule', () => {
  it('denies non-lead', async () => {
    vi.mocked(requireLeadAssessor).mockResolvedValueOnce(nonLeadResult())
    const { updateEngagementSchedule } = await getActions()
    const result = await updateEngagementSchedule('eng-1', { kickoffDate: '2026-05-01' })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/lead/i)
    expect(upsertSchedule).not.toHaveBeenCalled()
  })

  it('returns unauthorized when no session', async () => {
    vi.mocked(requireLeadAssessor).mockResolvedValueOnce({
      session: null,
      isLead: false,
      error: 'Unauthorized',
    })
    const { updateEngagementSchedule } = await getActions()
    const result = await updateEngagementSchedule('eng-1', {})
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/unauthorized/i)
  })

  it('upserts and returns the updated row when lead', async () => {
    vi.mocked(requireLeadAssessor).mockResolvedValueOnce(leadResult())
    vi.mocked(upsertSchedule).mockResolvedValueOnce(
      makeSchedule({ kickoffDate: '2026-05-01', updatedBy: 'Lead User' }),
    )
    const { updateEngagementSchedule } = await getActions()
    const result = await updateEngagementSchedule('eng-1', { kickoffDate: '2026-05-01' })
    expect(result.success).toBe(true)
    expect(upsertSchedule).toHaveBeenCalledWith({
      engagementId: 'eng-1',
      actor: expect.objectContaining({ id: 'user-1' }),
      patch: { kickoffDate: '2026-05-01' },
    })
    expect(result.data?.kickoffDate).toBe('2026-05-01')
  })
})
