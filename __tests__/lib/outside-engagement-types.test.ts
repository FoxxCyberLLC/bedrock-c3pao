import { describe, it, expect } from 'vitest'
import {
  isOSCEngagement,
  isOutsideEngagement,
  type EngagementKind,
  type OutsideEngagement,
  type OutsideEngagementListItem,
  type OSCEngagementListItem,
  type MergedEngagementListItem,
} from '@/lib/outside-engagement-types'
import type { PortfolioListItem } from '@/lib/api-client'

const portfolioBase: PortfolioListItem = {
  id: '11111111-1111-4111-8111-111111111111',
  packageName: 'Acme L2',
  organizationName: 'Acme Corp',
  status: 'PLANNING',
  currentPhase: null,
  leadAssessorId: 'assessor-1',
  leadAssessorName: 'Lead Smith',
  scheduledStartDate: '2026-05-01',
  scheduledEndDate: '2026-05-31',
  daysInPhase: 0,
  objectivesTotal: 320,
  objectivesAssessed: 0,
  assessmentResult: null,
  certStatus: null,
  certExpiresAt: null,
  poamCloseoutDue: null,
  reevalWindowOpenUntil: null,
  createdAt: '2026-04-27T00:00:00Z',
  updatedAt: '2026-04-27T00:00:00Z',
}

describe('outside-engagement-types', () => {
  describe('EngagementKind', () => {
    it('accepts the two valid kind values', () => {
      const oscKind: EngagementKind = 'osc'
      const outsideKind: EngagementKind = 'outside_osc'
      expect(oscKind).toBe('osc')
      expect(outsideKind).toBe('outside_osc')
    })
  })

  describe('isOSCEngagement', () => {
    it('returns true when kind is "osc"', () => {
      const item = { kind: 'osc' as const }
      expect(isOSCEngagement(item)).toBe(true)
    })

    it('returns false when kind is "outside_osc"', () => {
      const item = { kind: 'outside_osc' as const }
      expect(isOSCEngagement(item)).toBe(false)
    })

    it('narrows to the OSC variant of a discriminated union', () => {
      const item: MergedEngagementListItem = { ...portfolioBase, kind: 'osc' }
      if (!isOSCEngagement(item)) {
        throw new Error('expected isOSCEngagement to narrow to osc')
      }
      const narrowed: 'osc' = item.kind
      expect(narrowed).toBe('osc')
    })
  })

  describe('isOutsideEngagement', () => {
    it('returns true when kind is "outside_osc"', () => {
      const item = { kind: 'outside_osc' as const }
      expect(isOutsideEngagement(item)).toBe(true)
    })

    it('returns false when kind is "osc"', () => {
      const item = { kind: 'osc' as const }
      expect(isOutsideEngagement(item)).toBe(false)
    })

    it('narrows to the outside variant of a discriminated union', () => {
      const item: MergedEngagementListItem = { ...portfolioBase, kind: 'outside_osc' }
      if (!isOutsideEngagement(item)) {
        throw new Error('expected isOutsideEngagement to narrow to outside_osc')
      }
      const narrowed: 'outside_osc' = item.kind
      expect(narrowed).toBe('outside_osc')
    })
  })

  describe('OutsideEngagement shape', () => {
    it('compiles with all required fields populated', () => {
      const eng: OutsideEngagement = {
        id: '22222222-2222-4222-8222-222222222222',
        kind: 'outside_osc',
        name: 'Acme Outside Assessment',
        clientName: 'Acme Corp',
        clientPocName: 'Jane Doe',
        clientPocEmail: 'jane@acme.example',
        scope: 'Test scope statement',
        targetLevel: 'L2',
        status: 'PLANNING',
        leadAssessorId: 'assessor-1',
        leadAssessorName: 'Lead Smith',
        scheduledStartDate: '2026-05-01',
        scheduledEndDate: '2026-05-31',
        createdBy: 'user-1',
        createdAt: '2026-04-27T00:00:00Z',
        updatedAt: '2026-04-27T00:00:00Z',
      }
      expect(eng.kind).toBe('outside_osc')
      expect(eng.targetLevel).toBe('L2')
      expect(eng.status).toBe('PLANNING')
    })

    it('allows scope to be null', () => {
      const eng: OutsideEngagement = {
        id: '22222222-2222-4222-8222-222222222222',
        kind: 'outside_osc',
        name: 'No-scope engagement',
        clientName: 'Acme',
        clientPocName: 'Jane',
        clientPocEmail: 'jane@acme.example',
        scope: null,
        targetLevel: 'L2',
        status: 'PLANNING',
        leadAssessorId: 'a',
        leadAssessorName: 'A',
        scheduledStartDate: '2026-05-01',
        scheduledEndDate: '2026-05-31',
        createdBy: 'u',
        createdAt: '2026-04-27T00:00:00Z',
        updatedAt: '2026-04-27T00:00:00Z',
      }
      expect(eng.scope).toBeNull()
    })
  })

  describe('OutsideEngagementListItem', () => {
    it('extends PortfolioListItem with kind="outside_osc"', () => {
      const outsideListItem: OutsideEngagementListItem = {
        ...portfolioBase,
        kind: 'outside_osc',
      }
      expect(outsideListItem.kind).toBe('outside_osc')
      expect(outsideListItem.id).toBe(portfolioBase.id)
      expect(outsideListItem.organizationName).toBe(portfolioBase.organizationName)
    })
  })

  describe('OSCEngagementListItem', () => {
    it('extends PortfolioListItem with kind="osc"', () => {
      const oscListItem: OSCEngagementListItem = {
        ...portfolioBase,
        kind: 'osc',
      }
      expect(oscListItem.kind).toBe('osc')
    })
  })

  describe('MergedEngagementListItem', () => {
    it('is a discriminated union switchable on kind', () => {
      const items: MergedEngagementListItem[] = [
        { ...portfolioBase, kind: 'osc' },
        { ...portfolioBase, kind: 'outside_osc' },
      ]
      const oscCount = items.filter(isOSCEngagement).length
      const outsideCount = items.filter(isOutsideEngagement).length
      expect(oscCount).toBe(1)
      expect(outsideCount).toBe(1)
    })
  })
})
