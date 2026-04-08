'use client'

import { isSameDay, isSameMonth } from 'date-fns'

import { cn } from '@/lib/utils'
import { toDateKey, type CalendarEvent } from '@/lib/calendar/build-events'
import { CalendarEventPill } from './calendar-event-pill'

interface CalendarGridProps {
  days: Date[]
  anchor: Date
  eventsByDay: Map<string, CalendarEvent[]>
  view: 'week' | 'month'
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Month or week calendar grid. Each cell shows the day number + a
 * stacked list of event pills. In month view, cells for days outside
 * the anchor month are muted. The "today" cell gets a primary border.
 */
export function CalendarGrid({ days, anchor, eventsByDay, view }: CalendarGridProps) {
  const today = new Date()

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-2">
            {label}
          </div>
        ))}
      </div>
      <div
        className={cn(
          'grid grid-cols-7',
          view === 'week' ? 'auto-rows-[minmax(200px,_1fr)]' : 'auto-rows-[minmax(120px,_1fr)]',
        )}
      >
        {days.map((day) => {
          const key = toDateKey(day)
          const events = eventsByDay.get(key) ?? []
          const isToday = isSameDay(day, today)
          const isInMonth = isSameMonth(day, anchor)
          return (
            <div
              key={key}
              className={cn(
                'relative flex flex-col gap-1 border-b border-r p-1.5 last:border-r-0',
                isToday && 'bg-primary/5',
                !isInMonth && view === 'month' && 'bg-muted/20 text-muted-foreground/50',
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'inline-flex h-5 min-w-5 items-center justify-center rounded-full text-xs tabular-nums',
                    isToday && 'bg-primary font-semibold text-primary-foreground',
                  )}
                >
                  {day.getDate()}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {events.slice(0, view === 'week' ? 20 : 4).map((event, idx) => (
                  <CalendarEventPill
                    key={`${event.engagementId}-${event.type}-${idx}`}
                    event={event}
                  />
                ))}
                {events.length > (view === 'week' ? 20 : 4) && (
                  <span className="text-[10px] text-muted-foreground">
                    +{events.length - (view === 'week' ? 20 : 4)} more
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
