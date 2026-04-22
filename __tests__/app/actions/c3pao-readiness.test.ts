import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReadinessItem } from '@/lib/readiness-types'

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
  requireLeadAssessor: vi.fn(),
}))

vi.mock('@/lib/db-readiness', () => ({
  ensureItemsSeeded: vi.fn(),
  getItems: vi.fn(),
  getItemByKey: vi.fn(),
  markItemComplete: vi.fn(),
  unmarkItemComplete: vi.fn(),
  waiveItem: vi.fn(),
  unwaiveItem: vi.fn(),
  addArtifact: vi.fn(),
  removeArtifact: vi.fn(),
}))

vi.mock('@/lib/db-audit', () => ({
  appendAudit: vi.fn(),
  getAuditLog: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  fetchEngagementPhase: vi.fn(),
  updateEngagementPhase: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const { requireAuth } = await import('@/lib/auth')
const { ensureItemsSeeded, getItems } = await import('@/lib/db-readiness')
const { getAuditLog } = await import('@/lib/db-audit')

async function getActions() {
  return import('@/app/actions/c3pao-readiness')
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

function makeItem(overrides: Partial<ReadinessItem> = {}): ReadinessItem {
  return {
    id: 'item-1',
    engagementId: 'eng-1',
    itemKey: 'contract_executed',
    status: 'not_started',
    completedBy: null,
    completedByEmail: null,
    completedAt: null,
    waivedBy: null,
    waivedByEmail: null,
    waivedAt: null,
    waiverReason: null,
    updatedAt: new Date().toISOString(),
    artifacts: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireAuth).mockResolvedValue(sessionFixture() as never)
})

describe('getReadinessChecklist', () => {
  it('returns unauthorized envelope when no session', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(null)
    const { getReadinessChecklist } = await getActions()
    const result = await getReadinessChecklist('eng-1')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/unauthorized/i)
    expect(ensureItemsSeeded).not.toHaveBeenCalled()
  })

  it('seeds items then returns checklist with completedCount=0 when all not_started', async () => {
    vi.mocked(getItems).mockResolvedValueOnce([
      makeItem({ itemKey: 'contract_executed' }),
      makeItem({ id: 'item-2', itemKey: 'ssp_reviewed' }),
    ])
    const { getReadinessChecklist } = await getActions()
    const result = await getReadinessChecklist('eng-1')
    expect(ensureItemsSeeded).toHaveBeenCalledWith('eng-1')
    expect(result.success).toBe(true)
    expect(result.data?.items).toHaveLength(2)
    expect(result.data?.completedCount).toBe(0)
    expect(result.data?.canStart).toBe(false)
    expect(result.data?.totalCount).toBe(8)
  })

  it('counts complete + waived items toward completedCount and unlocks canStart at 8', async () => {
    const items: ReadinessItem[] = Array.from({ length: 8 }, (_, i) =>
      makeItem({
        id: `item-${i}`,
        itemKey: 'contract_executed',
        status: i % 2 === 0 ? 'complete' : 'waived',
      }),
    )
    vi.mocked(getItems).mockResolvedValueOnce(items)
    const { getReadinessChecklist } = await getActions()
    const result = await getReadinessChecklist('eng-1')
    expect(result.success).toBe(true)
    expect(result.data?.completedCount).toBe(8)
    expect(result.data?.canStart).toBe(true)
  })

  it('returns error envelope on DB failure', async () => {
    vi.mocked(ensureItemsSeeded).mockRejectedValueOnce(new Error('db down'))
    const { getReadinessChecklist } = await getActions()
    const result = await getReadinessChecklist('eng-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('db down')
  })
})

describe('getReadinessAuditLog', () => {
  it('returns unauthorized envelope when no session', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(null)
    const { getReadinessAuditLog } = await getActions()
    const result = await getReadinessAuditLog('eng-1')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/unauthorized/i)
  })

  it('returns audit entries from getAuditLog with limit 200', async () => {
    vi.mocked(getAuditLog).mockResolvedValueOnce([])
    const { getReadinessAuditLog } = await getActions()
    const result = await getReadinessAuditLog('eng-1')
    expect(getAuditLog).toHaveBeenCalledWith('eng-1', { limit: 200 })
    expect(result.success).toBe(true)
    expect(result.data).toEqual([])
  })

  it('returns error envelope on DB failure', async () => {
    vi.mocked(getAuditLog).mockRejectedValueOnce(new Error('pg lost'))
    const { getReadinessAuditLog } = await getActions()
    const result = await getReadinessAuditLog('eng-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('pg lost')
  })
})
