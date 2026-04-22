'use client'

/**
 * CAP v2.0 lifecycle stepper (Task 14).
 *
 * Four horizontal steps — Pre-Assessment, Assess, Report, Close-Out.
 * The current step is highlighted with the primary color, completed
 * steps are muted, and future steps are outlined.
 *
 * Pulls phase metadata from the Task 8 /phase endpoint so the stepper
 * reflects the real currentPhase column (not the status-derived proxy).
 * Shows days-in-phase, a re-eval window badge when applicable, and an
 * appeals-open badge when applicable.
 */

import { useEffect, useState } from 'react'
import { differenceInDays, format } from 'date-fns'
import { Check, ClockAlert, Gavel, Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { safeDate } from '@/lib/utils'
import { getEngagementPhase } from '@/app/actions/c3pao-phase'
import type { EngagementPhase, EngagementPhaseName } from '@/lib/api-client'

interface EngagementLifecycleStepperProps {
  engagementId: string
  /**
   * Server-fetched phase snapshot. When provided, the stepper renders
   * immediately with this data (skipping the initial client fetch) and
   * re-renders whenever the prop changes — making `router.refresh()`
   * sufficient to reflect phase transitions (fixes a stale-prop bug
   * where the stepper showed PRE_ASSESS after Start Assessment).
   */
  initialPhase?: EngagementPhase | null
}

interface StepDef {
  phase: EngagementPhaseName
  label: string
  description: string
}

const STEPS: readonly StepDef[] = [
  { phase: 'PRE_ASSESS', label: 'Pre-Assessment', description: 'Phase 1' },
  { phase: 'ASSESS', label: 'Assess', description: 'Phase 2' },
  { phase: 'REPORT', label: 'Report', description: 'Phase 3' },
  { phase: 'CLOSE_OUT', label: 'Close-Out', description: 'Phase 4' },
]

const phaseOrder: Record<EngagementPhaseName, number> = {
  PRE_ASSESS: 0,
  ASSESS: 1,
  REPORT: 2,
  CLOSE_OUT: 3,
}

export function EngagementLifecycleStepper({
  engagementId,
  initialPhase = null,
}: EngagementLifecycleStepperProps) {
  // Client-fetched phase for the no-prop case. When `initialPhase` is
  // provided, the prop itself is the source of truth — no client sync
  // effect is needed, and `router.refresh()` re-renders with fresh data.
  const [clientPhase, setClientPhase] = useState<EngagementPhase | null>(null)
  const [loading, setLoading] = useState(initialPhase === null)
  const phase = initialPhase ?? clientPhase

  useEffect(() => {
    // Only fetch on the client if the server didn't provide a snapshot.
    if (initialPhase) return
    let cancelled = false
    async function load() {
      const result = await getEngagementPhase(engagementId)
      if (cancelled) return
      if (result.success && result.data) {
        setClientPhase(result.data)
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [engagementId, initialPhase])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  // If the phase endpoint returned nothing (cancelled engagement or pre-
  // backfill row), show a minimal outline rather than hiding the widget.
  const currentPhase = phase?.currentPhase ?? null
  const currentIdx = currentPhase ? phaseOrder[currentPhase] : -1
  const now = new Date()
  const enteredDate = safeDate(phase?.phaseEnteredAt ?? null)
  const daysInPhase =
    enteredDate !== null ? differenceInDays(now, enteredDate) : null

  const reevalDate = safeDate(phase?.reevalWindowOpenUntil ?? null)
  const reevalDaysLeft =
    reevalDate && reevalDate > now ? differenceInDays(reevalDate, now) : null

  const appealsDate = safeDate(phase?.appealsWindowOpenUntil ?? null)
  const appealsDaysLeft =
    appealsDate && appealsDate > now
      ? differenceInDays(appealsDate, now)
      : null

  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex items-center gap-2">
          {STEPS.map((step, idx) => {
            const isCurrent = currentIdx === idx
            const isDone = currentIdx >= 0 && idx < currentIdx
            const isFuture = currentIdx < 0 || idx > currentIdx
            return (
              <div key={step.phase} className="flex min-w-0 flex-1 items-center">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold tabular-nums transition-colors',
                      isCurrent &&
                        'border-primary bg-primary text-primary-foreground',
                      isDone && 'border-emerald-500 bg-emerald-500 text-white',
                      isFuture && 'border-muted bg-background text-muted-foreground',
                    )}
                  >
                    {isDone ? (
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'text-sm truncate',
                        isCurrent && 'font-semibold text-foreground',
                        isDone && 'font-medium text-foreground',
                        isFuture && 'font-normal text-muted-foreground',
                      )}
                    >
                      {step.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {step.description}
                      {isCurrent && daysInPhase !== null && (
                        <> · Day {daysInPhase + 1}</>
                      )}
                    </p>
                  </div>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'mx-2 h-0.5 flex-1 rounded-full transition-colors',
                      isDone || (isCurrent && currentIdx > idx)
                        ? 'bg-emerald-500'
                        : 'bg-muted',
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Re-eval + appeals badges */}
        {(reevalDaysLeft !== null || appealsDaysLeft !== null) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {reevalDaysLeft !== null && (
              <Badge
                variant="outline"
                className="gap-1 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900"
              >
                <ClockAlert className="h-3 w-3" aria-hidden />
                Re-Eval Window · {reevalDaysLeft}d remaining
                {reevalDate && <> (until {format(reevalDate, 'MMM d')})</>}
              </Badge>
            )}
            {appealsDaysLeft !== null && (
              <Badge
                variant="outline"
                className="gap-1 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
              >
                <Gavel className="h-3 w-3" aria-hidden />
                Appeals Open · {appealsDaysLeft}d remaining
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
