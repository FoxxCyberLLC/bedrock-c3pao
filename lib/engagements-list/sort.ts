/**
 * Pure sort helpers for the assessor portfolio table.
 *
 * Lives outside the React component so the comparator behaviour can be
 * unit-tested in the node vitest environment without rendering anything.
 */

import type { PortfolioListItem } from '@/lib/api-client'
import {
  computeProgressPercent,
  deriveRisk,
  resolvePhase,
  type Phase,
  type Risk,
} from '@/lib/portfolio/derive-risk'

export type SortKey =
  | 'organization'
  | 'phase'
  | 'lead'
  | 'schedule'
  | 'progress'
  | 'daysInPhase'
  | 'risk'
  | 'updated'

export type SortDirection = 'asc' | 'desc'

export interface SortState {
  key: SortKey
  direction: SortDirection
}

const PHASE_ORDER: Record<Phase, number> = {
  PRE_ASSESS: 0,
  ASSESS: 1,
  REPORT: 2,
  CLOSE_OUT: 3,
}

const RISK_ORDER: Record<Risk, number> = {
  ON_TRACK: 0,
  AT_RISK: 1,
  OVERDUE: 2,
}

function timestamp(iso: string | null): number {
  if (!iso) return Number.NaN
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : Number.NaN
}

/**
 * Three-way comparator that pushes NaN / null / undefined to the end of an
 * ascending sort regardless of direction. Keeps "missing data" rows from
 * polluting the top of the table when sorting by an optional column.
 */
function compareWithNullsLast(
  a: number | string | null | undefined,
  b: number | string | null | undefined,
): number {
  const aMissing =
    a === null || a === undefined || (typeof a === 'number' && Number.isNaN(a))
  const bMissing =
    b === null || b === undefined || (typeof b === 'number' && Number.isNaN(b))
  if (aMissing && bMissing) return 0
  if (aMissing) return 1
  if (bMissing) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b))
}

function sortValue(item: PortfolioListItem, key: SortKey): number | string | null {
  switch (key) {
    case 'organization':
      return item.organizationName.toLowerCase()
    case 'phase': {
      const p = resolvePhase(item)
      return p ? PHASE_ORDER[p] : Number.NaN
    }
    case 'lead':
      return item.leadAssessorName?.toLowerCase() ?? null
    case 'schedule':
      return timestamp(item.scheduledStartDate ?? item.scheduledEndDate)
    case 'progress':
      return computeProgressPercent(item)
    case 'daysInPhase':
      return item.daysInPhase
    case 'risk':
      return RISK_ORDER[deriveRisk(item)]
    case 'updated':
      return timestamp(item.updatedAt)
  }
}

/**
 * Stable, immutable sort. Always sorts ascending by the chosen key with
 * nulls pushed last, then reverses for `desc` so missing-data rows stay at
 * the bottom in both directions.
 */
export function sortItems(
  items: readonly PortfolioListItem[],
  state: SortState,
): PortfolioListItem[] {
  const indexed = items.map((item, index) => ({ item, index }))
  indexed.sort((a, b) => {
    const cmp = compareWithNullsLast(
      sortValue(a.item, state.key),
      sortValue(b.item, state.key),
    )
    if (cmp !== 0) return cmp
    return a.index - b.index
  })
  const sorted = indexed.map((entry) => entry.item)
  if (state.direction === 'desc') {
    return reverseKeepingNullsLast(sorted, state.key)
  }
  return sorted
}

function reverseKeepingNullsLast(
  sorted: PortfolioListItem[],
  key: SortKey,
): PortfolioListItem[] {
  const present: PortfolioListItem[] = []
  const missing: PortfolioListItem[] = []
  for (const item of sorted) {
    const v = sortValue(item, key)
    const isMissing =
      v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))
    ;(isMissing ? missing : present).push(item)
  }
  present.reverse()
  return [...present, ...missing]
}

/**
 * Toggle helper for header click handlers. Same key flips direction; new
 * key starts ascending (the natural reading order).
 */
export function toggleSort(prev: SortState, key: SortKey): SortState {
  if (prev.key !== key) return { key, direction: 'asc' }
  return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
}
