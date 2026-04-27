import { describe, expect, it } from 'vitest'
import { sortItems, toggleSort, type SortState } from '@/lib/engagements-list/sort'
import type { PortfolioListItem } from '@/lib/api-client'

function mk(overrides: Partial<PortfolioListItem> = {}): PortfolioListItem {
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
    ...overrides,
  }
}

const ASC: SortState = { key: 'organization', direction: 'asc' }
const DESC: SortState = { key: 'organization', direction: 'desc' }

describe('sortItems — organization', () => {
  it('sorts case-insensitively ascending', () => {
    const items = [
      mk({ id: 'b', organizationName: 'beta' }),
      mk({ id: 'a', organizationName: 'Alpha' }),
      mk({ id: 'c', organizationName: 'charlie' }),
    ]
    expect(sortItems(items, ASC).map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('reverses for desc', () => {
    const items = [
      mk({ id: 'a', organizationName: 'Alpha' }),
      mk({ id: 'b', organizationName: 'beta' }),
    ]
    expect(sortItems(items, DESC).map((i) => i.id)).toEqual(['b', 'a'])
  })
})

describe('sortItems — phase', () => {
  it('sorts by lifecycle position with PRE_ASSESS first', () => {
    const items = [
      mk({ id: 'r', currentPhase: 'REPORT' }),
      mk({ id: 'p', currentPhase: 'PRE_ASSESS' }),
      mk({ id: 'c', currentPhase: 'CLOSE_OUT' }),
      mk({ id: 'a', currentPhase: 'ASSESS' }),
    ]
    expect(
      sortItems(items, { key: 'phase', direction: 'asc' }).map((i) => i.id),
    ).toEqual(['p', 'a', 'r', 'c'])
  })

  it('pushes unphased rows to the end of asc and desc both', () => {
    const items = [
      mk({ id: 'unphased', status: 'CANCELLED', currentPhase: null }),
      mk({ id: 'a', currentPhase: 'ASSESS' }),
      mk({ id: 'p', currentPhase: 'PRE_ASSESS' }),
    ]
    expect(
      sortItems(items, { key: 'phase', direction: 'asc' }).map((i) => i.id),
    ).toEqual(['p', 'a', 'unphased'])
    expect(
      sortItems(items, { key: 'phase', direction: 'desc' }).map((i) => i.id),
    ).toEqual(['a', 'p', 'unphased'])
  })
})

describe('sortItems — schedule', () => {
  it('sorts by scheduledStartDate, falling back to scheduledEndDate', () => {
    const items = [
      mk({ id: 'no-dates' }),
      mk({ id: 'march', scheduledStartDate: '2026-03-01T00:00:00Z' }),
      mk({ id: 'jan', scheduledStartDate: '2026-01-15T00:00:00Z' }),
      mk({ id: 'end-only', scheduledEndDate: '2026-02-01T00:00:00Z' }),
    ]
    expect(
      sortItems(items, { key: 'schedule', direction: 'asc' }).map((i) => i.id),
    ).toEqual(['jan', 'end-only', 'march', 'no-dates'])
  })
})

describe('sortItems — progress', () => {
  it('orders by computed objective percent', () => {
    const items = [
      mk({ id: 'half', objectivesTotal: 10, objectivesAssessed: 5 }),
      mk({ id: 'done', objectivesTotal: 10, objectivesAssessed: 10 }),
      mk({ id: 'none', objectivesTotal: 10, objectivesAssessed: 0 }),
    ]
    expect(
      sortItems(items, { key: 'progress', direction: 'desc' }).map((i) => i.id),
    ).toEqual(['done', 'half', 'none'])
  })
})

describe('sortItems — risk', () => {
  it('puts OVERDUE last in asc and first in desc', () => {
    const overdue = mk({
      id: 'overdue',
      status: 'IN_PROGRESS',
      scheduledEndDate: '2020-01-01T00:00:00Z',
    })
    const stuck = mk({ id: 'stuck', status: 'IN_PROGRESS', daysInPhase: 30 })
    const fine = mk({ id: 'fine', status: 'IN_PROGRESS', daysInPhase: 1 })
    expect(
      sortItems([overdue, stuck, fine], { key: 'risk', direction: 'asc' }).map(
        (i) => i.id,
      ),
    ).toEqual(['fine', 'stuck', 'overdue'])
    expect(
      sortItems([overdue, stuck, fine], { key: 'risk', direction: 'desc' }).map(
        (i) => i.id,
      ),
    ).toEqual(['overdue', 'stuck', 'fine'])
  })
})

describe('sortItems — updated', () => {
  it('orders by updatedAt with null pushed to the end in both directions', () => {
    const items = [
      mk({ id: 'mid', updatedAt: '2026-03-01T00:00:00Z' }),
      mk({ id: 'unset', updatedAt: '' }),
      mk({ id: 'newest', updatedAt: '2026-04-20T00:00:00Z' }),
      mk({ id: 'oldest', updatedAt: '2026-01-01T00:00:00Z' }),
    ]
    expect(
      sortItems(items, { key: 'updated', direction: 'asc' }).map((i) => i.id),
    ).toEqual(['oldest', 'mid', 'newest', 'unset'])
    expect(
      sortItems(items, { key: 'updated', direction: 'desc' }).map((i) => i.id),
    ).toEqual(['newest', 'mid', 'oldest', 'unset'])
  })
})

describe('sortItems — stability', () => {
  it('preserves original order between equal-keyed items', () => {
    const items = [
      mk({ id: '1', organizationName: 'same' }),
      mk({ id: '2', organizationName: 'same' }),
      mk({ id: '3', organizationName: 'same' }),
    ]
    expect(sortItems(items, ASC).map((i) => i.id)).toEqual(['1', '2', '3'])
  })

  it('does not mutate the input', () => {
    const items = [
      mk({ id: 'b', organizationName: 'beta' }),
      mk({ id: 'a', organizationName: 'alpha' }),
    ]
    const before = items.map((i) => i.id)
    sortItems(items, ASC)
    expect(items.map((i) => i.id)).toEqual(before)
  })
})

describe('toggleSort', () => {
  it('flips direction when same key', () => {
    expect(toggleSort({ key: 'phase', direction: 'asc' }, 'phase')).toEqual({
      key: 'phase',
      direction: 'desc',
    })
    expect(toggleSort({ key: 'phase', direction: 'desc' }, 'phase')).toEqual({
      key: 'phase',
      direction: 'asc',
    })
  })

  it('starts ascending when switching keys', () => {
    expect(toggleSort({ key: 'phase', direction: 'desc' }, 'lead')).toEqual({
      key: 'lead',
      direction: 'asc',
    })
  })
})
