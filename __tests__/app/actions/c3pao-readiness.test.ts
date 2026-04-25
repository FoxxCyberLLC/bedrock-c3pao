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
  fetchEngagementDetail: vi.fn(),
  updateEngagementStatus: vi.fn(),
  toggleAssessmentMode: vi.fn(),
  fetchTeam: vi.fn(),
}))

vi.mock('@/lib/qa-self-attest', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/qa-self-attest')>()
  return {
    ...actual,
    attestFormQad: vi.fn(),
    revokeFormQad: vi.fn(),
  }
})

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const { requireAuth, requireLeadAssessor } = await import('@/lib/auth')
const {
  ensureItemsSeeded,
  getItems,
  getItemByKey,
  markItemComplete,
  unmarkItemComplete,
  waiveItem,
  unwaiveItem,
  addArtifact,
  removeArtifact: dbRemoveArtifact,
} = await import('@/lib/db-readiness')
const { appendAudit, getAuditLog } = await import('@/lib/db-audit')
const {
  fetchEngagementPhase,
  updateEngagementPhase,
  fetchEngagementDetail,
  updateEngagementStatus: apiUpdateEngagementStatus,
  toggleAssessmentMode,
} = await import('@/lib/api-client')
const { attestFormQad, revokeFormQad } = await import('@/lib/qa-self-attest')

async function getActions() {
  return import('@/app/actions/c3pao-readiness')
}

