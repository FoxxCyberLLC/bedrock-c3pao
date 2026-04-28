import { describe, expect, it } from 'vitest'
import { getPackageQuickStat } from '@/lib/engagements-list/quick-stats'
import type { PortfolioRow } from '@/lib/engagements-list/types'

const NOW = new Date('2026-04-27T12:00:00Z')

function mk(overrides: Partial<PortfolioRow> = {}): PortfolioRow {
  return {
    id: 'id',
    packageName: 'pkg',
    organizationName: 'org',
    status: 'IN_PROGRESS',
    currentPhase: null,
    leadAssessorId: null,
    leadAssessorName: null,
    scheduledStartDate: null,
    scheduledEndDate: null,
    daysInPhase: 0,
    objectivesTotal: 0,
    objectivesAssessed: 0,
    assessmentResult: null,
    certStatus: null,
    certExpiresAt: null,
    poamCloseoutDue: null,
    reevalWindowOpenUntil: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    findingsCount: null,
    kind: 'osc',
    ...overrides,
  }
}

describe('getPackageQuickStat — COMPLETED', () => {
  it('returns the cert result label and tone for FINAL_LEVEL_2', () => {
    const stat = getPackageQuickStat(
      mk({
        status: 'COMPLETED',
        assessmentResult: 'FINAL_LEVEL_2',
        certExpiresAt: '2027-04-27T00:00:00Z',
      }),
      NOW,
    )
    expect(stat).toMatchObject({
      label: 'Result',
      value: 'Final Level 2',
      tone: 'success',
    })
    expect(stat.detail).toMatch(/cert expires/)
  })

  it('flags an expired cert', () => {
    const stat = getPackageQuickStat(
      mk({
        status: 'COMPLETED',
        assessmentResult: 'FINAL_LEVEL_2',
        certExpiresAt: '2025-04-27T00:00:00Z',
      }),
      NOW,
    )
    expect(stat.detail).toBe('cert expired')
  })

  it('returns Awaiting outcome when no result is set yet', () => {
    const stat = getPackageQuickStat(
      mk({ status: 'COMPLETED', assessmentResult: null }),
      NOW,
    )
    expect(stat).toMatchObject({ value: 'Awaiting outcome', tone: 'neutral' })
  })
})

describe('getPackageQuickStat — CLOSE_OUT', () => {
  it('shows POA&M closeout countdown with warn tone for upcoming dates', () => {
    const stat = getPackageQuickStat(
      mk({
        currentPhase: 'CLOSE_OUT',
        poamCloseoutDue: '2026-05-04T00:00:00Z',
      }),
      NOW,
    )
    expect(stat.label).toBe('POA&M closeout')
    expect(stat.value).toMatch(/in \d+ days/)
    expect(stat.tone).toBe('warn')
  })

  it('shows danger tone for overdue closeout', () => {
    const stat = getPackageQuickStat(
      mk({
        currentPhase: 'CLOSE_OUT',
        poamCloseoutDue: '2026-04-01T00:00:00Z',
      }),
      NOW,
    )
    expect(stat.value).toMatch(/overdue/)
    expect(stat.tone).toBe('danger')
  })
})

describe('getPackageQuickStat — REPORT', () => {
  it('flags a row that is awaiting QA approval', () => {
    const stat = getPackageQuickStat(
      mk({ currentPhase: 'REPORT', status: 'PENDING_APPROVAL' }),
      NOW,
    )
    expect(stat).toMatchObject({
      label: 'QA',
      value: 'Awaiting review',
      tone: 'warn',
    })
  })
})

describe('getPackageQuickStat — ASSESS', () => {
  it('shows objectives remaining', () => {
    const stat = getPackageQuickStat(
      mk({
        currentPhase: 'ASSESS',
        objectivesTotal: 110,
        objectivesAssessed: 70,
      }),
      NOW,
    )
    expect(stat).toMatchObject({ label: 'Objectives left', value: '40 to go' })
  })

  it('reports all-assessed when objectives are complete', () => {
    const stat = getPackageQuickStat(
      mk({
        currentPhase: 'ASSESS',
        objectivesTotal: 110,
        objectivesAssessed: 110,
      }),
      NOW,
    )
    expect(stat).toMatchObject({ value: 'all assessed', tone: 'success' })
  })
})

