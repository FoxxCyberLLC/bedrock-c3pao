'use client'

import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { Calendar, User } from 'lucide-react'

import { Checkbox } from '@/components/ui/checkbox'
import { TableCell, TableRow } from '@/components/ui/table'
import { cn, safeDate } from '@/lib/utils'
import { deriveRisk, resolvePhase } from '@/lib/portfolio/derive-risk'
import {
  getPackageQuickStat,
  TONE_TEXT_CLASS,
} from '@/lib/engagements-list/quick-stats'
import {
  getFreshnessTone,
  type FreshnessTone,
} from '@/lib/engagements-list/freshness'
import type { PortfolioRow } from '@/lib/engagements-list/types'
import { LifecycleStepperMini } from './lifecycle-stepper-mini'

const RISK_BORDER: Record<ReturnType<typeof deriveRisk>, string> = {
  ON_TRACK: 'border-l-transparent',
  AT_RISK: 'border-l-orange-400 dark:border-l-orange-500',
  OVERDUE: 'border-l-rose-500 dark:border-l-rose-500',
}

const RISK_LABEL: Record<ReturnType<typeof deriveRisk>, string | null> = {
  ON_TRACK: null,
  AT_RISK: 'Stalled',
  OVERDUE: 'Overdue',
}

const FRESHNESS_PIP_CLASS: Record<FreshnessTone, string> = {
  fresh: 'bg-emerald-500',
  aging: 'bg-amber-500',
  stale: 'bg-rose-500',
  unknown: 'bg-muted-foreground/40',
}

interface EngagementTableRowProps {
  item: PortfolioRow
  selected: boolean
  onToggleSelect: (id: string, selected: boolean) => void
  now?: Date
}

function formatScheduleRange(item: PortfolioRow): string {
  const start = safeDate(item.scheduledStartDate)
  const end = safeDate(item.scheduledEndDate)
  if (start && end) {
    const sameYear = start.getFullYear() === end.getFullYear()
    return `${format(start, sameYear ? 'MMM d' : 'MMM d, yyyy')} → ${format(end, 'MMM d, yyyy')}`
  }
  if (start) return `Starts ${format(start, 'MMM d, yyyy')}`
  if (end) return `Ends ${format(end, 'MMM d, yyyy')}`
  return ''
}

export function EngagementTableRow({
  item,
  selected,
  onToggleSelect,
  now = new Date(),
}: EngagementTableRowProps) {
  const phase = resolvePhase(item)
  const risk = deriveRisk(item, now)
  const stat = getPackageQuickStat(item, now)
  const scheduleLabel = formatScheduleRange(item)
  const riskLabel = RISK_LABEL[risk]

  const updatedDate = safeDate(item.updatedAt)
  const freshnessTone = getFreshnessTone(item.updatedAt, now)
  const activityLabel = updatedDate
    ? formatDistanceToNow(updatedDate, { addSuffix: true })
    : '—'

  return (
    <TableRow
      data-state={selected ? 'selected' : undefined}
      className={cn('border-l-4', RISK_BORDER[risk])}
    >
      <TableCell className="w-10">
        <Checkbox
          checked={selected}
          onCheckedChange={(next) => onToggleSelect(item.id, next === true)}
          aria-label={`Select ${item.organizationName}`}
        />
      </TableCell>

      <TableCell className="min-w-[220px] max-w-[320px]">
        <Link
          href={`/engagements/${item.id}`}
          className="block hover:underline"
        >
          <p className="truncate text-sm font-medium">{item.organizationName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {item.packageName}
          </p>
        </Link>
        {riskLabel && (
          <p
            className={cn(
              'mt-0.5 text-[10px] font-semibold uppercase tracking-wide',
              risk === 'OVERDUE'
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-orange-600 dark:text-orange-400',
            )}
          >
            {riskLabel}
          </p>
        )}
      </TableCell>

      <TableCell className="w-[140px]">
        <LifecycleStepperMini phase={phase} daysInPhase={item.daysInPhase} />
      </TableCell>

      <TableCell className="w-[170px]">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {item.leadAssessorName ? (
            <>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                {item.leadAssessorName.charAt(0).toUpperCase()}
              </span>
              <span className="truncate">{item.leadAssessorName}</span>
            </>
          ) : (
            <span className="flex items-center gap-1 italic">
              <User className="h-3 w-3" aria-hidden="true" />
              Unassigned
            </span>
          )}
        </div>
      </TableCell>

      <TableCell className="w-[170px]">
        <div className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
          {scheduleLabel ? (
            <>
              <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{scheduleLabel}</span>
            </>
          ) : (
            <span>—</span>
          )}
        </div>
      </TableCell>

      <TableCell className="w-[140px]">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            aria-hidden="true"
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              FRESHNESS_PIP_CLASS[freshnessTone],
            )}
          />
          <span className="truncate">{activityLabel}</span>
        </div>
      </TableCell>

      <TableCell className="w-[180px]">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {stat.label}
        </p>
        <p className={cn('text-sm font-medium', TONE_TEXT_CLASS[stat.tone])}>
          {stat.value}
        </p>
        {stat.detail && (
          <p className="text-[10px] text-muted-foreground">{stat.detail}</p>
        )}
      </TableCell>
    </TableRow>
  )
}
