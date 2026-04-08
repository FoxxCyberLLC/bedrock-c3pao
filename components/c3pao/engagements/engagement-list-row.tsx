'use client'

import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { Calendar, User } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { safeDate } from '@/lib/utils'
import {
  computeProgressPercent,
  deriveRisk,
  resolvePhase,
  type Risk,
} from '@/lib/portfolio/derive-risk'
import { getPhaseColor } from '@/lib/design/phase-colors'
import type { PortfolioListItem } from '@/lib/api-client'

const RISK_BADGE: Record<Risk, { label: string; className: string } | null> = {
  ON_TRACK: null,
  AT_RISK: {
    label: 'Stalled',
    className:
      'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900',
  },
  OVERDUE: {
    label: 'Overdue',
    className:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
  },
}

interface EngagementListRowProps {
  item: PortfolioListItem
  selected: boolean
  onToggleSelect: (id: string, selected: boolean) => void
}

export function EngagementListRow({
  item,
  selected,
  onToggleSelect,
}: EngagementListRowProps) {
  const phase = resolvePhase(item)
  const phaseColor = getPhaseColor(phase)
  const risk = deriveRisk(item)
  const progressPct = computeProgressPercent(item)
  const updated = safeDate(item.updatedAt)
  const endDate = safeDate(item.scheduledEndDate)
  const riskBadge = RISK_BADGE[risk]

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors',
        selected && 'border-primary/40 bg-primary/5',
      )}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={(next) => onToggleSelect(item.id, next === true)}
        aria-label={`Select ${item.organizationName}`}
      />

      <Link
        href={`/engagements/${item.id}`}
        className="flex flex-1 items-center gap-4 min-w-0"
      >
        {/* Phase pill */}
        <Badge
          variant="outline"
          className={cn('shrink-0 w-[120px] justify-center', phaseColor.chip)}
        >
          {phaseColor.label}
        </Badge>

        {/* Org + package */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.organizationName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {item.packageName}
          </p>
        </div>

        {/* Lead */}
        <div className="hidden w-[160px] shrink-0 items-center gap-1.5 truncate text-xs text-muted-foreground md:flex">
          {item.leadAssessorName ? (
            <>
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                {item.leadAssessorName.charAt(0).toUpperCase()}
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

        {/* Progress */}
        <div className="hidden w-[140px] shrink-0 lg:block">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
            {item.objectivesAssessed}/{item.objectivesTotal} · {progressPct}%
          </p>
        </div>

        {/* Days in phase */}
        <div className="hidden w-[90px] shrink-0 text-right text-xs text-muted-foreground tabular-nums md:block">
          {item.daysInPhase}d in phase
        </div>

        {/* Due date */}
        <div className="hidden w-[120px] shrink-0 text-right text-xs text-muted-foreground tabular-nums lg:block">
          {endDate ? (
            <>
              <Calendar className="inline h-3 w-3 mr-1" aria-hidden="true" />
              {format(endDate, 'MMM d')}
            </>
          ) : updated ? (
            formatDistanceToNow(updated, { addSuffix: true })
          ) : (
            '—'
          )}
        </div>

        {/* Risk badge */}
        {riskBadge && (
          <Badge
            variant="outline"
            className={cn('shrink-0 text-[10px]', riskBadge.className)}
          >
            {riskBadge.label}
          </Badge>
        )}
      </Link>
    </div>
  )
}
