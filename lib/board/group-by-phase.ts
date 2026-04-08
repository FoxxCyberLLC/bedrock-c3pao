/**
 * Pure utilities used by the kanban board (Task 5) to group engagements
 * into CAP phase columns, resolve drag-drop target statuses, and apply
 * filter/search predicates.
 *
 * Keeping these in `lib/board/` (not inside a React component file) makes
 * the logic unit-testable in the node vitest environment.
 */

import type { PortfolioListItem } from '@/lib/api-client'
import {
  deriveRisk,
  resolvePhase,
  type Phase,
} from '@/lib/portfolio/derive-risk'

/** A single column definition for the kanban board. */
export interface BoardColumn {
  id: Phase
  phase: Phase
  label: string
  description: string
}

export const BOARD_COLUMNS: readonly BoardColumn[] = [
  {
    id: 'PRE_ASSESS',
    phase: 'PRE_ASSESS',
    label: 'Pre-Assessment',
    description: 'Readiness + contract + team composition',
  },
  {
    id: 'ASSESS',
    phase: 'ASSESS',
    label: 'Assess',
    description: 'Active scoring against objectives',
  },
  {
    id: 'REPORT',
    phase: 'REPORT',
    label: 'Report',
    description: 'Compilation, QA, out-brief',
  },
  {
    id: 'CLOSE_OUT',
    phase: 'CLOSE_OUT',
    label: 'Close-Out',
    description: 'POA&M closeout within 180 days',
  },
]

/** Grouped engagements — one array per phase column. */
export type GroupedByPhase = Record<Phase, PortfolioListItem[]>

/**
 * Group engagements into the 4 CAP phase columns. Engagements with a
 * null phase (CANCELLED) or COMPLETED+FINAL (terminal success) are
 * excluded from the board — the board shows only in-flight work.
 */
export function groupByPhase(items: readonly PortfolioListItem[]): GroupedByPhase {
  const grouped: GroupedByPhase = {
    PRE_ASSESS: [],
    ASSESS: [],
    REPORT: [],
    CLOSE_OUT: [],
  }

  for (const item of items) {
    const phase = resolvePhase(item)
    if (phase === null) continue
    // Terminal success — hide from the board. Conditional still shows
    // in CLOSE_OUT so leads can track POA&M closeout deadlines.
    if (item.status === 'COMPLETED' && item.assessmentResult === 'FINAL_LEVEL_2') {
      continue
    }
    grouped[phase].push(item)
  }

  return grouped
}

/**
 * Resolve which workflow `status` value a drop into the given phase column
 * should trigger. Used by the drag-drop handler to map the CAP phase back
 * to the existing engagement status enum (since Task 8 hasn't landed the
 * real `currentPhase` column yet).
 */
export function resolveDropTargetStatus(phase: Phase): string {
  switch (phase) {
    case 'PRE_ASSESS':
      return 'ACCEPTED'
    case 'ASSESS':
      return 'IN_PROGRESS'
    case 'REPORT':
      return 'PENDING_APPROVAL'
    case 'CLOSE_OUT':
      return 'COMPLETED'
  }
}

/** Filter by lead assessor. `null`/empty returns all; `UNASSIGNED` matches items with no lead. */
export function filterByLead(
  items: readonly PortfolioListItem[],
  leadId: string | null,
): PortfolioListItem[] {
  if (!leadId) return [...items]
  if (leadId === 'UNASSIGNED') {
    return items.filter((item) => !item.leadAssessorId)
  }
  return items.filter((item) => item.leadAssessorId === leadId)
}

/** Filter to only at-risk or overdue items when `atRiskOnly` is true. */
export function filterByRisk(
  items: readonly PortfolioListItem[],
  atRiskOnly: boolean,
  now: Date = new Date(),
): PortfolioListItem[] {
  if (!atRiskOnly) return [...items]
  return items.filter((item) => {
    const risk = deriveRisk(item, now)
    return risk === 'AT_RISK' || risk === 'OVERDUE'
  })
}

/** Case-insensitive text filter matching package + organization name. */
export function filterByText(
  items: readonly PortfolioListItem[],
  query: string,
): PortfolioListItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...items]
  return items.filter(
    (item) =>
      item.packageName.toLowerCase().includes(q) ||
      item.organizationName.toLowerCase().includes(q),
  )
}
