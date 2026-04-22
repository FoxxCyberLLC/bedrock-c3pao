'use client'

/**
 * Header badge showing the C3PAO's license usage at a glance.
 *
 * Shows concurrent-assessment headroom as `X/Y` in the main badge. Click
 * opens a popover with the full breakdown (seats, assessments/year, standalone
 * instances). Warning styling kicks in at ≥80% utilization; destructive at 100%.
 */

import { useEffect, useState } from 'react'
import { AlertTriangle, KeyRound, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { getC3PAOLicense } from '@/app/actions/c3pao-dashboard'
import type { C3PAOLicense } from '@/lib/api-client'
import { cn } from '@/lib/utils'

function pct(current: number, max: number): number {
  if (max <= 0) return 0
  return Math.round((current / max) * 100)
}

function severity(percent: number): 'ok' | 'warn' | 'full' {
  if (percent >= 100) return 'full'
  if (percent >= 80) return 'warn'
  return 'ok'
}

export function LicenseBadge() {
  const [license, setLicense] = useState<C3PAOLicense | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const result = await getC3PAOLicense()
      if (cancelled) return
      if (result.success && result.data) {
        setLicense(result.data)
        setError(null)
      } else {
        setError(result.error ?? 'Unavailable')
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled className="gap-1.5 px-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </Button>
    )
  }

  if (error || !license) {
    return null
  }

  const concurrentPct = pct(license.currentAssessments, license.maxConcurrentAssessments)
  const level = severity(concurrentPct)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'gap-1.5 px-2 text-xs',
            level === 'warn' && 'text-amber-700 dark:text-amber-400',
            level === 'full' && 'text-destructive',
          )}
          aria-label={`License: ${license.currentAssessments} of ${license.maxConcurrentAssessments} concurrent assessments`}
        >
          {level === 'ok' ? (
            <KeyRound className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline tabular-nums">
            {license.currentAssessments}/{license.maxConcurrentAssessments}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold">License Usage</p>
            <p className="text-xs text-muted-foreground">
              {license.type} · {license.status}
            </p>
          </div>

          <UsageRow
            label="Concurrent assessments"
            current={license.currentAssessments}
            max={license.maxConcurrentAssessments}
          />
          <UsageRow
            label="Seats"
            current={license.currentUsers}
            max={license.maxSeats}
          />
          <UsageRow
            label="Assessments this year"
            current={0}
            max={license.maxAssessmentsPerYear}
            hideBar
          />
          <UsageRow
            label="Standalone instances"
            current={license.currentInstances}
            max={license.maxStandaloneInstances}
          />

          {license.expiresAt && (
            <p className="text-xs text-muted-foreground pt-2 border-t">
              Expires {new Date(license.expiresAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function UsageRow({
  label,
  current,
  max,
  hideBar,
}: {
  label: string
  current: number
  max: number
  hideBar?: boolean
}) {
  const percent = pct(current, max)
  const level = severity(percent)
  const barColor =
    level === 'full'
      ? 'bg-destructive'
      : level === 'warn'
        ? 'bg-amber-500'
        : 'bg-primary'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium">
          {current} / {max}
        </span>
      </div>
      {!hideBar && (
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full transition-all', barColor)}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}
