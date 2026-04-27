import { describe, expect, it } from 'vitest'
import { getFreshnessTone } from '@/lib/engagements-list/freshness'

const NOW = new Date('2026-04-27T12:00:00Z')

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
}

describe('getFreshnessTone', () => {
  it('returns "fresh" for an updatedAt that is now (0 days ago)', () => {
    expect(getFreshnessTone(daysAgo(0), NOW)).toBe('fresh')
  })

  it('returns "fresh" exactly at the 3-day boundary', () => {
    expect(getFreshnessTone(daysAgo(3), NOW)).toBe('fresh')
  })

  it('returns "aging" just past the 3-day boundary (4 days)', () => {
    expect(getFreshnessTone(daysAgo(4), NOW)).toBe('aging')
  })

  it('returns "aging" exactly at the 14-day boundary', () => {
    expect(getFreshnessTone(daysAgo(14), NOW)).toBe('aging')
  })

  it('returns "stale" just past the 14-day boundary (15 days)', () => {
    expect(getFreshnessTone(daysAgo(15), NOW)).toBe('stale')
  })

  it('returns "stale" for a long-stale row (30 days)', () => {
    expect(getFreshnessTone(daysAgo(30), NOW)).toBe('stale')
  })

  it('returns "unknown" for null', () => {
    expect(getFreshnessTone(null, NOW)).toBe('unknown')
  })

  it('returns "unknown" for an invalid ISO string', () => {
    expect(getFreshnessTone('not-a-date', NOW)).toBe('unknown')
  })
})
