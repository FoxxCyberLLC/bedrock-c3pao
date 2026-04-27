import { describe, expect, it } from 'vitest'
import {
  groupItems,
  GROUP_OPTIONS,
  type GroupKey,
} from '@/lib/engagements-list/saved-views'
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
