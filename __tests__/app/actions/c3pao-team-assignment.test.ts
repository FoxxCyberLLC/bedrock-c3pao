/**
 * Tests for setMemberDomains — the per-engagement domain assignment server action.
 *
 * Locks in the auth-gate, success path, and error propagation envelope shape.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('@/lib/api-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-client')>(
    '@/lib/api-client',
  )
  return {
    ...actual,
    setAssessorDomains: vi.fn(),
  }
})

import { requireAuth } from '@/lib/auth'
import { setAssessorDomains } from '@/lib/api-client'
import { setMemberDomains } from '@/app/actions/c3pao-team-assignment'

describe('setMemberDomains', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns Unauthorized when there is no session', async () => {
    vi.mocked(requireAuth).mockResolvedValue(null)
    const result = await setMemberDomains('eng-1', 'a-1', ['AC', 'AT'])
    expect(result).toEqual({ success: false, error: 'Unauthorized' })
    expect(setAssessorDomains).not.toHaveBeenCalled()
  })

  it('returns success: true when api-client succeeds', async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      apiToken: 'tok-xyz',
    } as unknown as Awaited<ReturnType<typeof requireAuth>>)
    vi.mocked(setAssessorDomains).mockResolvedValue([])
    const result = await setMemberDomains('eng-1', 'a-1', ['AC', 'CM'])
    expect(result).toEqual({ success: true })
    expect(setAssessorDomains).toHaveBeenCalledWith(
      'eng-1',
      'a-1',
      ['AC', 'CM'],
      'tok-xyz',
    )
  })

  it('returns error message when api-client throws an Error', async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      apiToken: 'tok-xyz',
    } as unknown as Awaited<ReturnType<typeof requireAuth>>)
    vi.mocked(setAssessorDomains).mockRejectedValue(new Error('Forbidden'))
    const result = await setMemberDomains('eng-1', 'a-1', ['AC'])
    expect(result).toEqual({ success: false, error: 'Forbidden' })
  })

  it('returns generic error when api-client throws non-Error', async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      apiToken: 'tok-xyz',
    } as unknown as Awaited<ReturnType<typeof requireAuth>>)
    vi.mocked(setAssessorDomains).mockRejectedValue('boom')
    const result = await setMemberDomains('eng-1', 'a-1', [])
    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to update domains')
  })
})