async function getArtifactActions() {
  return import('@/app/actions/c3pao-readiness-artifacts')
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

describe('completeItem(form_qad) — self-attestation wiring', () => {
  beforeEach(() => {
    vi.mocked(requireLeadAssessor).mockResolvedValue(leadResult())
    vi.mocked(markItemComplete).mockResolvedValue(
      makeItem({ id: 'item-form-qad', itemKey: 'form_qad', status: 'complete' }),
    )
    vi.mocked(attestFormQad).mockResolvedValue({ success: true })
  })

  it('calls attestFormQad with the lead id and the api token', async () => {
    const { completeItem } = await getActions()
    const result = await completeItem('eng-1', 'form_qad')
    expect(result.success).toBe(true)
    expect(attestFormQad).toHaveBeenCalledTimes(1)
    expect(attestFormQad).toHaveBeenCalledWith('eng-1', 'user-1', 'tok')
  })

  it('does NOT call attestFormQad for non-form_qad items', async () => {
    vi.mocked(markItemComplete).mockResolvedValueOnce(
      makeItem({ status: 'complete', itemKey: 'ssp_reviewed' }),
    )
    const { completeItem } = await getActions()
    const result = await completeItem('eng-1', 'ssp_reviewed')
    expect(result.success).toBe(true)
    expect(attestFormQad).not.toHaveBeenCalled()
  })

  it('rolls back local completion when attestFormQad fails', async () => {
    vi.mocked(attestFormQad).mockResolvedValueOnce({
      success: false,
      error: 'PRE_ASSESS → ASSESS requires an APPROVED pre-assessment form QA review',
    })
    vi.mocked(unmarkItemComplete).mockResolvedValueOnce(
      makeItem({ id: 'item-form-qad', itemKey: 'form_qad', status: 'in_progress' }),
    )
    const { completeItem } = await getActions()
    const result = await completeItem('eng-1', 'form_qad')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/APPROVED pre-assessment/)
    expect(unmarkItemComplete).toHaveBeenCalledWith('eng-1', 'form_qad')
  })

  it('emits a phase_advanced rollback_failed audit when local rollback also fails', async () => {
    vi.mocked(attestFormQad).mockResolvedValueOnce({
      success: false,
      error: 'gate rejected',
    })
    vi.mocked(unmarkItemComplete).mockRejectedValueOnce(new Error('pg lost'))
    const { completeItem } = await getActions()
    const result = await completeItem('eng-1', 'form_qad')
    expect(result.success).toBe(false)
    expect(result.error).toBe('gate rejected')
    // Audit entries: only the rollback_failed one (item_completed audit is
    // skipped because we return early on failure).
    const calls = vi.mocked(appendAudit).mock.calls
    const rollbackEntry = calls.find(
      ([entry]) => entry?.action === 'phase_advanced',
    )
    expect(rollbackEntry).toBeDefined()
    expect(rollbackEntry?.[0].details).toEqual({
      error: 'rollback_failed',
      original: 'gate rejected',
    })
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

describe('uncompleteItem(form_qad) — self-attestation revoke wiring', () => {
  beforeEach(() => {
    vi.mocked(requireLeadAssessor).mockResolvedValue(leadResult())
    vi.mocked(unmarkItemComplete).mockResolvedValue(
      makeItem({ id: 'item-form-qad', itemKey: 'form_qad', status: 'in_progress' }),
    )
    vi.mocked(revokeFormQad).mockResolvedValue({ success: true })
  })

  it('calls revokeFormQad with the api token', async () => {
    const { uncompleteItem } = await getActions()
    const result = await uncompleteItem('eng-1', 'form_qad')
    expect(result.success).toBe(true)
    expect(revokeFormQad).toHaveBeenCalledTimes(1)
    expect(revokeFormQad).toHaveBeenCalledWith('eng-1', 'tok')
  })

  it('does NOT call revokeFormQad for non-form_qad items', async () => {
    vi.mocked(unmarkItemComplete).mockResolvedValueOnce(
      makeItem({ status: 'not_started', itemKey: 'ssp_reviewed' }),
    )
    const { uncompleteItem } = await getActions()
    const result = await uncompleteItem('eng-1', 'ssp_reviewed')
    expect(result.success).toBe(true)
    expect(revokeFormQad).not.toHaveBeenCalled()
  })

  it('rolls back the local re-open by re-marking complete when revoke fails', async () => {
    vi.mocked(revokeFormQad).mockResolvedValueOnce({
      success: false,
      error: 'patch_failed',
    })
    vi.mocked(markItemComplete).mockResolvedValueOnce(
      makeItem({ id: 'item-form-qad', itemKey: 'form_qad', status: 'complete' }),
    )
    const { uncompleteItem } = await getActions()
    const result = await uncompleteItem('eng-1', 'form_qad')
    expect(result.success).toBe(false)
    expect(result.error).toBe('patch_failed')
    expect(markItemComplete).toHaveBeenCalledWith(
      'eng-1',
      'form_qad',
      expect.objectContaining({ id: 'user-1' }),
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

function makePdfFile(opts: { size?: number; type?: string; name?: string } = {}): File {
  const bytes = new Uint8Array(opts.size ?? 4)
  return new File([bytes], opts.name ?? 'contract.pdf', {
    type: opts.type ?? 'application/pdf',
  })
}

describe('uploadArtifact', () => {
  it('returns unauthorized when no session', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(null)
    const fd = new FormData()
    fd.append('file', makePdfFile())
    const { uploadArtifact } = await getArtifactActions()
    const result = await uploadArtifact('eng-1', 'contract_executed', fd)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/unauthorized/i)
  })

  it('rejects invalid item key', async () => {
    const fd = new FormData()
    fd.append('file', makePdfFile())
    const { uploadArtifact } = await getArtifactActions()
    const result = await uploadArtifact('eng-1', 'bogus' as never, fd)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/invalid/i)
  })

  it('rejects empty file', async () => {
    const fd = new FormData()
    fd.append('file', new File([], 'empty.pdf', { type: 'application/pdf' }))
    const { uploadArtifact } = await getArtifactActions()
    const result = await uploadArtifact('eng-1', 'contract_executed', fd)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/empty/i)
  })

  it('rejects files larger than 50 MB', async () => {
    const huge = new File([new Uint8Array(51 * 1024 * 1024)], 'big.pdf', {
      type: 'application/pdf',
    })
    const fd = new FormData()
    fd.append('file', huge)
    const { uploadArtifact } = await getArtifactActions()
    const result = await uploadArtifact('eng-1', 'contract_executed', fd)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/50 MB/i)
  })

  it('rejects disallowed mime types', async () => {
    const fd = new FormData()
    fd.append('file', makePdfFile({ type: 'application/x-msdownload' }))
    const { uploadArtifact } = await getArtifactActions()
    const result = await uploadArtifact('eng-1', 'contract_executed', fd)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/unsupported/i)
  })

  it('rejects when the readiness item has not been seeded', async () => {
    vi.mocked(getItemByKey).mockResolvedValueOnce(null)
    const fd = new FormData()
    fd.append('file', makePdfFile())
    const { uploadArtifact } = await getArtifactActions()
    const result = await uploadArtifact('eng-1', 'contract_executed', fd)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/not found/i)
  })

  it('uploads valid PDF and records audit', async () => {
    vi.mocked(getItemByKey).mockResolvedValueOnce(makeItem({ id: 'item-1' }))
    vi.mocked(addArtifact).mockResolvedValueOnce({
      id: 'artifact-1',
      itemId: 'item-1',
      filename: 'contract.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 4,
      description: null,
      uploadedBy: 'Lead User',
      uploadedByEmail: 'lead@c3pao.test',
      uploadedAt: new Date().toISOString(),
    })
    const fd = new FormData()
    fd.append('file', makePdfFile())
    fd.append('description', 'signed original')
    const { uploadArtifact } = await getArtifactActions()
    const result = await uploadArtifact('eng-1', 'contract_executed', fd)
    expect(result.success).toBe(true)
    expect(result.data?.id).toBe('artifact-1')
    expect(addArtifact).toHaveBeenCalledWith(
      'item-1',
      expect.objectContaining({
        filename: 'contract.pdf',
        mimeType: 'application/pdf',
        uploadedByEmail: 'lead@c3pao.test',
        description: 'signed original',
      }),
    )
    expect(appendAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'artifact_uploaded' }),
    )
  })
})

