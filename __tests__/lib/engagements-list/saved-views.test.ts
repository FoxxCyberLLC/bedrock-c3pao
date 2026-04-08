import { describe, expect, it } from 'vitest'
import {
  SAVED_VIEWS,
  getSavedViewById,
  applySavedView,
  groupItems,
  GROUP_OPTIONS,
  type SavedViewId,
  type GroupKey,
} from '@/lib/engagements-list/saved-views'
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

describe('SAVED_VIEWS', () => {
  it('exposes the 5 saved views in display order', () => {
    expect(SAVED_VIEWS.map((v) => v.id)).toEqual<SavedViewId[]>([
      'my-active',
      'pre-brief-this-week',
      'at-risk',
      'qa-queue',
      'past-30-completed',
    ])
  })

  it('every saved view has a label and description', () => {
    for (const view of SAVED_VIEWS) {
      expect(view.label.length).toBeGreaterThan(0)
      expect(view.description.length).toBeGreaterThan(0)
    }
  })
})

describe('getSavedViewById', () => {
  it('returns the matching view', () => {
    expect(getSavedViewById('at-risk')?.id).toBe('at-risk')
  })

  it('returns undefined for an unknown id', () => {
    expect(getSavedViewById('bogus' as SavedViewId)).toBeUndefined()
  })
})

describe('applySavedView', () => {
  const now = new Date('2026-04-07T00:00:00Z')
  const items: PortfolioListItem[] = [
    // My active (user-1 is on the team)
    mk({
      id: 'a',
      status: 'IN_PROGRESS',
      leadAssessorId: 'user-1',
      updatedAt: '2026-04-01T00:00:00Z',
    }),
    // Pre-brief this week
    mk({
      id: 'b',
      status: 'ACCEPTED',
      scheduledStartDate: '2026-04-09T00:00:00Z',
    }),
    // At risk (overdue)
    mk({
      id: 'c',
      status: 'IN_PROGRESS',
      scheduledEndDate: '2026-01-01T00:00:00Z',
    }),
    // QA queue
    mk({ id: 'd', status: 'PENDING_APPROVAL' }),
    // Past 30 completed
    mk({
      id: 'e',
      status: 'COMPLETED',
      updatedAt: '2026-03-20T00:00:00Z',
    }),
    // Old completed (> 30 days ago)
    mk({
      id: 'f',
      status: 'COMPLETED',
      updatedAt: '2026-02-01T00:00:00Z',
    }),
    // Cancelled
    mk({ id: 'g', status: 'CANCELLED' }),
  ]

  it('my-active filters to engagements where user is lead and not terminal', () => {
    const result = applySavedView(items, 'my-active', { userId: 'user-1', now })
    expect(result.map((i) => i.id)).toEqual(['a'])
  })

  it('pre-brief-this-week filters to items with a start date in the next 7 days', () => {
    const result = applySavedView(items, 'pre-brief-this-week', {
      userId: 'user-1',
      now,
    })
    expect(result.map((i) => i.id)).toEqual(['b'])
  })

  it('at-risk filters to overdue or stalled items', () => {
    const result = applySavedView(items, 'at-risk', { userId: 'user-1', now })
    expect(result.map((i) => i.id)).toContain('c')
    expect(result.map((i) => i.id)).not.toContain('a')
  })

  it('qa-queue filters to PENDING_APPROVAL', () => {
    const result = applySavedView(items, 'qa-queue', { userId: 'user-1', now })
    expect(result.map((i) => i.id)).toEqual(['d'])
  })

  it('past-30-completed filters to COMPLETED within 30 days', () => {
    const result = applySavedView(items, 'past-30-completed', {
      userId: 'user-1',
      now,
    })
    expect(result.map((i) => i.id)).toEqual(['e'])
  })
})

describe('groupItems', () => {
  const items: PortfolioListItem[] = [
    mk({ id: '1', status: 'IN_PROGRESS', leadAssessorId: 'u1', leadAssessorName: 'Alice', organizationName: 'Acme' }),
    mk({ id: '2', status: 'IN_PROGRESS', leadAssessorId: 'u2', leadAssessorName: 'Bob', organizationName: 'Beta' }),
    mk({ id: '3', status: 'REQUESTED', leadAssessorId: 'u1', leadAssessorName: 'Alice', organizationName: 'Acme' }),
  ]

  it('returns a single empty-key group when grouping is "none"', () => {
    const groups = groupItems(items, 'none')
    expect(groups).toHaveLength(1)
    expect(groups[0].items).toHaveLength(3)
  })

  it('groups by phase', () => {
    const groups = groupItems(items, 'phase')
    const assess = groups.find((g) => g.key === 'ASSESS')
    const preAssess = groups.find((g) => g.key === 'PRE_ASSESS')
    expect(assess?.items.length).toBe(2)
    expect(preAssess?.items.length).toBe(1)
  })

  it('groups by lead assessor name', () => {
    const groups = groupItems(items, 'lead')
    const alice = groups.find((g) => g.label === 'Alice')
    const bob = groups.find((g) => g.label === 'Bob')
    expect(alice?.items.length).toBe(2)
    expect(bob?.items.length).toBe(1)
  })

  it('groups by organization', () => {
    const groups = groupItems(items, 'org')
    const acme = groups.find((g) => g.label === 'Acme')
    expect(acme?.items.length).toBe(2)
  })

  it('groups by status', () => {
    const groups = groupItems(items, 'status')
    const inProgress = groups.find((g) => g.key === 'IN_PROGRESS')
    expect(inProgress?.items.length).toBe(2)
  })

  it('sorts groups deterministically by label', () => {
    const groups = groupItems(items, 'lead')
    const labels = groups.map((g) => g.label)
    const sorted = [...labels].sort()
    expect(labels).toEqual(sorted)
  })

  it('handles null lead assessor with an "Unassigned" group', () => {
    const withUnassigned = [...items, mk({ id: '4', leadAssessorId: null })]
    const groups = groupItems(withUnassigned, 'lead')
    const unassigned = groups.find((g) => g.label === 'Unassigned')
    expect(unassigned?.items.length).toBe(1)
  })
})

describe('GROUP_OPTIONS', () => {
  it('exposes all grouping options', () => {
    const keys = GROUP_OPTIONS.map((o) => o.value)
    expect(keys).toContain<GroupKey>('none')
    expect(keys).toContain<GroupKey>('phase')
    expect(keys).toContain<GroupKey>('lead')
    expect(keys).toContain<GroupKey>('org')
    expect(keys).toContain<GroupKey>('status')
  })
})
