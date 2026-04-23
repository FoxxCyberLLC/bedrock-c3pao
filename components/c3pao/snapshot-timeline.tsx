'use client'

import type { AssessmentSnapshotView } from '@/lib/api-client'

type Determination = AssessmentSnapshotView['determination']

/**
 * Colored badge classes keyed by determination. Uses plain Tailwind utility
 * strings so the class name contains the literal color token — component
 * tests assert on substring (e.g. `/green/`) without depending on Shadcn
 * Badge internals.
 */
const determinationClass: Record<Determination, string> = {
  FINAL_LEVEL_2:
    'bg-green-500/10 text-green-700 border border-green-500/30 dark:text-green-400',
  CONDITIONAL_LEVEL_2:
    'bg-amber-500/10 text-amber-700 border border-amber-500/30 dark:text-amber-400',
  NO_CMMC_STATUS:
    'bg-red-500/10 text-red-700 border border-red-500/30 dark:text-red-400',
}

const determinationLabel: Record<Determination, string> = {
  FINAL_LEVEL_2: 'Passed',
  CONDITIONAL_LEVEL_2: 'Conditional',
  NO_CMMC_STATUS: 'Not Met',
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export interface SnapshotTimelineProps {
  snapshots: AssessmentSnapshotView[]
}

/**
 * Read-only timeline of assessment snapshots. Newest first. Renders nothing
 * when the engagement has no snapshots.
 */
export function SnapshotTimeline({ snapshots }: SnapshotTimelineProps) {
  if (!snapshots || snapshots.length === 0) return null

  const ordered = [...snapshots].sort((a, b) => b.version - a.version)

  return (
    <section className="rounded-lg border bg-card p-4" aria-label="Assessment snapshots">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Assessment History</h3>
        <span className="text-xs text-muted-foreground">
          {ordered.length} snapshot{ordered.length === 1 ? '' : 's'}
        </span>
      </header>

      <ol className="space-y-2">
        {ordered.map((s) => (
          <li
            key={s.id}
            data-testid="snapshot-row"
            className="flex items-center gap-3 rounded-md border bg-background p-2.5"
          >
            <span
              className="inline-flex shrink-0 items-center rounded-md border bg-muted px-2 py-0.5 text-xs font-mono"
              aria-label={`Version ${s.version}`}
            >
              v{s.version}
            </span>

            <span
              data-determination={s.determination}
              className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium ${determinationClass[s.determination]}`}
            >
              {determinationLabel[s.determination]}
            </span>

            <div className="min-w-0 flex-1 text-xs text-muted-foreground">
              <span className="truncate">{formatTimestamp(s.capturedAt)}</span>
              {s.capturedByName ? (
                <>
                  <span className="mx-1.5">·</span>
                  <span className="truncate">{s.capturedByName}</span>
                </>
              ) : null}
            </div>

            {s.isCurrent ? (
              <span
                data-testid="snapshot-current-tag"
                className="inline-flex shrink-0 items-center rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
              >
                Current
              </span>
            ) : null}

            {s.isFinal ? (
              <span
                data-testid="snapshot-final-tag"
                className="inline-flex shrink-0 items-center rounded-md border border-green-500/40 bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400"
              >
                Final
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  )
}
