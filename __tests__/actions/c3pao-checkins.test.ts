/**
 * Tests for the createAssessmentCheckin server action.
 *
 * Check-ins are the primary C3PAO → OSC status-update write during assessment.
 * This test locks in the wiring: authenticated happy path hits the api-client,
 * unauthenticated calls return the Unauthorized envelope, api-client errors
 * propagate to the caller as failure envelopes.
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
    createCheckin: vi.fn(),
    fetchCheckins: vi.fn(),
  }
})

import { requireAuth } from '@/lib/auth'
import { createCheckin } from '@/lib/api-client'
import { createAssessmentCheckin } from '@/app/actions/c3pao-dashboard'

describe('createAssessmentCheckin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns success when authenticated and api-client succeeds', async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      apiToken: 'tok-xyz',
    } as unknown as Awaited<ReturnType<typeof requireAuth>>)
    vi.mocked(createCheckin).mockResolvedValue({
      id: 'c-1',
      title: 'Day 1',
      description: 'Started assessment',
    } as unknown as Awaited<ReturnType<typeof createCheckin>>)

    const result = await createAssessmentCheckin('eng-1', 'Day 1', 'Started assessment')

    expect(result.success).toBe(true)
    expect(createCheckin).toHaveBeenCalledWith(
      'eng-1',
      { title: 'Day 1', description: 'Started assessment' },
      'tok-xyz',
    )
  })

  it('returns Unauthorized envelope when session missing', async () => {
    vi.mocked(requireAuth).mockResolvedValue(null)

    const result = await createAssessmentCheckin('eng-1', 'Day 1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
    expect(createCheckin).not.toHaveBeenCalled()
  })

  it('returns failure envelope when api-client throws', async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      apiToken: 'tok-xyz',
    } as unknown as Awaited<ReturnType<typeof requireAuth>>)
    vi.mocked(createCheckin).mockRejectedValue(new Error('Go API 500'))

    const result = await createAssessmentCheckin('eng-1', 'Day 1')

    expect(result.success).toBe(false)
    expect(result.error).toContain('Go API 500')
  })
})
