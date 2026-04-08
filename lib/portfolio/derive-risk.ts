/**
 * Pure helpers used by the lead-assessor dashboard, kanban board, and
 * engagements list to derive per-engagement risk, progress, and CAP phase
 * from `PortfolioListItem` rows returned by the Go API.
 *
 * Isolated from React so they can be unit-tested in the node vitest
 * environment and reused across multiple UI surfaces.
 */

import type { PortfolioListItem } from '@/lib/api-client'

/** CAP v2.0 lifecycle phase derived from the workflow status. */
export type Phase = 'PRE_ASSESS' | 'ASSESS' | 'REPORT' | 'CLOSE_OUT'

/** Per-engagement risk signal. */
export type Risk = 'ON_TRACK' | 'AT_RISK' | 'OVERDUE'

/** Statuses we treat as terminal — risk derivation is suppressed for them. */
const TERMINAL_STATUSES = new Set(['COMPLETED', 'CANCELLED'])

/** Threshold (in days) for the "stuck in phase" AT_RISK signal. */
export const STALE_DAYS_THRESHOLD = 14

/**
 * Derive the risk signal for a single engagement.
 *
 * Priority:
 *   OVERDUE  — scheduledEndDate is in the past
 *   AT_RISK  — days-in-phase exceeds the threshold
 *   ON_TRACK — everything else (including terminal engagements)
 */
export function deriveRisk(
  item: PortfolioListItem,
  now: Date = new Date(),
): Risk {
  if (TERMINAL_STATUSES.has(item.status)) {
    return 'ON_TRACK'
  }

  if (item.scheduledEndDate) {
    const end = new Date(item.scheduledEndDate)
    if (!Number.isNaN(end.getTime()) && end.getTime() < now.getTime()) {
      return 'OVERDUE'
    }
  }

  if (item.daysInPhase > STALE_DAYS_THRESHOLD) {
    return 'AT_RISK'
  }

  return 'ON_TRACK'
}

/**
 * Compute the progress percent for an engagement as a whole number 0-100.
 * Returns 0 when there are no objectives (avoids NaN). Clamped to 100.
 */
export function computeProgressPercent(item: PortfolioListItem): number {
  if (!item.objectivesTotal || item.objectivesTotal <= 0) return 0
  const pct = Math.round((item.objectivesAssessed / item.objectivesTotal) * 100)
  if (pct > 100) return 100
  if (pct < 0) return 0
  return pct
}

/**
 * Derive the CAP v2.0 lifecycle phase from the engagement's workflow status
 * and its assessment result.
 *
 * Returns null for CANCELLED engagements (no phase).
 *
 * Prefer `resolvePhase()` below when you have a `PortfolioListItem` — it
 * uses the real Task 8 `currentPhase` column when present and falls back
 * to this status-based derivation for rows that haven't been touched by
 * the backfill.
 */
export function derivePhaseFromStatus(
  status: string,
  assessmentResult: string | null,
): Phase | null {
  switch (status) {
    case 'REQUESTED':
    case 'INTRODUCED':
    case 'ACKNOWLEDGED':
    case 'PROPOSAL_SENT':
    case 'PROPOSAL_ACCEPTED':
    case 'ACCEPTED':
    case 'PENDING':
      return 'PRE_ASSESS'
    case 'IN_PROGRESS':
      return 'ASSESS'
    case 'PENDING_APPROVAL':
      return 'REPORT'
    case 'COMPLETED':
      return assessmentResult === 'CONDITIONAL_LEVEL_2' ? 'CLOSE_OUT' : 'REPORT'
    case 'CANCELLED':
    default:
      return null
  }
}

/**
 * Resolve the engagement's phase using Task 8's `currentPhase` column
 * when present, otherwise fall back to the legacy status mapping.
 *
 * Used by the kanban board, engagements list, and pre-assessment
 * workspace so every surface sees a consistent phase regardless of
 * whether the row was migrated yet.
 */
export function resolvePhase(
  item: PortfolioListItem,
): Phase | null {
  if (item.currentPhase) {
    // The DB stores one of the valid Phase values when set.
    const phase = item.currentPhase as Phase
    if (
      phase === 'PRE_ASSESS' ||
      phase === 'ASSESS' ||
      phase === 'REPORT' ||
      phase === 'CLOSE_OUT'
    ) {
      return phase
    }
  }
  return derivePhaseFromStatus(item.status, item.assessmentResult)
}

/**
 * Return only the engagements where the given user is the lead assessor.
 * Used by the assessor view (non-lead assessors see only their own).
 */
export function filterMyAssigned(
  items: readonly PortfolioListItem[],
  userId: string | null | undefined,
): PortfolioListItem[] {
  if (!userId) return []
  return items.filter((item) => item.leadAssessorId === userId)
}
