import { describe, expect, it } from 'vitest'
import {
  buildCalendarEvents,
  groupEventsByDay,
  getMonthDays,
  getWeekDays,
  EVENT_TYPE_ORDER,
} from '@/lib/calendar/build-events'
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

describe('buildCalendarEvents', () => {
  it('emits SCHEDULED_START events for engagements with a start date', () => {
    const events = buildCalendarEvents([
      mk({ id: 'a', scheduledStartDate: '2026-04-10T00:00:00Z' }),
    ])
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('SCHEDULED_START')
    expect(events[0].engagementId).toBe('a')
  })

  it('emits SCHEDULED_END events for engagements with an end date', () => {
    const events = buildCalendarEvents([
      mk({ id: 'a', scheduledEndDate: '2026-04-20T00:00:00Z' }),
    ])
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('SCHEDULED_END')
  })

  it('emits both SCHEDULED_START and SCHEDULED_END when both dates are set', () => {
    const events = buildCalendarEvents([
      mk({
        id: 'a',
        scheduledStartDate: '2026-04-10T00:00:00Z',
        scheduledEndDate: '2026-04-20T00:00:00Z',
      }),
    ])
    expect(events).toHaveLength(2)
    expect(new Set(events.map((e) => e.type))).toEqual(
      new Set(['SCHEDULED_START', 'SCHEDULED_END']),
    )
  })

  it('emits POAM_CLOSEOUT events for Conditional completed engagements', () => {
    const events = buildCalendarEvents([
      mk({
        id: 'a',
        status: 'COMPLETED',
        assessmentResult: 'CONDITIONAL_LEVEL_2',
        // completionDate captured via updatedAt as a rough proxy
        updatedAt: '2026-04-01T00:00:00Z',
      }),
    ])
    // One POAM_CLOSEOUT event (180 days after completion)
    const closeoutEvents = events.filter((e) => e.type === 'POAM_CLOSEOUT')
    expect(closeoutEvents.length).toBe(1)
  })

  it('emits CERT_EXPIRY events for FINAL completed engagements', () => {
    const events = buildCalendarEvents([
      mk({
        id: 'a',
        status: 'COMPLETED',
        assessmentResult: 'FINAL_LEVEL_2',
        updatedAt: '2026-04-01T00:00:00Z',
      }),
    ])
    const expiryEvents = events.filter((e) => e.type === 'CERT_EXPIRY')
    expect(expiryEvents.length).toBe(1)
  })

  it('skips engagements with no dates at all', () => {
    const events = buildCalendarEvents([
      mk({ id: 'a' }),
    ])
    expect(events).toEqual([])
  })

  it('ignores malformed dates silently', () => {
    const events = buildCalendarEvents([
      mk({
        id: 'a',
        scheduledStartDate: 'not-a-date',
      }),
    ])
    expect(events).toEqual([])
  })
})

describe('groupEventsByDay', () => {
  it('buckets events by ISO date key', () => {
    const events = buildCalendarEvents([
      mk({
        id: 'a',
        scheduledStartDate: '2026-04-10T00:00:00Z',
        scheduledEndDate: '2026-04-10T00:00:00Z',
      }),
    ])
    const buckets = groupEventsByDay(events)
    const key = '2026-04-10'
    expect(buckets.get(key)).toBeDefined()
    expect(buckets.get(key)?.length).toBe(2)
  })

  it('returns an empty map for no events', () => {
    expect(groupEventsByDay([]).size).toBe(0)
  })
})

describe('getMonthDays', () => {
  it('returns a full calendar grid including leading/trailing days', () => {
    const days = getMonthDays(new Date('2026-04-15T00:00:00Z'))
    // Must be a multiple of 7 (full weeks)
    expect(days.length % 7).toBe(0)
    // Must include April 1 and April 30
    const april1 = days.some(
      (d) => d.getFullYear() === 2026 && d.getMonth() === 3 && d.getDate() === 1,
    )
    const april30 = days.some(
      (d) => d.getFullYear() === 2026 && d.getMonth() === 3 && d.getDate() === 30,
    )
    expect(april1).toBe(true)
    expect(april30).toBe(true)
  })
})

describe('getWeekDays', () => {
  it('returns exactly 7 days', () => {
    const days = getWeekDays(new Date('2026-04-15T00:00:00Z'))
    expect(days).toHaveLength(7)
  })

  it('starts on Sunday', () => {
    const days = getWeekDays(new Date('2026-04-15T00:00:00Z'))
    expect(days[0].getDay()).toBe(0)
  })
})

describe('EVENT_TYPE_ORDER', () => {
  it('defines a stable sort order so events render consistently', () => {
    expect(EVENT_TYPE_ORDER.length).toBeGreaterThan(0)
    // No duplicates
    expect(new Set(EVENT_TYPE_ORDER).size).toBe(EVENT_TYPE_ORDER.length)
  })
})
