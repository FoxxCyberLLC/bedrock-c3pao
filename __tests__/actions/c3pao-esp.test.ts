/**
 * Tests for the ESP server actions.
 *
 * These actions were stubs returning empty data / errors prior to the ESP
 * Go API endpoints being added. They now call lib/api-client.ts against the
 * real Go endpoints; tests mock both requireAuth and the api-client fetchers
 * to verify wiring without hitting a live API.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  fetchESPsForEngagement: vi.fn(),
  fetchESPDetailForEngagement: vi.fn(),
}))

import { requireAuth } from '@/lib/auth'
import {
  fetchESPsForEngagement,
  fetchESPDetailForEngagement,
} from '@/lib/api-client'
import {
  getESPsByEngagement,
  getESPDetailForEngagement,
} from '@/app/actions/c3pao-esp'

describe('c3pao-esp server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getESPsByEngagement', () => {
    it('returns success + data when authenticated and api-client succeeds', async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        apiToken: 'tok-xyz',
      } as unknown as Awaited<ReturnType<typeof requireAuth>>)
      vi.mocked(fetchESPsForEngagement).mockResolvedValue([
        {
          id: 'esp-1',
          atoPackageId: 'pkg-1',
          providerName: 'Azure GovCloud',
          providerType: 'CLOUD_SERVICE_PROVIDER',
          status: 'ACTIVE',
          storesCui: true,
          processesCui: true,
          transmitsCui: true,
          fedRampCertified: true,
          cmmcCertified: false,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ])

      const result = await getESPsByEngagement('eng-1')

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0].providerName).toBe('Azure GovCloud')
      expect(fetchESPsForEngagement).toHaveBeenCalledWith('eng-1', 'tok-xyz')
    })

    it('returns success with empty data array when no ESPs exist (not an error)', async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        apiToken: 'tok-xyz',
      } as unknown as Awaited<ReturnType<typeof requireAuth>>)
      vi.mocked(fetchESPsForEngagement).mockResolvedValue([])

      const result = await getESPsByEngagement('eng-2')

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    it('returns Unauthorized when no session', async () => {
      vi.mocked(requireAuth).mockResolvedValue(null)

      const result = await getESPsByEngagement('eng-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
      expect(fetchESPsForEngagement).not.toHaveBeenCalled()
    })

    it('returns failure envelope when api-client throws', async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        apiToken: 'tok-xyz',
      } as unknown as Awaited<ReturnType<typeof requireAuth>>)
      vi.mocked(fetchESPsForEngagement).mockRejectedValue(
        new Error('Go API unavailable'),
      )

      const result = await getESPsByEngagement('eng-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Go API unavailable')
    })
  })

  describe('getESPDetailForEngagement', () => {
    it('returns success + detail including requirementMappings', async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        apiToken: 'tok-xyz',
      } as unknown as Awaited<ReturnType<typeof requireAuth>>)
      vi.mocked(fetchESPDetailForEngagement).mockResolvedValue({
        id: 'esp-1',
        atoPackageId: 'pkg-1',
        providerName: 'Azure GovCloud',
        providerType: 'CLOUD_SERVICE_PROVIDER',
        status: 'ACTIVE',
        storesCui: true,
        processesCui: true,
        transmitsCui: true,
        fedRampCertified: true,
        cmmcCertified: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        requirementMappings: [
          {
            id: 'm-1',
            requirementId: 'r-1',
            inheritanceType: 'FULL',
            controlId: 'AC.L2-3.1.1',
            requirementTitle: 'Limit system access',
            familyCode: 'AC',
            familyName: 'Access Control',
          },
        ],
        dfarsFlowDown: true,
        protectsEnclave: true,
      })

      const result = await getESPDetailForEngagement('eng-1', 'esp-1')

      expect(result.success).toBe(true)
      expect(result.data?.requirementMappings).toHaveLength(1)
      expect(result.data?.requirementMappings[0].controlId).toBe('AC.L2-3.1.1')
      expect(fetchESPDetailForEngagement).toHaveBeenCalledWith(
        'eng-1',
        'esp-1',
        'tok-xyz',
      )
    })

    it('returns Unauthorized when no session', async () => {
      vi.mocked(requireAuth).mockResolvedValue(null)

      const result = await getESPDetailForEngagement('eng-1', 'esp-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
      expect(fetchESPDetailForEngagement).not.toHaveBeenCalled()
    })

    it('returns failure envelope when api-client throws (e.g., 404 cross-org leakage guard)', async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        apiToken: 'tok-xyz',
      } as unknown as Awaited<ReturnType<typeof requireAuth>>)
      vi.mocked(fetchESPDetailForEngagement).mockRejectedValue(
        new Error('esp not found'),
      )

      const result = await getESPDetailForEngagement('eng-1', 'esp-other-org')

      expect(result.success).toBe(false)
      expect(result.error).toContain('esp not found')
    })
  })
})
