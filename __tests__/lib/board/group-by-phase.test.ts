import { describe, expect, it } from 'vitest'
import {
  groupByPhase,
  resolveDropTargetStatus,
  filterByLead,
  filterByRisk,
  filterByText,
  BOARD_COLUMNS,
} from '@/lib/board/group-by-phase'
import type { PortfolioListItem } from '@/lib/api-client'

function mk(overrides: Partial<PortfolioListItem> = {}): PortfolioListItem {
  return {
    id: 'id',
    packageName: 'pkg',
    organizationName: 'org',
    status: 'IN_PROGRESS',
    leadAssessorId: null,
    leadAssessorName: null,
    scheduledStartDate: null,
    scheduledEndDate: null,
    daysInPhase: 0,
    objectivesTotal: 0,
    objectivesAssessed: 0,
    assessmentResult: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('BOARD_COLUMNS', () => {
  it('exposes 4 columns in CAP phase order', () => {
    expect(BOARD_COLUMNS.map((c) => c.phase)).toEqual([
      'PRE_ASSESS',
      'ASSESS',
      'REPORT',
      'CLOSE_OUT',
    ])
  })

  it('every column has a label and matching id', () => {
    for (const col of BOARD_COLUMNS) {
      expect(col.label.length).toBeGreaterThan(0)
      expect(col.id).toBe(col.phase)
    }
  })
})

describe('groupByPhase', () => {
  it('distributes engagements into their derived phase columns', () => {
    const items: PortfolioListItem[] = [
      mk({ id: 'a', status: 'REQUESTED' }),
      mk({ id: 'b', status: 'IN_PROGRESS' }),
      mk({ id: 'c', status: 'PENDING_APPROVAL' }),
      mk({
        id: 'd',
        status: 'COMPLETED',
        assessmentResult: 'CONDITIONAL_LEVEL_2',
      }),
    ]
    const grouped = groupByPhase(items)
    expect(grouped.PRE_ASSESS.map((i) => i.id)).toEqual(['a'])
    expect(grouped.ASSESS.map((i) => i.id)).toEqual(['b'])
    expect(grouped.REPORT.map((i) => i.id)).toEqual(['c'])
    expect(grouped.CLOSE_OUT.map((i) => i.id)).toEqual(['d'])
  })

  it('excludes cancelled engagements from the board', () => {
    const items: PortfolioListItem[] = [
      mk({ id: 'a', status: 'CANCELLED' }),
      mk({ id: 'b', status: 'IN_PROGRESS' }),
    ]
    const grouped = groupByPhase(items)
    const total = Object.values(grouped).reduce((sum, col) => sum + col.length, 0)
    expect(total).toBe(1)
    expect(grouped.ASSESS.map((i) => i.id)).toEqual(['b'])
  })

  it('excludes COMPLETED+FINAL engagements from the board (terminal success)', () => {
    const items: PortfolioListItem[] = [
      mk({
        id: 'a',
        status: 'COMPLETED',
        assessmentResult: 'FINAL_LEVEL_2',
      }),
      mk({ id: 'b', status: 'IN_PROGRESS' }),
    ]
    const grouped = groupByPhase(items)
    const total = Object.values(grouped).reduce((sum, col) => sum + col.length, 0)
    expect(total).toBe(1)
    expect(grouped.ASSESS.map((i) => i.id)).toEqual(['b'])
  })

  it('returns empty columns when no items', () => {
    const grouped = groupByPhase([])
    expect(grouped.PRE_ASSESS).toEqual([])
    expect(grouped.ASSESS).toEqual([])
    expect(grouped.REPORT).toEqual([])
    expect(grouped.CLOSE_OUT).toEqual([])
  })
})

describe('resolveDropTargetStatus', () => {
  it('maps PRE_ASSESS → ACCEPTED', () => {
    expect(resolveDropTargetStatus('PRE_ASSESS')).toBe('ACCEPTED')
  })

  it('maps ASSESS → IN_PROGRESS', () => {
    expect(resolveDropTargetStatus('ASSESS')).toBe('IN_PROGRESS')
  })

  it('maps REPORT → PENDING_APPROVAL', () => {
    expect(resolveDropTargetStatus('REPORT')).toBe('PENDING_APPROVAL')
  })

  it('maps CLOSE_OUT → COMPLETED', () => {
    expect(resolveDropTargetStatus('CLOSE_OUT')).toBe('COMPLETED')
  })
})

describe('filterByLead', () => {
  const items = [
    mk({ id: 'a', leadAssessorId: 'u1', leadAssessorName: 'Alice' }),
    mk({ id: 'b', leadAssessorId: 'u2', leadAssessorName: 'Bob' }),
    mk({ id: 'c', leadAssessorId: null }),
  ]

  it('returns all items when filter is empty', () => {
    expect(filterByLead(items, null)).toHaveLength(3)
    expect(filterByLead(items, '')).toHaveLength(3)
  })

  it('filters to items led by the specified user', () => {
    const result = filterByLead(items, 'u1')
    expect(result.map((i) => i.id)).toEqual(['a'])
  })

  it('matches the special "unassigned" sentinel for items with no lead', () => {
    const result = filterByLead(items, 'UNASSIGNED')
    expect(result.map((i) => i.id)).toEqual(['c'])
  })
})

describe('filterByRisk', () => {
  const now = new Date('2026-04-07T00:00:00Z')
  const items = [
    mk({ id: 'overdue', status: 'IN_PROGRESS', scheduledEndDate: '2026-01-01T00:00:00Z' }),
    mk({ id: 'stuck', status: 'IN_PROGRESS', daysInPhase: 20 }),
    mk({ id: 'ok', status: 'IN_PROGRESS', daysInPhase: 3 }),
  ]

  it('returns all items when risk filter is off', () => {
    expect(filterByRisk(items, false, now)).toHaveLength(3)
  })

  it('filters to only at-risk / overdue items when risk filter is on', () => {
    const result = filterByRisk(items, true, now)
    expect(result.map((i) => i.id).sort()).toEqual(['overdue', 'stuck'])
  })
})

describe('filterByText', () => {
  const items = [
    mk({ id: '1', packageName: 'Acme SSP', organizationName: 'Acme Defense' }),
    mk({ id: '2', packageName: 'Beta Package', organizationName: 'Beta Corp' }),
  ]

  it('returns all when search is empty', () => {
    expect(filterByText(items, '')).toHaveLength(2)
    expect(filterByText(items, '   ')).toHaveLength(2)
  })

  it('matches package name case-insensitively', () => {
    expect(filterByText(items, 'acme')[0].id).toBe('1')
  })

  it('matches organization name case-insensitively', () => {
    expect(filterByText(items, 'CORP')[0].id).toBe('2')
  })

  it('returns empty when nothing matches', () => {
    expect(filterByText(items, 'zzz')).toEqual([])
  })
})
