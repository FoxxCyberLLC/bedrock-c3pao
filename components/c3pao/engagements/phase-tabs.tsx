'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getPhaseColor, type Phase } from '@/lib/design/phase-colors'
import type { PhaseFilter } from '@/lib/personal-views-types'

interface PhaseTabsProps {
  value: PhaseFilter
  onChange: (next: PhaseFilter) => void
  /** Optional counts per phase for the small badge inside each tab. */
  counts?: Partial<Record<PhaseFilter, number>>
}

interface TabDef {
  key: PhaseFilter
  label: string
  /** Phase used for the color dot — undefined for the All tab. */
  phase?: Phase
}

const TABS: ReadonlyArray<TabDef> = [
  { key: 'all', label: 'All' },
  { key: 'PRE_ASSESS', label: 'Pre-Assess', phase: 'PRE_ASSESS' },
  { key: 'ASSESS', label: 'Assess', phase: 'ASSESS' },
  { key: 'REPORT', label: 'Report', phase: 'REPORT' },
  { key: 'CLOSE_OUT', label: 'Close-Out', phase: 'CLOSE_OUT' },
]

const PHASE_DOT: Record<Phase, string> = {
  PRE_ASSESS: 'bg-sky-500',
  ASSESS: 'bg-violet-500',
  REPORT: 'bg-amber-500',
  CLOSE_OUT: 'bg-emerald-500',
}

/**
 * Horizontal phase filter row. Five Buttons (All + 4 lifecycle phases). The
 * selected one uses `default` variant, the rest `outline`. Non-All tabs show
 * a subtle phase-tinted dot before the label and an optional count badge after.
 */
export function PhaseTabs({ value, onChange, counts }: PhaseTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Phase filter">
      {TABS.map((tab) => {
        const isActive = value === tab.key
        const count = counts?.[tab.key]
        const showCount = typeof count === 'number'
        const phaseEntry = tab.phase ? getPhaseColor(tab.phase) : null

        return (
          <Button
            key={tab.key}
            type="button"
            size="sm"
            role="tab"
            aria-selected={isActive}
            variant={isActive ? 'default' : 'outline'}
            onClick={() => onChange(tab.key)}
            className="h-7 gap-1.5 px-2.5 text-xs"
          >
            {tab.phase && (
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  PHASE_DOT[tab.phase],
                  // Subtle phase tint hint via the shared phase chip palette is
                  // used elsewhere — for the dot we use the solid 500 variant.
                  phaseEntry ? '' : '',
                )}
                aria-hidden="true"
              />
            )}
            <span>{tab.label}</span>
            {showCount && (
              <span
                className={cn(
                  'ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium tabular-nums',
                  isActive
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
                aria-label={`${count} ${tab.label}`}
              >
                {count}
              </span>
            )}
          </Button>
        )
      })}
    </div>
  )
}
