import { describe, expect, it } from 'vitest'
import {
  deriveRisk,
  computeProgressPercent,
  derivePhaseFromStatus,
  resolvePhase,
  filterMyAssigned,
  type Phase,
  type Risk,
} from '@/lib/portfolio/derive-risk'
import type { PortfolioListItem } from '@/lib/api-client'

function mkItem(overrides: Partial<PortfolioListItem> = {}): PortfolioListItem {
  return {
    id: 'e1',
    packageName: 'Acme SSP',
    organizationName: 'Acme Defense',
    status: 'IN_PROGRESS',
    currentPhase: null,
    leadAssessorId: null,
    leadAssessorName: null,
    scheduledStartDate: null,
    scheduledEndDate: null,
    daysInPhase: 0,
    objectivesTotal: 100,
    objectivesAssessed: 0,
    assessmentResult: null,
    certStatus: null,
    certExpiresAt: null,
    poamCloseoutDue: null,
    reevalWindowOpenUntil: null,
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
    ...overrides,
  }
}

describe('deriveRisk', () => {
  it('returns OVERDUE when scheduledEndDate is in the past', () => {
    const item = mkItem({
      scheduledEndDate: '2026-01-01T00:00:00Z',
      daysInPhase: 1,
    })
    const now = new Date('2026-04-07T00:00:00Z')
    expect(deriveRisk(item, now)).toBe<Risk>('OVERDUE')
  })

  it('returns AT_RISK when stuck > 14 days in phase and no end date', () => {
    const item = mkItem({ daysInPhase: 20 })
    const now = new Date('2026-04-07T00:00:00Z')
    expect(deriveRisk(item, now)).toBe<Risk>('AT_RISK')
  })

  it('returns ON_TRACK when within schedule and not stuck', () => {
    const item = mkItem({
      scheduledEndDate: '2026-05-01T00:00:00Z',
      daysInPhase: 3,
    })
    const now = new Date('2026-04-07T00:00:00Z')
    expect(deriveRisk(item, now)).toBe<Risk>('ON_TRACK')
  })

  it('prefers OVERDUE over AT_RISK when both conditions match', () => {
    const item = mkItem({
      scheduledEndDate: '2026-02-01T00:00:00Z',
      daysInPhase: 30,
    })
    const now = new Date('2026-04-07T00:00:00Z')
    expect(deriveRisk(item, now)).toBe<Risk>('OVERDUE')
  })

  it('treats CANCELLED and COMPLETED engagements as ON_TRACK (not at-risk)', () => {
    const completed = mkItem({
      status: 'COMPLETED',
      scheduledEndDate: '2026-01-01T00:00:00Z', // past, but terminal
    })
    const cancelled = mkItem({
      status: 'CANCELLED',
      daysInPhase: 100,
    })
    const now = new Date('2026-04-07T00:00:00Z')
    expect(deriveRisk(completed, now)).toBe<Risk>('ON_TRACK')
    expect(deriveRisk(cancelled, now)).toBe<Risk>('ON_TRACK')
  })
})

describe('computeProgressPercent', () => {
  it('returns 0 when no objectives', () => {
    expect(computeProgressPercent(mkItem({ objectivesTotal: 0 }))).toBe(0)
  })

  it('computes percentage correctly for partial progress', () => {
    expect(
      computeProgressPercent(
        mkItem({ objectivesTotal: 100, objectivesAssessed: 42 }),
      ),
    ).toBe(42)
  })

  it('clamps to 100', () => {
    expect(
      computeProgressPercent(
        mkItem({ objectivesTotal: 10, objectivesAssessed: 999 }),
      ),
    ).toBe(100)
  })

  it('never returns NaN when objectivesTotal is 0', () => {
    expect(
      computeProgressPercent(
        mkItem({ objectivesTotal: 0, objectivesAssessed: 5 }),
      ),
    ).toBe(0)
  })
})

describe('derivePhaseFromStatus', () => {
  it('maps pre-assessment funnel statuses to PRE_ASSESS', () => {
    const preAssessStatuses = [
      'REQUESTED',
      'INTRODUCED',
      'ACKNOWLEDGED',
      'PROPOSAL_SENT',
      'PROPOSAL_ACCEPTED',
      'ACCEPTED',
    ]
    for (const s of preAssessStatuses) {
      expect(derivePhaseFromStatus(s, null)).toBe<Phase>('PRE_ASSESS')
    }
  })

  it('maps IN_PROGRESS to ASSESS', () => {
    expect(derivePhaseFromStatus('IN_PROGRESS', null)).toBe<Phase>('ASSESS')
  })

  it('maps PENDING_APPROVAL to REPORT', () => {
    expect(derivePhaseFromStatus('PENDING_APPROVAL', null)).toBe<Phase>('REPORT')
  })

  it('maps COMPLETED+CONDITIONAL to CLOSE_OUT', () => {
    expect(
      derivePhaseFromStatus('COMPLETED', 'CONDITIONAL_LEVEL_2'),
    ).toBe<Phase>('CLOSE_OUT')
  })

  it('maps COMPLETED+FINAL to REPORT (terminal)', () => {
    expect(derivePhaseFromStatus('COMPLETED', 'FINAL_LEVEL_2')).toBe<Phase>(
      'REPORT',
    )
  })

  it('returns null for CANCELLED', () => {
    expect(derivePhaseFromStatus('CANCELLED', null)).toBeNull()
  })
})

describe('resolvePhase', () => {
  it('prefers the Task 8 currentPhase column when set', () => {
    const item = mkItem({
      status: 'IN_PROGRESS',
      currentPhase: 'REPORT', // server moved this engagement to REPORT explicitly
    })
    expect(resolvePhase(item)).toBe<Phase>('REPORT')
  })

  it('falls back to derivePhaseFromStatus when currentPhase is null', () => {
    const item = mkItem({
      status: 'IN_PROGRESS',
      currentPhase: null,
    })
    expect(resolvePhase(item)).toBe<Phase>('ASSESS')
  })

  it('ignores an unknown string in currentPhase and falls back', () => {
    const item = mkItem({
      status: 'COMPLETED',
      assessmentResult: 'CONDITIONAL_LEVEL_2',
      // defensive: pretend the API sent something weird
      currentPhase: 'UNKNOWN_PHASE',
    })
    expect(resolvePhase(item)).toBe<Phase>('CLOSE_OUT')
  })

  it('returns null for a CANCELLED engagement with no currentPhase', () => {
    expect(
      resolvePhase(mkItem({ status: 'CANCELLED', currentPhase: null })),
    ).toBeNull()
  })
})

describe('filterMyAssigned', () => {
  const items = [
    mkItem({ id: 'a', leadAssessorId: 'user-1' }),
    mkItem({ id: 'b', leadAssessorId: 'user-2' }),
    mkItem({ id: 'c', leadAssessorId: null }),
  ]

  it('returns only items where the current user is the lead assessor', () => {
    const result = filterMyAssigned(items, 'user-1')
    expect(result.map((i) => i.id)).toEqual(['a'])
  })

  it('returns empty when the user has no assignments', () => {
    const result = filterMyAssigned(items, 'user-999')
    expect(result).toEqual([])
  })

  it('returns empty when userId is missing', () => {
    expect(filterMyAssigned(items, null)).toEqual([])
    expect(filterMyAssigned(items, undefined)).toEqual([])
  })
})
