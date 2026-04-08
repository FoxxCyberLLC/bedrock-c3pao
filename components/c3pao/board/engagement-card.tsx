'use client'

import Link from 'next/link'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Building2, User } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  deriveRisk,
  computeProgressPercent,
  type Risk,
} from '@/lib/portfolio/derive-risk'
import type { PortfolioListItem } from '@/lib/api-client'

interface EngagementCardProps {
  item: PortfolioListItem
  isDraggable: boolean
  /** Surface `data-sortable-id` so @dnd-kit can track drops. */
  sortableId: string
}

const RISK_BADGE_CLASSES: Record<Risk, string> = {
  ON_TRACK: '',
  AT_RISK:
    'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900',
  OVERDUE:
    'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
}

const RISK_LABEL: Record<Risk, string> = {
  ON_TRACK: '',
  AT_RISK: 'Stalled',
  OVERDUE: 'Overdue',
}

/**
 * A single engagement card rendered inside a phase column. Draggable for
 * lead assessors; a plain link for non-leads.
 *
 * The card exposes: organization name (prominent), package name (muted),
 * progress bar, days-in-phase pill, risk badge, and the lead assessor's
 * initial. Clicking the card navigates to the engagement detail page.
 */
export function EngagementCard({
  item,
  isDraggable,
  sortableId,
}: EngagementCardProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId,
    disabled: !isDraggable,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const risk = deriveRisk(item)
  const progressPct = computeProgressPercent(item)
  const leadInitial = item.leadAssessorName
    ? item.leadAssessorName.charAt(0).toUpperCase()
    : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group rounded-lg border bg-card p-3 shadow-sm transition-colors',
        isDraggable ? 'cursor-grab active:cursor-grabbing hover:border-primary/40' : '',
      )}
    >
      <Link
        href={`/engagements/${item.id}`}
        className="block space-y-2"
        // Prevent the link from firing mid-drag; dnd-kit sets isDragging.
        onClickCapture={(e) => {
          if (isDragging) e.preventDefault()
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {item.organizationName}
            </p>
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Building2 className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.packageName}</span>
            </p>
          </div>
          {risk !== 'ON_TRACK' && (
            <Badge
              variant="outline"
              className={cn('shrink-0 text-[10px]', RISK_BADGE_CLASSES[risk])}
            >
              {RISK_LABEL[risk]}
            </Badge>
          )}
        </div>

        {/* Progress bar */}
        <div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progressPct}%` }}
              aria-label={`${progressPct}% of objectives assessed`}
            />
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
            {item.objectivesAssessed}/{item.objectivesTotal} objectives ·{' '}
            {progressPct}%
          </p>
        </div>

        {/* Footer: lead + days-in-phase */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1 truncate">
            {leadInitial ? (
              <>
                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-medium text-primary">
                  {leadInitial}
                </div>
                <span className="truncate">{item.leadAssessorName}</span>
              </>
            ) : (
              <span className="flex items-center gap-1 italic">
                <User className="h-3 w-3" aria-hidden="true" />
                Unassigned
              </span>
            )}
          </div>
          <span className="shrink-0 tabular-nums">
            {item.daysInPhase}d in phase
          </span>
        </div>
      </Link>
    </div>
  )
}
