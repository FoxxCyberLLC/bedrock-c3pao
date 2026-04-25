/**
 * Tests for the CAP v2.0 self-attestation flow on the `form_qad` readiness
 * item. Covers both the envelope wrappers (attestFormQad / revokeFormQad)
 * AND the underlying orchestration (selfAttestPreAssessForm /
 * revokeSelfAttestPreAssessForm) so the find-and-upsert decision tree is
 * locked in by behavior tests.
 *
 * Mocking strategy: the api-client primitives (fetchEngagementQAReviews,
 * createQAReview, updateQAReview) are replaced via vi.mock at the module
 * boundary. qa-self-attest.ts imports them across that boundary so vitest
 * can swap them — vitest cannot mock in-module references, which is why
 * the orchestration was placed here rather than inside api-client.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { QAReview } from '@/lib/api-client'

vi.mock('@/lib/api-client', () => ({
  fetchEngagementQAReviews: vi.fn(),
  createQAReview: vi.fn(),
  updateQAReview: vi.fn(),
}))

const {
  fetchEngagementQAReviews,
  createQAReview,
  updateQAReview,
} = await import('@/lib/api-client')

const {
  selfAttestPreAssessForm,
  revokeSelfAttestPreAssessForm,
  attestFormQad,
  revokeFormQad,
} = await import('@/lib/qa-self-attest')

function makeReview(overrides: Partial<QAReview> = {}): QAReview {
  return {
    id: 'qa-1',
    c3paoId: 'c3pao-1',
    engagementId: 'eng-1',
    engagementName: null,
    organizationName: null,
    kind: 'PRE_ASSESS_FORM',
    assignedToId: 'user-1',
    assignedToName: null,
    assignedById: 'user-1',
    status: 'PENDING',
    notes: null,
    assignedAt: '2026-04-24T00:00:00Z',
    completedAt: null,
    selfAttested: true,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('selfAttestPreAssessForm (api-client orchestration)', () => {
  it('returns existing approved self-attested row as no-op', async () => {
    const existing = makeReview({ status: 'APPROVED' })
    vi.mocked(fetchEngagementQAReviews).mockResolvedValueOnce([existing])

    const result = await selfAttestPreAssessForm('eng-1', 'user-1', 'tok')

    expect(result).toEqual(existing)
    expect(createQAReview).not.toHaveBeenCalled()
    expect(updateQAReview).not.toHaveBeenCalled()
  })

  it('returns pre-existing INDEPENDENT approved row without creating a duplicate', async () => {
    const independent = makeReview({
      id: 'indep-1',
      status: 'APPROVED',
      selfAttested: false,
      assignedToId: 'reviewer-x',
    })
    vi.mocked(fetchEngagementQAReviews).mockResolvedValueOnce([independent])

    const result = await selfAttestPreAssessForm('eng-1', 'user-1', 'tok')

    expect(result).toEqual(independent)
    expect(createQAReview).not.toHaveBeenCalled()
    expect(updateQAReview).not.toHaveBeenCalled()
  })

  it('PATCHes existing pending self-attested row to APPROVED', async () => {
    const pending = makeReview({ status: 'PENDING' })
    const approved = makeReview({ status: 'APPROVED' })
    vi.mocked(fetchEngagementQAReviews).mockResolvedValueOnce([pending])
    vi.mocked(updateQAReview).mockResolvedValueOnce(approved)

    const result = await selfAttestPreAssessForm('eng-1', 'user-1', 'tok')

    expect(result).toEqual(approved)
    expect(updateQAReview).toHaveBeenCalledWith('qa-1', { status: 'APPROVED' }, 'tok')
    expect(createQAReview).not.toHaveBeenCalled()
  })

  it('CREATEs then PATCHes when no row exists', async () => {
    const created = makeReview({ status: 'PENDING' })
    const approved = makeReview({ status: 'APPROVED' })
    vi.mocked(fetchEngagementQAReviews).mockResolvedValueOnce([])
    vi.mocked(createQAReview).mockResolvedValueOnce(created)
    vi.mocked(updateQAReview).mockResolvedValueOnce(approved)

    const result = await selfAttestPreAssessForm('eng-1', 'user-1', 'tok')

    expect(result).toEqual(approved)
    expect(createQAReview).toHaveBeenCalledWith(
      'eng-1',
      expect.objectContaining({
        kind: 'PRE_ASSESS_FORM',
        selfAttested: true,
        assignedToId: 'user-1',
      }),
      'tok',
    )
    expect(updateQAReview).toHaveBeenCalledWith('qa-1', { status: 'APPROVED' }, 'tok')
  })

  it('on race: CREATE fails, racing row appears in re-fetch, PATCHes it instead of throwing', async () => {
    const racingRow = makeReview({ id: 'qa-racing', status: 'PENDING' })
    const approved = makeReview({ id: 'qa-racing', status: 'APPROVED' })
    vi.mocked(fetchEngagementQAReviews)
      .mockResolvedValueOnce([])           // first fetch — empty
      .mockResolvedValueOnce([racingRow])  // re-fetch after CREATE failure
    vi.mocked(createQAReview).mockRejectedValueOnce(new Error('unique_violation'))
    vi.mocked(updateQAReview).mockResolvedValueOnce(approved)

    const result = await selfAttestPreAssessForm('eng-1', 'user-1', 'tok')

    expect(result).toEqual(approved)
    expect(updateQAReview).toHaveBeenCalledWith('qa-racing', { status: 'APPROVED' }, 'tok')
  })

  it('on CREATE failure with no racing row in re-fetch, re-throws', async () => {
    vi.mocked(fetchEngagementQAReviews)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
    const apiErr = new Error('server_down')
    vi.mocked(createQAReview).mockRejectedValueOnce(apiErr)

    await expect(selfAttestPreAssessForm('eng-1', 'user-1', 'tok')).rejects.toThrow(
      'server_down',
    )
  })

  it('on PATCH failure after successful CREATE, leaves stranded PENDING row and throws', async () => {
    const created = makeReview({ status: 'PENDING' })
    vi.mocked(fetchEngagementQAReviews).mockResolvedValueOnce([])
    vi.mocked(createQAReview).mockResolvedValueOnce(created)
    vi.mocked(updateQAReview).mockRejectedValueOnce(new Error('patch_failed'))

    await expect(selfAttestPreAssessForm('eng-1', 'user-1', 'tok')).rejects.toThrow(
      'patch_failed',
    )
    expect(updateQAReview).toHaveBeenCalledTimes(1)
    // Row stays PENDING per contract — next call would find it via fetch and PATCH
  })
})

describe('revokeSelfAttestPreAssessForm (api-client orchestration)', () => {
  it('PATCHes APPROVED self-attested row back to PENDING', async () => {
    const approved = makeReview({ status: 'APPROVED' })
    const pending = makeReview({ status: 'PENDING' })
    vi.mocked(fetchEngagementQAReviews).mockResolvedValueOnce([approved])
    vi.mocked(updateQAReview).mockResolvedValueOnce(pending)

    const result = await revokeSelfAttestPreAssessForm('eng-1', 'tok')

    expect(result).toEqual(pending)
    expect(updateQAReview).toHaveBeenCalledWith('qa-1', { status: 'PENDING' }, 'tok')
  })

  it('no-ops when no self-attested row exists', async () => {
    vi.mocked(fetchEngagementQAReviews).mockResolvedValueOnce([])

    const result = await revokeSelfAttestPreAssessForm('eng-1', 'tok')

    expect(result).toBeNull()
    expect(updateQAReview).not.toHaveBeenCalled()
  })

  it('does not touch independent-reviewer APPROVED rows', async () => {
    const independent = makeReview({
      id: 'indep-1',
      status: 'APPROVED',
      selfAttested: false,
    })
    vi.mocked(fetchEngagementQAReviews).mockResolvedValueOnce([independent])

    const result = await revokeSelfAttestPreAssessForm('eng-1', 'tok')

    expect(result).toBeNull()
    expect(updateQAReview).not.toHaveBeenCalled()
  })
})

describe('attestFormQad (envelope wrapper)', () => {
  it('returns success on attestation', async () => {
    vi.mocked(fetchEngagementQAReviews).mockResolvedValueOnce([
      makeReview({ status: 'APPROVED' }),
    ])

    const result = await attestFormQad('eng-1', 'user-1', 'tok')

    expect(result).toEqual({ success: true })
  })

  it('returns failure envelope on api throw', async () => {
    vi.mocked(fetchEngagementQAReviews).mockRejectedValueOnce(new Error('boom'))

    const result = await attestFormQad('eng-1', 'user-1', 'tok')

    expect(result.success).toBe(false)
    expect(result.error).toBe('boom')
  })
})

describe('revokeFormQad (envelope wrapper)', () => {
  it('returns success on revoke', async () => {
    vi.mocked(fetchEngagementQAReviews).mockResolvedValueOnce([])

    const result = await revokeFormQad('eng-1', 'tok')

    expect(result).toEqual({ success: true })
  })

  it('returns failure envelope on api throw', async () => {
    vi.mocked(fetchEngagementQAReviews).mockRejectedValueOnce(new Error('net_down'))

    const result = await revokeFormQad('eng-1', 'tok')

    expect(result.success).toBe(false)
    expect(result.error).toBe('net_down')
  })
})
