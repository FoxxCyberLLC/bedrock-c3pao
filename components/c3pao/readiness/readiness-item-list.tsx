'use client'

/**
 * Left column of the readiness workspace: a vertical list of the 8
 * pre-assessment items with a progress bar at the top. Selecting a row
 * notifies the parent via `onSelect`.
 */

import { format } from 'date-fns'
import {
  Circle,
  CircleCheck,
  CircleDashed,
  CircleDotDashed,
} from 'lucide-react'

import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { safeDate } from '@/lib/utils'
import { READINESS_ITEM_DEFINITIONS } from '@/lib/readiness-items'
import type {
  ReadinessItem,
  ReadinessItemKey,
  ReadinessItemStatus,
} from '@/lib/readiness-types'

export interface ReadinessItemListProps {
  items: ReadinessItem[]
  selectedKey: ReadinessItemKey
  onSelect: (key: ReadinessItemKey) => void
  progress: { completed: number; total: number }
}

interface IconProps {
  className?: string
  'aria-hidden'?: boolean
}

function StatusIcon({
  status,
  ...iconProps
}: { status: ReadinessItemStatus } & IconProps): React.ReactElement {
  switch (status) {
    case 'complete':
      return (
        <CircleCheck
          {...iconProps}
          className={cn('text-emerald-600', iconProps.className)}
        />
      )
    case 'waived':
      return (
        <CircleDotDashed
          {...iconProps}
          className={cn('text-amber-600', iconProps.className)}
        />
      )
    case 'in_progress':
      return (
        <CircleDashed
          {...iconProps}
          className={cn('text-sky-600', iconProps.className)}
        />
      )
    case 'not_started':
    default:
      return (
        <Circle
          {...iconProps}
          className={cn('text-muted-foreground/40', iconProps.className)}
        />
      )
  }
}

function statusSummary(item: ReadinessItem): string {
  if (item.status === 'complete') {
    const when = safeDate(item.completedAt)
    const whenText = when ? format(when, 'MMM d') : ''
    const by = item.completedBy ?? ''
    if (by && whenText) return `Complete — ${by}, ${whenText}`
    if (by) return `Complete — ${by}`
    return 'Complete'
  }
  if (item.status === 'waived') {
    const by = item.waivedBy ?? ''
    return by ? `Waived by ${by}` : 'Waived'
  }
  if (item.status === 'in_progress') {
    const count = item.artifacts.length
    const noun = count === 1 ? 'artifact' : 'artifacts'
    return count > 0
      ? `${count} ${noun}, not yet marked`
      : 'In progress'
  }
  return 'Not started'
}

export function ReadinessItemList({
  items,
  selectedKey,
  onSelect,
  progress,
}: ReadinessItemListProps): React.ReactElement {
  const pct =
    progress.total === 0
      ? 0
      : Math.round((progress.completed / progress.total) * 100)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">
          Progress
        </span>
        <span className="text-sm font-semibold tabular-nums">
          {progress.completed}/{progress.total}
        </span>
      </div>
      <Progress value={pct} aria-label="Readiness progress" />

      <ul className="mt-2 flex flex-col gap-1" aria-label="Readiness items">
        {items.map((item) => {
          const def = READINESS_ITEM_DEFINITIONS[item.itemKey]
          const isSelected = item.itemKey === selectedKey
          return (
            <li key={item.itemKey}>
              <button
                type="button"
                onClick={() => onSelect(item.itemKey)}
                aria-current={isSelected ? 'true' : undefined}
                data-testid={`readiness-item-${item.itemKey}`}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent hover:border-border hover:bg-muted/40',
                )}
              >
                <StatusIcon
                  status={item.status}
                  className="mt-0.5 h-5 w-5 shrink-0"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">
                    {def.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {statusSummary(item)}
                  </p>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
