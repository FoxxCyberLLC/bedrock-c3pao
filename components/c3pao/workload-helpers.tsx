'use client'

/**
 * Small presentational primitives split out of `workload-dashboard.tsx` to
 * keep the dashboard file under the project's 300-line guideline.
 *
 * No data fetching here — these are pure render helpers consumed by both the
 * workload dashboard and (potentially) any future workload-style surface.
 */

import type { ComponentType, ReactElement } from 'react'
import { differenceInDays, format } from 'date-fns'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, safeDate } from '@/lib/utils'
import type { CapacityBand } from '@/lib/workload/capacity'

export function KpiCard({
  icon: Icon,
  label,
  value,
  accentClass,
}: {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  label: string
  value: number
  accentClass?: string
}): ReactElement {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon
          className={cn('h-3.5 w-3.5 text-muted-foreground', accentClass)}
          aria-hidden
        />
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-semibold tabular-nums', accentClass)}>
          {value}
        </div>
      </CardContent>
    </Card>
  )
}

export function CredExpiryBadge({
  label,
  expiresAt,
  now,
}: {
  label: string
  expiresAt: string
  now: Date
}): ReactElement | null {
  const d = safeDate(expiresAt)
  if (!d) return null
  const days = differenceInDays(d, now)
  const expired = days < 0
  const urgent = days >= 0 && days <= 30
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]',
        expired
          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
          : urgent
            ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
      )}
    >
      <span className="font-semibold">{label}</span>
      <span>
        {expired ? `expired ${-days}d ago` : days === 0 ? 'today' : `${days}d`}
      </span>
      <span className="text-muted-foreground/70">
        · {format(d, 'MMM yyyy')}
      </span>
    </span>
  )
}

const CAPACITY_BAND_CLASSES: Record<CapacityBand, string> = {
  light:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
  healthy:
    'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300',
  stretched:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
  overloaded:
    'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300',
}

export function CapacityBandBadge({
  band,
  label,
  title,
}: {
  band: CapacityBand
  label: string
  title: string
}): ReactElement {
  return (
    <Badge
      variant="outline"
      title={title}
      className={cn('text-[10px]', CAPACITY_BAND_CLASSES[band])}
    >
      {label}
    </Badge>
  )
}
