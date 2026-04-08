'use client'

import Link from 'next/link'
import { format, isWithinInterval, startOfDay, addDays } from 'date-fns'
import { CalendarCheck, CircleDot } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { safeDate } from '@/lib/utils'
import type { PortfolioListItem } from '@/lib/api-client'

interface PortfolioThisWeekProps {
  items: readonly PortfolioListItem[]
}

interface WeekEvent {
  date: Date
  engagementId: string
  title: string
  subtitle: string
  kind: 'START' | 'END'
}

/**
 * "This Week" milestone list on the lead-assessor dashboard.
 *
 * For M2 we only surface `scheduledStartDate` (in-brief proxy) and
 * `scheduledEndDate` (out-brief proxy) within the next 7 days. Task 8
 * adds real in-brief/out-brief/pre-assessment-due/report-due/POA&M
 * closeout/cert-expiry events.
 */
export function PortfolioThisWeek({ items }: PortfolioThisWeekProps) {
  const now = new Date()
  const weekEnd = addDays(startOfDay(now), 7)

  const events: WeekEvent[] = []
  for (const item of items) {
    if (item.scheduledStartDate) {
      const start = safeDate(item.scheduledStartDate)
      if (start && isWithinInterval(start, { start: now, end: weekEnd })) {
        events.push({
          date: start,
          engagementId: item.id,
          title: item.packageName,
          subtitle: `In-brief · ${item.organizationName}`,
          kind: 'START',
        })
      }
    }
    if (item.scheduledEndDate) {
      const end = safeDate(item.scheduledEndDate)
      if (end && isWithinInterval(end, { start: now, end: weekEnd })) {
        events.push({
          date: end,
          engagementId: item.id,
          title: item.packageName,
          subtitle: `Out-brief · ${item.organizationName}`,
          kind: 'END',
        })
      }
    }
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime())

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          This Week
        </CardTitle>
        <CardDescription>Milestones in the next 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No milestones scheduled this week.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {events.map((event, idx) => (
              <li key={`${event.engagementId}-${event.kind}-${idx}`}>
                <Link
                  href={`/engagements/${event.engagementId}`}
                  className="group flex items-start gap-3 rounded-md border p-2.5 transition-colors hover:bg-accent"
                >
                  <CircleDot
                    className={
                      event.kind === 'START'
                        ? 'mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-400'
                        : 'mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400'
                    }
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium group-hover:text-primary">
                      {event.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {event.subtitle}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {format(event.date, 'EEE MMM d')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
