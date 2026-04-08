'use client'

import Link from 'next/link'

import { cn } from '@/lib/utils'
import type { CalendarEvent, CalendarEventType } from '@/lib/calendar/build-events'

const TYPE_CLASSES: Record<CalendarEventType, string> = {
  SCHEDULED_START:
    'bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-950/50 dark:text-sky-200 dark:border-sky-900',
  SCHEDULED_END:
    'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-900',
  POAM_CLOSEOUT:
    'bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-900',
  CERT_EXPIRY:
    'bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-900',
}

const TYPE_LABEL: Record<CalendarEventType, string> = {
  SCHEDULED_START: 'Start',
  SCHEDULED_END: 'End',
  POAM_CLOSEOUT: 'POA&M',
  CERT_EXPIRY: 'Cert',
}

/**
 * Compact pill displayed inside a calendar day cell. Clicking navigates
 * to the engagement detail page.
 */
export function CalendarEventPill({ event }: { event: CalendarEvent }) {
  return (
    <Link
      href={`/engagements/${event.engagementId}`}
      title={event.label}
      className={cn(
        'group block truncate rounded border px-1.5 py-0.5 text-[10px] font-medium leading-tight transition-opacity hover:opacity-80',
        TYPE_CLASSES[event.type],
      )}
    >
      <span className="mr-1 font-semibold uppercase tracking-wide">
        {TYPE_LABEL[event.type]}
      </span>
      <span>{event.organizationName}</span>
    </Link>
  )
}
