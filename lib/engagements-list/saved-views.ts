/**
 * Saved views + grouping logic for the /engagements list rebuild (Task 7).
 *
 * All logic is pure so it can be unit-tested in the node vitest environment
 * and reused anywhere (engagements list page, future report exports, etc.).
 */

import { addDays, isWithinInterval, isAfter, subDays } from 'date-fns'
import type { PortfolioListItem } from '@/lib/api-client'
import {
  deriveRisk,
  derivePhaseFromStatus,
  type Phase,
} from '@/lib/portfolio/derive-risk'

export type SavedViewId =
  | 'my-active'
  | 'pre-brief-this-week'
  | 'at-risk'
  | 'qa-queue'
  | 'past-30-completed'

export interface SavedView {
  id: SavedViewId
  label: string
  description: string
}

export const SAVED_VIEWS: readonly SavedView[] = [
  {
    id: 'my-active',
    label: 'My Active',
    description: 'Engagements you lead that are not terminal',
  },
  {
    id: 'pre-brief-this-week',
    label: 'Pre-Brief This Week',
    description: 'Scheduled start within the next 7 days',
  },
  {
    id: 'at-risk',
    label: 'At Risk',
    description: 'Past scheduled end date or stalled > 14 days',
  },
  {
    id: 'qa-queue',
    label: 'QA Queue',
    description: 'Pending lead assessor approval',
  },
  {
    id: 'past-30-completed',
    label: 'Past 30 Days Completed',
    description: 'Completed within the last 30 days',
  },
]

export function getSavedViewById(id: SavedViewId): SavedView | undefined {
  return SAVED_VIEWS.find((v) => v.id === id)
}

export interface ApplySavedViewContext {
  userId: string | null
  now: Date
}

/** Filter the portfolio list down to the rows matching the given saved view. */
export function applySavedView(
  items: readonly PortfolioListItem[],
  viewId: SavedViewId,
  ctx: ApplySavedViewContext,
): PortfolioListItem[] {
  const { userId, now } = ctx
  const weekEnd = addDays(now, 7)
  const thirtyDaysAgo = subDays(now, 30)
  const terminalStatuses = new Set(['COMPLETED', 'CANCELLED'])

  switch (viewId) {
    case 'my-active':
      return items.filter(
        (item) =>
          item.leadAssessorId === userId && !terminalStatuses.has(item.status),
      )
    case 'pre-brief-this-week':
      return items.filter((item) => {
        if (!item.scheduledStartDate) return false
        const d = new Date(item.scheduledStartDate)
        if (Number.isNaN(d.getTime())) return false
        return isWithinInterval(d, { start: now, end: weekEnd })
      })
    case 'at-risk':
      return items.filter((item) => {
        const risk = deriveRisk(item, now)
        return risk === 'AT_RISK' || risk === 'OVERDUE'
      })
    case 'qa-queue':
      return items.filter((item) => item.status === 'PENDING_APPROVAL')
    case 'past-30-completed':
      return items.filter((item) => {
        if (item.status !== 'COMPLETED') return false
        const d = new Date(item.updatedAt)
        if (Number.isNaN(d.getTime())) return false
        return isAfter(d, thirtyDaysAgo)
      })
  }
}

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

export interface EngagementGroup {
  /** Machine-readable key (phase code, lead id, status enum, etc.). */
  key: string
  /** Display label for the group header. */
  label: string
  items: PortfolioListItem[]
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
export function groupItems(
  items: readonly PortfolioListItem[],
  groupKey: GroupKey,
): EngagementGroup[] {
  if (groupKey === 'none') {
    return [{ key: '', label: '', items: [...items] }]
  }

  const buckets = new Map<string, EngagementGroup>()

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

function getGroupKeyAndLabel(
  item: PortfolioListItem,
  groupKey: GroupKey,
): [string, string] {
  switch (groupKey) {
    case 'phase': {
      const phase = derivePhaseFromStatus(item.status, item.assessmentResult)
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
