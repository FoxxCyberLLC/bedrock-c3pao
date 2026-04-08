'use client'

import { format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type CalendarView = 'week' | 'month'

interface CalendarToolbarProps {
  anchor: Date
  view: CalendarView
  onViewChange: (view: CalendarView) => void
  onToday: () => void
  onPrev: () => void
  onNext: () => void
  leadFilter: string
  onLeadFilterChange: (value: string) => void
  leadOptions: ReadonlyArray<readonly [string, string]>
}

export function CalendarToolbar({
  anchor,
  view,
  onViewChange,
  onToday,
  onPrev,
  onNext,
  leadFilter,
  onLeadFilterChange,
  leadOptions,
}: CalendarToolbarProps) {
  const label =
    view === 'month' ? format(anchor, 'MMMM yyyy') : format(anchor, "MMM d, yyyy")

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" size="sm" onClick={onToday}>
        Today
      </Button>
      <div className="flex items-center">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onPrev}
          aria-label="Previous"
          className="rounded-r-none"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onNext}
          aria-label="Next"
          className="-ml-px rounded-l-none"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <h2 className="text-lg font-semibold tabular-nums">{label}</h2>
      <div className="ml-auto flex items-center gap-2">
        <Select value={leadFilter} onValueChange={onLeadFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All leads" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All leads</SelectItem>
            <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
            {leadOptions.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center rounded-md border">
          <Button
            type="button"
            variant={view === 'week' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('week')}
            className="rounded-r-none"
          >
            Week
          </Button>
          <Button
            type="button"
            variant={view === 'month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('month')}
            className="-ml-px rounded-l-none"
          >
            Month
          </Button>
        </div>
      </div>
    </div>
  )
}
