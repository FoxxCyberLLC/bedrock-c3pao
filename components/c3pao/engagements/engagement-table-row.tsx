'use client'

import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { Calendar, Moon, MoreVertical, Star, User } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import type { EngagementTag } from '@/lib/personal-views-types'
import { EngagementTagChip } from './engagement-tag-chip'
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

const VISIBLE_TAG_LIMIT = 4

interface EngagementTableRowProps {
  item: PortfolioRow
  selected: boolean
  onToggleSelect: (id: string, selected: boolean) => void
  pinned: boolean
  tags: EngagementTag[]
  /** True when the row is snoozed but still visible (Hide snoozed off). */
  snoozed?: boolean
  onTogglePin: (id: string) => void
  onOpenAddTag: (id: string) => void
  onOpenSnooze: (id: string, label: string) => void
  onRemoveTag: (id: string, label: string) => void
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
  pinned,
  tags,
  snoozed = false,
  onTogglePin,
  onOpenAddTag,
  onOpenSnooze,
  onRemoveTag,
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

  const visibleTags = tags.slice(0, VISIBLE_TAG_LIMIT)
  const overflowCount = tags.length - visibleTags.length

  return (
    <TableRow
      data-state={selected ? 'selected' : undefined}
      className={cn(
        'border-l-4',
        RISK_BORDER[risk],
        snoozed && 'bg-muted/40 hover:bg-muted/40',
      )}
    >
      <TableCell className="w-10">
        <div className="flex items-center gap-1">
          <Checkbox
            checked={selected}
            onCheckedChange={(next) => onToggleSelect(item.id, next === true)}
            aria-label={`Select ${item.organizationName}`}
          />
          <button
            type="button"
            onClick={() => onTogglePin(item.id)}
            aria-pressed={pinned}
            aria-label={
              pinned
                ? `Unpin ${item.organizationName}`
                : `Pin ${item.organizationName}`
            }
            className={cn(
              'inline-flex h-5 w-5 items-center justify-center rounded transition-colors',
              pinned
                ? 'text-amber-500 hover:text-amber-600'
                : 'text-muted-foreground/50 hover:text-foreground',
            )}
          >
            <Star
              className={cn('h-3.5 w-3.5', pinned && 'fill-current')}
              aria-hidden="true"
            />
          </button>
        </div>
      </TableCell>

      <TableCell className="min-w-[220px] max-w-[320px]">
        <Link
          href={`/engagements/${item.id}`}
          className="block hover:underline"
        >
          <p className="flex items-center gap-1.5 truncate text-sm font-medium">
            {snoozed && (
              <Moon
                className="h-3 w-3 shrink-0 text-muted-foreground"
                aria-label="Snoozed"
              />
            )}
            <span className="truncate">{item.organizationName}</span>
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {item.packageName}
          </p>
        </Link>
        {tags.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {visibleTags.map((tag) => (
              <EngagementTagChip
                key={tag.label}
                tag={tag}
                onRemove={() => onRemoveTag(item.id, tag.label)}
              />
            ))}
            {overflowCount > 0 && (
              <Badge
                variant="outline"
                className="rounded-full px-1.5 py-0 text-[10px]"
              >
                +{overflowCount} more
              </Badge>
            )}
          </div>
        )}
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

      <TableCell className="w-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={`Actions for ${item.organizationName}`}
            >
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onSelect={() => onOpenAddTag(item.id)}>
              Add tag
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onOpenSnooze(item.id, item.organizationName)}
            >
              Snooze...
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
