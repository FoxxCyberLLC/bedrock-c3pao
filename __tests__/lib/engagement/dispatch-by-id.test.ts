import { describe, it, expect, vi } from 'vitest'
import { dispatchEngagementById } from '@/lib/engagement/dispatch-by-id'
import type { OutsideEngagement } from '@/lib/outside-engagement-types'

const SAMPLE_OUTSIDE: OutsideEngagement = {
  id: 'uuid-1',
  kind: 'outside_osc',
  name: 'Outside',
  clientName: 'Acme',
  clientPocName: 'Jane',
  clientPocEmail: 'j@x',
  scope: null,
  targetLevel: 'L2',
  status: 'PLANNING',
  leadAssessorId: 'lead-1',
  leadAssessorName: 'Lead',
  scheduledStartDate: '2026-05-01',
  scheduledEndDate: '2026-05-31',
  createdBy: 'u',
  createdAt: '2026-04-27T00:00:00Z',
  updatedAt: '2026-04-27T00:00:00Z',
}

describe('dispatchEngagementById', () => {
  it('returns outside_osc when local lookup resolves a row', async () => {
    const resolver = vi.fn().mockResolvedValueOnce(SAMPLE_OUTSIDE)
    const result = await dispatchEngagementById('uuid-1', resolver)
    expect(result.kind).toBe('outside_osc')
    if (result.kind === 'outside_osc') {
      expect(result.engagement.id).toBe('uuid-1')
    }
    expect(resolver).toHaveBeenCalledWith('uuid-1')
  })

  it("returns osc when local lookup returns null (treats id as Go API)", async () => {
    const resolver = vi.fn().mockResolvedValueOnce(null)
    const result = await dispatchEngagementById('eng-go-api', resolver)
    expect(result.kind).toBe('osc')
    if (result.kind === 'osc') {
      expect(result.engagementId).toBe('eng-go-api')
    }
  })

  it('returns osc when local lookup throws (DB unreachable — degrade gracefully)', async () => {
    const resolver = vi.fn().mockRejectedValueOnce(new Error('db down'))
    const result = await dispatchEngagementById('eng-go-api', resolver)
    expect(result.kind).toBe('osc')
  })

  it('local lookup wins on the (vanishingly rare) UUID-collision both-found case', async () => {
    // We model "both found" as: local resolver returns a row. Even if the same
    // id ALSO existed in Go API, we never fall through to OSC because local
    // wins. Defense-in-depth.
    const resolver = vi.fn().mockResolvedValueOnce(SAMPLE_OUTSIDE)
    const result = await dispatchEngagementById('uuid-collide', resolver)
    expect(result.kind).toBe('outside_osc')
  })
})