describe('getPackageQuickStat — PRE_ASSESS', () => {
  it('shows the pre-brief countdown', () => {
    const stat = getPackageQuickStat(
      mk({
        currentPhase: 'PRE_ASSESS',
        scheduledStartDate: '2026-05-01T00:00:00Z',
      }),
      NOW,
    )
    expect(stat).toMatchObject({ label: 'Pre-brief', tone: 'warn' })
  })

  it('falls back to Planning when no kickoff date is scheduled', () => {
    const stat = getPackageQuickStat(mk({ currentPhase: 'PRE_ASSESS' }), NOW)
    expect(stat).toMatchObject({ value: 'Planning', tone: 'neutral' })
  })
})

describe('getPackageQuickStat — findings count overlay', () => {
  it('ASSESS surfaces "Findings logged" when findings > 0, replacing objectives left', () => {
    const stat = getPackageQuickStat(
      mk({
        currentPhase: 'ASSESS',
        objectivesTotal: 110,
        objectivesAssessed: 70,
        findingsCount: 5,
      }),
      NOW,
    )
    expect(stat).toEqual({
      label: 'Findings logged',
      value: '5',
      tone: 'info',
    })
  })

  it('ASSESS keeps "Objectives left" when findingsCount is 0 or null', () => {
    const stat = getPackageQuickStat(
      mk({
        currentPhase: 'ASSESS',
        objectivesTotal: 110,
        objectivesAssessed: 70,
        findingsCount: 0,
      }),
      NOW,
    )
    expect(stat.label).toBe('Objectives left')
  })

  it('REPORT (non-pending) surfaces "Findings" when findings > 0', () => {
    const stat = getPackageQuickStat(
      mk({
        currentPhase: 'REPORT',
        status: 'IN_PROGRESS',
        findingsCount: 3,
      }),
      NOW,
    )
    expect(stat).toEqual({
      label: 'Findings',
      value: '3',
      tone: 'info',
    })
  })

  it('REPORT in PENDING_APPROVAL keeps QA label even with findings', () => {
    const stat = getPackageQuickStat(
      mk({
        currentPhase: 'REPORT',
        status: 'PENDING_APPROVAL',
        findingsCount: 7,
      }),
      NOW,
    )
    expect(stat).toMatchObject({ label: 'QA', value: 'Awaiting review' })
  })

  it('CLOSE_OUT with no POA&M deadline but findings > 0 surfaces "Findings"', () => {
    const stat = getPackageQuickStat(
      mk({
        currentPhase: 'CLOSE_OUT',
        poamCloseoutDue: null,
        findingsCount: 2,
      }),
      NOW,
    )
    expect(stat).toEqual({
      label: 'Findings',
      value: '2',
      tone: 'info',
    })
  })

  it('CLOSE_OUT with a POA&M deadline keeps the countdown as primary signal', () => {
    const stat = getPackageQuickStat(
      mk({
        currentPhase: 'CLOSE_OUT',
        poamCloseoutDue: '2026-05-04T00:00:00Z',
        findingsCount: 9,
      }),
      NOW,
    )
    expect(stat.label).toBe('POA&M closeout')
  })

  it('COMPLETED appends "· N findings" to existing cert detail', () => {
    const stat = getPackageQuickStat(
      mk({
        status: 'COMPLETED',
        assessmentResult: 'FINAL_LEVEL_2',
        certExpiresAt: '2027-04-27T00:00:00Z',
        findingsCount: 4,
      }),
      NOW,
    )
    expect(stat.detail).toMatch(/cert expires .* · 4 findings$/)
  })

  it('COMPLETED uses "N findings" as detail when there is no cert detail', () => {
    const stat = getPackageQuickStat(
      mk({
        status: 'COMPLETED',
        assessmentResult: 'FINAL_LEVEL_2',
        certExpiresAt: null,
        findingsCount: 6,
      }),
      NOW,
    )
    expect(stat.detail).toBe('6 findings')
  })
})