describe('removeArtifact', () => {
  it('returns unauthorized when no session', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(null)
    const { removeArtifact } = await getArtifactActions()
    const result = await removeArtifact('eng-1', 'contract_executed', 'a1')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/unauthorized/i)
  })

  it('rejects when the readiness item does not exist', async () => {
    vi.mocked(getItemByKey).mockResolvedValueOnce(null)
    const { removeArtifact } = await getArtifactActions()
    const result = await removeArtifact('eng-1', 'contract_executed', 'a1')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/not found/i)
  })

  it('rejects when the artifact belongs to another item', async () => {
    vi.mocked(getItemByKey).mockResolvedValueOnce(makeItem({ artifacts: [] }))
    const { removeArtifact } = await getArtifactActions()
    const result = await removeArtifact('eng-1', 'contract_executed', 'a1')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/artifact not found/i)
  })

  it('denies non-lead trying to remove another user’s artifact', async () => {
    // Caller is a non-lead member; artifact uploaded by someone else.
    vi.mocked(requireAuth).mockResolvedValueOnce(
      sessionFixture({
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
    )
    vi.mocked(requireLeadAssessor).mockResolvedValueOnce(nonLeadResult())
    vi.mocked(getItemByKey).mockResolvedValueOnce(
      makeItem({
        artifacts: [
          {
            id: 'a1',
            itemId: 'item-1',
            filename: 'x.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1,
            description: null,
            uploadedBy: 'Someone Else',
            uploadedByEmail: 'other@c3pao.test',
            uploadedAt: new Date().toISOString(),
          },
        ],
      }),
    )
    const { removeArtifact } = await getArtifactActions()
    const result = await removeArtifact('eng-1', 'contract_executed', 'a1')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/uploader or a lead/i)
    expect(dbRemoveArtifact).not.toHaveBeenCalled()
  })

  it('allows uploader to remove their own artifact', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(
      sessionFixture({
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
    )
    vi.mocked(getItemByKey).mockResolvedValueOnce(
      makeItem({
        artifacts: [
          {
            id: 'a1',
            itemId: 'item-1',
            filename: 'mine.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1,
            description: null,
            uploadedBy: 'Member',
            uploadedByEmail: 'member@c3pao.test',
            uploadedAt: new Date().toISOString(),
          },
        ],
      }),
    )
    const { removeArtifact } = await getArtifactActions()
    const result = await removeArtifact('eng-1', 'contract_executed', 'a1')
    expect(result.success).toBe(true)
    expect(dbRemoveArtifact).toHaveBeenCalledWith('a1')
    expect(appendAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'artifact_removed' }),
    )
  })

  it('allows lead to remove any artifact', async () => {
    vi.mocked(getItemByKey).mockResolvedValueOnce(
      makeItem({
        artifacts: [
          {
            id: 'a1',
            itemId: 'item-1',
            filename: 'others.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1,
            description: null,
            uploadedBy: 'Other',
            uploadedByEmail: 'other@c3pao.test',
            uploadedAt: new Date().toISOString(),
          },
        ],
      }),
    )
    const { removeArtifact } = await getArtifactActions()
    const result = await removeArtifact('eng-1', 'contract_executed', 'a1')
    expect(result.success).toBe(true)
    expect(dbRemoveArtifact).toHaveBeenCalledWith('a1')
  })
})

