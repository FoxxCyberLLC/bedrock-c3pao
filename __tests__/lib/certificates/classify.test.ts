import { describe, expect, it } from 'vitest'
import {
  classifyCertificates,
  daysUntil,
} from '@/lib/certificates/classify'
import type { PortfolioListItem } from '@/lib/api-client'

function mk(overrides: Partial<PortfolioListItem> = {}): PortfolioListItem {
  return {
    id: 'id',
    packageName: 'pkg',
    organizationName: 'org',
    status: 'COMPLETED',
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

describe('daysUntil', () => {
  const now = new Date('2026-04-07T00:00:00Z')

  it('returns positive days for future dates', () => {
    expect(daysUntil('2026-04-17T00:00:00Z', now)).toBe(10)
  })

  it('returns 0 for today', () => {
    expect(daysUntil('2026-04-07T00:00:00Z', now)).toBe(0)
  })

  it('returns negative days for past dates', () => {
    expect(daysUntil('2026-04-01T00:00:00Z', now)).toBe(-6)
  })

  it('returns null for null input', () => {
    expect(daysUntil(null, now)).toBeNull()
  })

  it('returns null for invalid dates', () => {
    expect(daysUntil('not-a-date', now)).toBeNull()
  })
})

describe('classifyCertificates', () => {
  const now = new Date('2026-04-07T00:00:00Z')

  it('puts Final Level 2 certificates into the final bucket', () => {
    const items = [
      mk({
        id: 'a',
        certStatus: 'FINAL_LEVEL_2',
        certExpiresAt: '2027-06-01T00:00:00Z',
      }),
    ]
    const buckets = classifyCertificates(items, now)
    expect(buckets.final.map((c) => c.id)).toEqual(['a'])
    expect(buckets.conditional).toEqual([])
    expect(buckets.expired).toEqual([])
  })

  it('puts Conditional Level 2 certificates into the conditional bucket', () => {
    const items = [
      mk({
        id: 'b',
        certStatus: 'CONDITIONAL_LEVEL_2',
        certExpiresAt: '2026-08-01T00:00:00Z',
        poamCloseoutDue: '2026-08-01T00:00:00Z',
      }),
    ]
    const buckets = classifyCertificates(items, now)
    expect(buckets.conditional.map((c) => c.id)).toEqual(['b'])
  })

  it('puts expired certificates into the expired bucket', () => {
    const items = [
      mk({
        id: 'c',
        certStatus: 'FINAL_LEVEL_2',
        certExpiresAt: '2024-01-01T00:00:00Z',
      }),
    ]
    const buckets = classifyCertificates(items, now)
    expect(buckets.expired.map((c) => c.id)).toEqual(['c'])
  })

  it('puts No CMMC Status engagements into the expired bucket (no cert)', () => {
    const items = [mk({ id: 'd', certStatus: 'NO_CMMC_STATUS' })]
    const buckets = classifyCertificates(items, now)
    expect(buckets.expired.map((c) => c.id)).toEqual(['d'])
  })

  it('skips engagements with no cert status at all', () => {
    const items = [mk({ id: 'e', certStatus: null })]
    const buckets = classifyCertificates(items, now)
    expect(buckets.final).toEqual([])
    expect(buckets.conditional).toEqual([])
    expect(buckets.expired).toEqual([])
  })

  it('sorts final certs by expiry ascending (soonest first)', () => {
    const items = [
      mk({
        id: 'a',
        certStatus: 'FINAL_LEVEL_2',
        certExpiresAt: '2028-01-01T00:00:00Z',
      }),
      mk({
        id: 'b',
        certStatus: 'FINAL_LEVEL_2',
        certExpiresAt: '2026-12-01T00:00:00Z',
      }),
      mk({
        id: 'c',
        certStatus: 'FINAL_LEVEL_2',
        certExpiresAt: '2027-06-01T00:00:00Z',
      }),
    ]
    const buckets = classifyCertificates(items, now)
    expect(buckets.final.map((c) => c.id)).toEqual(['b', 'c', 'a'])
  })

  it('sorts conditional certs by POA&M closeout due ascending', () => {
    const items = [
      mk({
        id: 'a',
        certStatus: 'CONDITIONAL_LEVEL_2',
        poamCloseoutDue: '2026-09-01T00:00:00Z',
      }),
      mk({
        id: 'b',
        certStatus: 'CONDITIONAL_LEVEL_2',
        poamCloseoutDue: '2026-05-01T00:00:00Z',
      }),
    ]
    const buckets = classifyCertificates(items, now)
    expect(buckets.conditional.map((c) => c.id)).toEqual(['b', 'a'])
  })
})
