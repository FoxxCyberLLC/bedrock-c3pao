/**
 * Pure utilities for building the /calendar page event list from the
 * portfolio list response. Isolated from React so it's unit-testable in
 * the node vitest environment and shared between week / month views.
 *
 * Event types:
 *   SCHEDULED_START — proxy for in-brief (Task 8 adds a real inBriefDate)
 *   SCHEDULED_END   — proxy for out-brief (Task 8 adds outBriefDate)
 *   POAM_CLOSEOUT   — 180 days after Conditional completion
 *   CERT_EXPIRY     — 3 years after Final completion
 */

import {
  addDays,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import type { PortfolioListItem } from '@/lib/api-client'

export type CalendarEventType =
  | 'SCHEDULED_START'
  | 'SCHEDULED_END'
  | 'POAM_CLOSEOUT'
  | 'CERT_EXPIRY'

/** Display order when multiple events share the same day. */
export const EVENT_TYPE_ORDER: readonly CalendarEventType[] = [
  'SCHEDULED_START',
  'SCHEDULED_END',
  'POAM_CLOSEOUT',
  'CERT_EXPIRY',
]

/** One event displayed on the calendar grid. */
export interface CalendarEvent {
  type: CalendarEventType
  date: Date
  engagementId: string
  packageName: string
  organizationName: string
  label: string
  leadAssessorId: string | null
}

/** Convert a raw `PortfolioListItem` into all calendar events it produces. */
export function buildCalendarEvents(
  items: readonly PortfolioListItem[],
): CalendarEvent[] {
  const events: CalendarEvent[] = []

  for (const item of items) {
    if (item.scheduledStartDate) {
      const d = safeParseDate(item.scheduledStartDate)
      if (d) {
        events.push({
          type: 'SCHEDULED_START',
          date: d,
          engagementId: item.id,
          packageName: item.packageName,
          organizationName: item.organizationName,
          label: `In-brief · ${item.organizationName}`,
          leadAssessorId: item.leadAssessorId,
        })
      }
    }

    if (item.scheduledEndDate) {
      const d = safeParseDate(item.scheduledEndDate)
      if (d) {
        events.push({
          type: 'SCHEDULED_END',
          date: d,
          engagementId: item.id,
          packageName: item.packageName,
          organizationName: item.organizationName,
          label: `Out-brief · ${item.organizationName}`,
          leadAssessorId: item.leadAssessorId,
        })
      }
    }

    // POA&M closeout — 180 days after Conditional completion.
    // We use `updatedAt` as a stand-in for `actualCompletionDate` until
    // Task 8 lands a dedicated certIssuedAt / poamCloseoutDue column.
    if (
      item.status === 'COMPLETED' &&
      item.assessmentResult === 'CONDITIONAL_LEVEL_2'
    ) {
      const completion = safeParseDate(item.updatedAt)
      if (completion) {
        events.push({
          type: 'POAM_CLOSEOUT',
          date: addDays(completion, 180),
          engagementId: item.id,
          packageName: item.packageName,
          organizationName: item.organizationName,
          label: `POA&M closeout due · ${item.organizationName}`,
          leadAssessorId: item.leadAssessorId,
        })
      }
    }

    // Certificate expiry — 3 years after Final completion.
    if (
      item.status === 'COMPLETED' &&
      item.assessmentResult === 'FINAL_LEVEL_2'
    ) {
      const completion = safeParseDate(item.updatedAt)
      if (completion) {
        events.push({
          type: 'CERT_EXPIRY',
          date: addYears(completion, 3),
          engagementId: item.id,
          packageName: item.packageName,
          organizationName: item.organizationName,
          label: `Certificate expires · ${item.organizationName}`,
          leadAssessorId: item.leadAssessorId,
        })
      }
    }
  }

  return events
}

/** Parse an ISO date string; return null on malformed input. */
function safeParseDate(raw: string | null | undefined): Date | null {
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return d
}

/**
 * Format a Date as a `yyyy-MM-dd` key using UTC components so the grouping
 * is independent of the machine's local timezone. Used by `groupEventsByDay`
 * and by the calendar grid's day-cell lookup.
 */
export function toDateKey(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Group events into a map keyed by `yyyy-MM-dd` (UTC). */
export function groupEventsByDay(
  events: readonly CalendarEvent[],
): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>()
  for (const event of events) {
    const key = toDateKey(event.date)
    const existing = map.get(key) ?? []
    existing.push(event)
    map.set(key, existing)
  }

  // Stable sort each day's events by type order
  const typeIndex = new Map(EVENT_TYPE_ORDER.map((t, i) => [t, i]))
  for (const [, events] of map) {
    events.sort(
      (a, b) => (typeIndex.get(a.type) ?? 99) - (typeIndex.get(b.type) ?? 99),
    )
  }

  return map
}

/**
 * Return every day that should appear in the month-view grid for the
 * given anchor date. Always returns a multiple of 7 (full weeks) with
 * leading/trailing days from adjacent months so the grid is rectangular.
 */
export function getMonthDays(anchor: Date): Date[] {
  const firstOfMonth = startOfMonth(anchor)
  const lastOfMonth = endOfMonth(anchor)
  const gridStart = startOfWeek(firstOfMonth, { weekStartsOn: 0 })
  const gridEnd = endOfWeek(lastOfMonth, { weekStartsOn: 0 })
  return eachDayOfInterval({ start: gridStart, end: gridEnd })
}

/** Return the 7 days of the week containing the anchor. */
export function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn: 0 })
  return eachDayOfInterval({ start, end: addDays(start, 6) })
}