describe('ensureEngagementInPlanPhase', () => {
  it('returns unauthorized when no session', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(null)
    const { ensureEngagementInPlanPhase } = await getActions()
    const result = await ensureEngagementInPlanPhase('eng-1')
    expect(result.success).toBe(false)
    expect(fetchEngagementPhase).not.toHaveBeenCalled()
  })

  it('sets phase to PRE_ASSESS when currentPhase is empty/null', async () => {
    vi.mocked(fetchEngagementPhase).mockResolvedValueOnce({
      currentPhase: null,
    } as never)
    const { ensureEngagementInPlanPhase } = await getActions()
    const result = await ensureEngagementInPlanPhase('eng-1')
    expect(result.success).toBe(true)
    expect(updateEngagementPhase).toHaveBeenCalledWith('eng-1', 'PRE_ASSESS', 'tok')
  })

  it('is a no-op when engagement is already past the plan phase', async () => {
    vi.mocked(fetchEngagementPhase).mockResolvedValueOnce({
      currentPhase: 'ASSESS',
    } as never)
    const { ensureEngagementInPlanPhase } = await getActions()
    const result = await ensureEngagementInPlanPhase('eng-1')
    expect(result.success).toBe(true)
    expect(updateEngagementPhase).not.toHaveBeenCalled()
  })

  it('is a no-op when engagement is already PRE_ASSESS', async () => {
    vi.mocked(fetchEngagementPhase).mockResolvedValueOnce({
      currentPhase: 'PRE_ASSESS',
    } as never)
    const { ensureEngagementInPlanPhase } = await getActions()
    const result = await ensureEngagementInPlanPhase('eng-1')
    expect(result.success).toBe(true)
    expect(updateEngagementPhase).not.toHaveBeenCalled()
  })
})

function make8ReadyItems(): ReadinessItem[] {
  return Array.from({ length: 8 }, (_, i) =>
    makeItem({
      id: `item-${i}`,
      itemKey: 'contract_executed',
      status: i % 2 === 0 ? 'complete' : 'waived',
    }),
  )
}

