import { cn } from '@/lib/utils'
import type { Phase } from '@/lib/portfolio/derive-risk'

interface LifecycleStepperMiniProps {
  phase: Phase | null
  /** Optional current-phase dwell shown below the stepper. */
  daysInPhase?: number | null
}

const PHASES: ReadonlyArray<{ key: Phase; label: string; short: string }> = [
  { key: 'PRE_ASSESS', label: 'Pre-Assess', short: 'Pre' },
  { key: 'ASSESS', label: 'Assess', short: 'Asm' },
  { key: 'REPORT', label: 'Report', short: 'Rpt' },
  { key: 'CLOSE_OUT', label: 'Close-Out', short: 'CO' },
]

const PHASE_TINT: Record<Phase, string> = {
  PRE_ASSESS: 'bg-sky-500',
  ASSESS: 'bg-violet-500',
  REPORT: 'bg-amber-500',
  CLOSE_OUT: 'bg-emerald-500',
}

/**
 * Compact 4-segment lifecycle indicator. Past phases are filled in their
 * phase tint, the current phase is filled + ring-highlighted, and future
 * phases are muted. Conveys "where are we and how far to go" in ~80px.
 */
export function LifecycleStepperMini({
  phase,
  daysInPhase,
}: LifecycleStepperMiniProps) {
  const currentIndex = phase
    ? PHASES.findIndex((p) => p.key === phase)
    : -1
  const currentLabel =
    currentIndex >= 0 ? PHASES[currentIndex].label : 'Unphased'

  return (
    <div className="flex flex-col gap-1">
      <div
        className="flex items-center gap-1"
        role="img"
        aria-label={`Lifecycle phase: ${currentLabel}`}
      >
        {PHASES.map((p, i) => {
          const isPast = currentIndex > i
          const isCurrent = currentIndex === i
          return (
            <span
              key={p.key}
              title={p.label}
              className={cn(
                'h-1.5 w-5 rounded-full transition-colors',
                isCurrent && PHASE_TINT[p.key],
                isCurrent && 'ring-2 ring-offset-1 ring-offset-background',
                isCurrent && {
                  'ring-sky-300 dark:ring-sky-700': p.key === 'PRE_ASSESS',
                  'ring-violet-300 dark:ring-violet-700': p.key === 'ASSESS',
                  'ring-amber-300 dark:ring-amber-700': p.key === 'REPORT',
                  'ring-emerald-300 dark:ring-emerald-700':
                    p.key === 'CLOSE_OUT',
                },
                isPast && 'bg-muted-foreground/40',
                !isPast && !isCurrent && 'bg-muted',
              )}
            />
          )
        })}
      </div>
      <p className="text-xs font-medium text-foreground">
        {currentLabel}
        {typeof daysInPhase === 'number' && daysInPhase >= 0 && (
          <span className="ml-1 font-normal text-muted-foreground tabular-nums">
            · {daysInPhase}d
          </span>
        )}
      </p>
    </div>
  )
}
