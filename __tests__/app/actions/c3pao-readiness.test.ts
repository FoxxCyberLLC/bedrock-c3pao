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

const { requireAuth, requireLeadAssessor } = await import('@/lib/auth')
const {
  ensureItemsSeeded,
  getItems,
  markItemComplete,
  unmarkItemComplete,
  waiveItem,
  unwaiveItem,
} = await import('@/lib/db-readiness')
const { appendAudit, getAuditLog } = await import('@/lib/db-audit')

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

function leadResult(): Awaited<ReturnType<typeof requireLeadAssessor>> {
  return {
    session: sessionFixture() as never,
    isLead: true,
  }
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

describe('completeItem', () => {
  it('denies non-lead', async () => {
    vi.mocked(requireLeadAssessor).mockResolvedValueOnce(nonLeadResult())
    const { completeItem } = await getActions()
    const result = await completeItem('eng-1', 'contract_executed')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/lead/i)
    expect(markItemComplete).not.toHaveBeenCalled()
  })

  it('rejects invalid item key', async () => {
    const { completeItem } = await getActions()
    const result = await completeItem('eng-1', 'not_a_real_key' as never)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/invalid/i)
  })

  it('marks complete and writes audit entry when lead', async () => {
    vi.mocked(requireLeadAssessor).mockResolvedValueOnce(leadResult())
    vi.mocked(markItemComplete).mockResolvedValueOnce(
      makeItem({ status: 'complete', id: 'item-1' }),
    )
    const { completeItem } = await getActions()
    const result = await completeItem('eng-1', 'contract_executed')
    expect(result.success).toBe(true)
    expect(markItemComplete).toHaveBeenCalledWith(
      'eng-1',
      'contract_executed',
      expect.objectContaining({ id: 'user-1', email: 'lead@c3pao.test' }),
    )
    expect(appendAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        engagementId: 'eng-1',
        itemId: 'item-1',
        action: 'item_completed',
      }),
    )
  })
})

describe('uncompleteItem', () => {
  it('denies non-lead', async () => {
    vi.mocked(requireLeadAssessor).mockResolvedValueOnce(nonLeadResult())
    const { uncompleteItem } = await getActions()
    const result = await uncompleteItem('eng-1', 'contract_executed')
    expect(result.success).toBe(false)
    expect(unmarkItemComplete).not.toHaveBeenCalled()
  })

  it('clears completion when lead', async () => {
    vi.mocked(requireLeadAssessor).mockResolvedValueOnce(leadResult())
    vi.mocked(unmarkItemComplete).mockResolvedValueOnce(
      makeItem({ status: 'not_started' }),
    )
    const { uncompleteItem } = await getActions()
    const result = await uncompleteItem('eng-1', 'contract_executed')
    expect(result.success).toBe(true)
    expect(appendAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'item_uncompleted' }),
    )
  })
})

describe('grantWaiver', () => {
  it('rejects reasons shorter than 20 chars', async () => {
    const { grantWaiver } = await getActions()
    const result = await grantWaiver('eng-1', 'contract_executed', 'too short')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/at least 20/i)
    expect(waiveItem).not.toHaveBeenCalled()
    expect(requireLeadAssessor).not.toHaveBeenCalled()
  })

  it('trims reasons before length check', async () => {
    const { grantWaiver } = await getActions()
    // 19 non-space chars plus surrounding whitespace — trimmed should fail
    const result = await grantWaiver('eng-1', 'contract_executed', '   1234567890123456789   ')
    expect(result.success).toBe(false)
    expect(waiveItem).not.toHaveBeenCalled()
  })

  it('denies non-lead even with valid reason', async () => {
    vi.mocked(requireLeadAssessor).mockResolvedValueOnce(nonLeadResult())
    const { grantWaiver } = await getActions()
    const reason = 'Standing COI register already on file for this engagement'
    const result = await grantWaiver('eng-1', 'coi_cleared', reason)
    expect(result.success).toBe(false)
    expect(waiveItem).not.toHaveBeenCalled()
  })

  it('applies waiver and writes audit entry when lead', async () => {
    vi.mocked(requireLeadAssessor).mockResolvedValueOnce(leadResult())
    vi.mocked(waiveItem).mockResolvedValueOnce(
      makeItem({ status: 'waived', id: 'item-3' }),
    )
    const reason = 'Reviewed live in working session, no external doc needed'
    const { grantWaiver } = await getActions()
    const result = await grantWaiver('eng-1', 'ssp_reviewed', reason)
    expect(result.success).toBe(true)
    expect(waiveItem).toHaveBeenCalledWith(
      'eng-1',
      'ssp_reviewed',
      reason,
      expect.objectContaining({ id: 'user-1' }),
    )
    expect(appendAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'waiver_granted',
        details: expect.objectContaining({ reason }),
      }),
    )
  })
})

describe('revokeWaiver', () => {
  it('denies non-lead', async () => {
    vi.mocked(requireLeadAssessor).mockResolvedValueOnce(nonLeadResult())
    const { revokeWaiver } = await getActions()
    const result = await revokeWaiver('eng-1', 'contract_executed')
    expect(result.success).toBe(false)
    expect(unwaiveItem).not.toHaveBeenCalled()
  })

  it('revokes waiver and writes audit entry', async () => {
    vi.mocked(requireLeadAssessor).mockResolvedValueOnce(leadResult())
    vi.mocked(unwaiveItem).mockResolvedValueOnce(
      makeItem({ status: 'not_started' }),
    )
    const { revokeWaiver } = await getActions()
    const result = await revokeWaiver('eng-1', 'contract_executed')
    expect(result.success).toBe(true)
    expect(appendAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'waiver_revoked' }),
    )
  })
})