describe('startAssessment', () => {
  beforeEach(() => {
    vi.mocked(fetchEngagementDetail).mockResolvedValue({
      status: 'ACCEPTED',
      assessmentModeActive: false,
      currentPhase: 'PRE_ASSESS',
    })
    vi.mocked(apiUpdateEngagementStatus).mockResolvedValue({})
    vi.mocked(toggleAssessmentMode).mockResolvedValue({})
    vi.mocked(updateEngagementPhase).mockResolvedValue({} as never)
  })

  it('denies non-lead', async () => {
    vi.mocked(requireLeadAssessor).mockResolvedValueOnce(nonLeadResult())
    const { startAssessment } = await getActions()
    const result = await startAssessment('eng-1')
    expect(result.success).toBe(false)
    expect(updateEngagementPhase).not.toHaveBeenCalled()
    expect(apiUpdateEngagementStatus).not.toHaveBeenCalled()
    expect(toggleAssessmentMode).not.toHaveBeenCalled()
  })

  it('refuses when fewer than 8 items ready (server re-checks)', async () => {
    vi.mocked(requireLeadAssessor).mockResolvedValueOnce(leadResult())
    vi.mocked(getItems).mockResolvedValueOnce([makeItem({ status: 'complete' })])
    const { startAssessment } = await getActions()
    const result = await startAssessment('eng-1')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/1\/8/)
    expect(updateEngagementPhase).not.toHaveBeenCalled()
    expect(apiUpdateEngagementStatus).not.toHaveBeenCalled()
  })

  it('flips status, toggles mode, advances phase in order, and logs audit', async () => {
    vi.mocked(requireLeadAssessor).mockResolvedValueOnce(leadResult())
    vi.mocked(getItems).mockResolvedValueOnce(make8ReadyItems())
    const { startAssessment } = await getActions()
    const result = await startAssessment('eng-1')
    expect(result.success).toBe(true)
    expect(apiUpdateEngagementStatus).toHaveBeenCalledWith('eng-1', { status: 'IN_PROGRESS' }, 'tok')
    expect(toggleAssessmentMode).toHaveBeenCalledWith('eng-1', true, 'tok')
    expect(updateEngagementPhase).toHaveBeenCalledWith('eng-1', 'ASSESS', 'tok')
    expect(appendAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'phase_advanced',
        details: expect.objectContaining({ to: 'ASSESS', from: 'PRE_ASSESS' }),
      }),
    )
  })

  it('status flip failure: no rollback (nothing was changed) and returns error', async () => {
    vi.mocked(requireLeadAssessor).mockResolvedValueOnce(leadResult())
    vi.mocked(getItems).mockResolvedValueOnce(make8ReadyItems())
    vi.mocked(apiUpdateEngagementStatus).mockRejectedValueOnce(new Error('status forbidden'))
    const { startAssessment } = await getActions()
    const result = await startAssessment('eng-1')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/status forbidden/)
    expect(toggleAssessmentMode).not.toHaveBeenCalled()
    expect(updateEngagementPhase).not.toHaveBeenCalled()
  })

  it('mode toggle failure: rolls back status to original and returns error', async () => {
    vi.mocked(requireLeadAssessor).mockResolvedValueOnce(leadResult())
    vi.mocked(getItems).mockResolvedValueOnce(make8ReadyItems())
    vi.mocked(toggleAssessmentMode).mockRejectedValueOnce(new Error('mode broken'))
    const { startAssessment } = await getActions()
    const result = await startAssessment('eng-1')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/mode broken/)
    // Original ACCEPTED should be restored
    expect(apiUpdateEngagementStatus).toHaveBeenLastCalledWith('eng-1', { status: 'ACCEPTED' }, 'tok')
    expect(updateEngagementPhase).not.toHaveBeenCalled()
  })

  it('phase advance failure (QA gate): rolls back mode then status with original error', async () => {
    vi.mocked(requireLeadAssessor).mockResolvedValueOnce(leadResult())
    vi.mocked(getItems).mockResolvedValueOnce(make8ReadyItems())
    vi.mocked(updateEngagementPhase).mockRejectedValueOnce(
      new Error('PRE_ASSESS → ASSESS requires an APPROVED pre-assessment form QA review'),
    )
    const { startAssessment } = await getActions()
    const result = await startAssessment('eng-1')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/APPROVED pre-assessment form QA review/)
    expect(toggleAssessmentMode).toHaveBeenLastCalledWith('eng-1', false, 'tok')
    expect(apiUpdateEngagementStatus).toHaveBeenLastCalledWith('eng-1', { status: 'ACCEPTED' }, 'tok')
  })

  it('rollback failure logs but does not replace the original error message', async () => {
    vi.mocked(requireLeadAssessor).mockResolvedValueOnce(leadResult())
    vi.mocked(getItems).mockResolvedValueOnce(make8ReadyItems())
    vi.mocked(updateEngagementPhase).mockRejectedValueOnce(new Error('gate rejected'))
    vi.mocked(toggleAssessmentMode).mockImplementationOnce(async () => ({}))
    vi.mocked(toggleAssessmentMode).mockRejectedValueOnce(new Error('mode rollback failed'))
    vi.mocked(apiUpdateEngagementStatus).mockImplementationOnce(async () => ({}))
    vi.mocked(apiUpdateEngagementStatus).mockRejectedValueOnce(new Error('status rollback failed'))
    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { startAssessment } = await getActions()
    const result = await startAssessment('eng-1')
    expect(result.success).toBe(false)
    // Original gate error survives, NOT a rollback error
    expect(result.error).toMatch(/gate rejected/)
    expect(consoleErr).toHaveBeenCalled()
    consoleErr.mockRestore()
  })
})
