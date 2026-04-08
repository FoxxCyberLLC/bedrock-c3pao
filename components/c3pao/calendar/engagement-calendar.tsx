'use client'

import { useMemo, useState } from 'react'
import { addMonths, addWeeks } from 'date-fns'

import {
  buildCalendarEvents,
  getMonthDays,
  getWeekDays,
  groupEventsByDay,
  type CalendarEvent,
} from '@/lib/calendar/build-events'
import type { PortfolioListItem } from '@/lib/api-client'
import { CalendarGrid } from './calendar-grid'
import { CalendarToolbar, type CalendarView } from './calendar-toolbar'

interface EngagementCalendarProps {
  items: PortfolioListItem[]
}

export function EngagementCalendar({ items }: EngagementCalendarProps) {
  const [anchor, setAnchor] = useState<Date>(() => new Date())
  const [view, setView] = useState<CalendarView>('month')
  const [leadFilter, setLeadFilter] = useState<string>('ALL')

  const filteredItems = useMemo(() => {
    if (leadFilter === 'ALL') return items
    if (leadFilter === 'UNASSIGNED') {
      return items.filter((i) => !i.leadAssessorId)
    }
    return items.filter((i) => i.leadAssessorId === leadFilter)
  }, [items, leadFilter])

  const allEvents = useMemo<CalendarEvent[]>(
    () => buildCalendarEvents(filteredItems),
    [filteredItems],
  )

  const eventsByDay = useMemo(() => groupEventsByDay(allEvents), [allEvents])

  const days = useMemo(
    () => (view === 'month' ? getMonthDays(anchor) : getWeekDays(anchor)),
    [anchor, view],
  )

  const leadOptions = useMemo(() => {
    const leads = new Map<string, string>()
    for (const item of items) {
      if (item.leadAssessorId && item.leadAssessorName) {
        leads.set(item.leadAssessorId, item.leadAssessorName)
      }
    }
    return Array.from(leads.entries()).sort((a, b) =>
      a[1].localeCompare(b[1]),
    ) as ReadonlyArray<readonly [string, string]>
  }, [items])

  const handlePrev = () => {
    setAnchor((prev) =>
      view === 'month' ? addMonths(prev, -1) : addWeeks(prev, -1),
    )
  }

  const handleNext = () => {
    setAnchor((prev) =>
      view === 'month' ? addMonths(prev, 1) : addWeeks(prev, 1),
    )
  }

  const handleToday = () => setAnchor(new Date())

  return (
    <div className="space-y-4">
      <CalendarToolbar
        anchor={anchor}
        view={view}
        onViewChange={setView}
        onToday={handleToday}
        onPrev={handlePrev}
        onNext={handleNext}
        leadFilter={leadFilter}
        onLeadFilterChange={setLeadFilter}
        leadOptions={leadOptions}
      />
      <CalendarGrid
        days={days}
        anchor={anchor}
        eventsByDay={eventsByDay}
        view={view}
      />
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <LegendItem color="bg-sky-100 dark:bg-sky-950/50" label="In-brief (scheduled start)" />
        <LegendItem color="bg-amber-100 dark:bg-amber-950/50" label="Out-brief (scheduled end)" />
        <LegendItem color="bg-rose-100 dark:bg-rose-950/50" label="POA&M closeout due" />
        <LegendItem color="bg-emerald-100 dark:bg-emerald-950/50" label="Cert expiry" />
      </div>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-sm border ${color}`} />
      <span>{label}</span>
    </div>
  )
}
