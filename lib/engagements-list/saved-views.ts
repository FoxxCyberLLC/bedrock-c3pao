/**
 * Grouping logic for the /engagements list. Pure helpers so they can be
 * unit-tested in the node vitest environment and reused wherever a
 * `PortfolioListItem` set needs to be bucketed.
 *
 * The legacy hard-coded saved-views (`SAVED_VIEWS`, `applySavedView`, etc.)
 * were removed when the personal-triage layer landed — saved views now
 * live in the local Postgres and are user-defined; the list filters use
 * `lib/engagements-list/personal-filters.ts`.
 */

import type { PortfolioListItem } from '@/lib/api-client'
import { resolvePhase, type Phase } from '@/lib/portfolio/derive-risk'

// ---- Grouping ----

export type GroupKey = 'none' | 'phase' | 'lead' | 'org' | 'status'

export interface GroupOption {
  value: GroupKey
  label: string
}

export const GROUP_OPTIONS: readonly GroupOption[] = [
  { value: 'none', label: 'No grouping' },
  { value: 'phase', label: 'By phase' },
  { value: 'lead', label: 'By lead assessor' },
  { value: 'org', label: 'By organization' },
  { value: 'status', label: 'By status' },
]

export interface EngagementGroup<T extends PortfolioListItem = PortfolioListItem> {
  /** Machine-readable key (phase code, lead id, status enum, etc.). */
  key: string
  /** Display label for the group header. */
  label: string
  items: T[]
}

const PHASE_LABELS: Record<Phase, string> = {
  PRE_ASSESS: 'Pre-Assessment',
  ASSESS: 'Assess',
  REPORT: 'Report',
  CLOSE_OUT: 'Close-Out',
}

/** Phase display order so groups sort intuitively even when using string sort. */
const PHASE_ORDER: Record<Phase | 'UNASSIGNED', number> = {
  PRE_ASSESS: 0,
  ASSESS: 1,
  REPORT: 2,
  CLOSE_OUT: 3,
  UNASSIGNED: 99,
}

/** Group engagements by the selected key and return sorted groups. */
export function groupItems<T extends PortfolioListItem>(
  items: readonly T[],
  groupKey: GroupKey,
): EngagementGroup<T>[] {
  if (groupKey === 'none') {
    return [{ key: '', label: '', items: [...items] }]
  }

  const buckets = new Map<string, EngagementGroup<T>>()

  for (const item of items) {
    const [key, label] = getGroupKeyAndLabel(item, groupKey)
    const existing = buckets.get(key)
    if (existing) {
      existing.items.push(item)
    } else {
      buckets.set(key, { key, label, items: [item] })
    }
  }

  const groups = Array.from(buckets.values())

  // Phase groups sort by canonical phase order; others sort alphabetically.
  if (groupKey === 'phase') {
    groups.sort(
      (a, b) =>
        (PHASE_ORDER[a.key as Phase | 'UNASSIGNED'] ?? 99) -
        (PHASE_ORDER[b.key as Phase | 'UNASSIGNED'] ?? 99),
    )
  } else {
    groups.sort((a, b) => a.label.localeCompare(b.label))
  }

  return groups
}

function getGroupKeyAndLabel<T extends PortfolioListItem>(
  item: T,
  groupKey: GroupKey,
): [string, string] {
  switch (groupKey) {
    case 'phase': {
      const phase = resolvePhase(item)
      if (!phase) return ['UNASSIGNED', 'Cancelled']
      return [phase, PHASE_LABELS[phase]]
    }
    case 'lead':
      if (!item.leadAssessorId) return ['UNASSIGNED', 'Unassigned']
      return [item.leadAssessorId, item.leadAssessorName ?? 'Unknown']
    case 'org':
      return [item.organizationName, item.organizationName]
    case 'status':
      return [item.status, item.status.replace(/_/g, ' ')]
    case 'none':
      return ['', '']
  }
}
