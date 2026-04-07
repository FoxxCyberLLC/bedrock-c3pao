/**
 * Modern PM Suite semantic color tokens.
 *
 * Single source of truth for phase / risk / QA / certificate colors used
 * across the portfolio dashboard, kanban board, calendar, and engagement
 * detail pages.
 *
 * Classes are Tailwind utility strings referencing the CSS custom properties
 * defined in `app/globals.css` (see the `@theme inline` block). When adding a
 * new status, add the corresponding CSS variable in globals.css AND an entry
 * here — both sides are tested.
 */

// ---- Types ----

/** CAP v2.0 lifecycle phases. */
export type Phase = 'PRE_ASSESS' | 'ASSESS' | 'REPORT' | 'CLOSE_OUT'

/** Per-engagement risk level (derived by the portfolio-stats endpoint). */
export type Risk = 'ON_TRACK' | 'AT_RISK' | 'OVERDUE'

/** QA review lifecycle per CAP Phase 1 and Phase 3 independent-reviewer rule. */
export type QAStatus =
  | 'PENDING'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'NEEDS_REVISION'
  | 'REJECTED'

/** Certificate status per CAP Phase 4 outcome + display-only expiry states. */
export type CertStatus =
  | 'FINAL_LEVEL_2'
  | 'CONDITIONAL_LEVEL_2'
  | 'NO_CMMC_STATUS'
  | 'EXPIRING_SOON'
  | 'EXPIRED'

/**
 * A semantic color entry is a bundle of Tailwind utility classes for the
 * four places a status badge appears:
 *   - bg     — standalone background fill (e.g., a stat card tile)
 *   - fg     — standalone foreground text color
 *   - border — standalone border color
 *   - chip   — composite bg+text+border for inline pill / badge
 */
export interface ColorEntry {
  bg: string
  fg: string
  border: string
  chip: string
  label: string
}

// ---- Phase colors ----

/**
 * Phase palette:
 *   PRE_ASSESS → sky    (cool, "incoming work")
 *   ASSESS     → violet (active, "in progress")
 *   REPORT     → amber  (finishing, "output")
 *   CLOSE_OUT  → emerald (closing, "finalized")
 */
export const phaseColors: Record<Phase, ColorEntry> = {
  PRE_ASSESS: {
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    fg: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-900',
    chip: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900',
    label: 'Pre-Assessment',
  },
  ASSESS: {
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    fg: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-900',
    chip: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900',
    label: 'Assess',
  },
  REPORT: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    fg: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-900',
    chip: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    label: 'Report',
  },
  CLOSE_OUT: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    fg: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-900',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
    label: 'Close-Out',
  },
}

/** Neutral fallback used when phase is null, unknown, or for CANCELLED engagements. */
const phaseFallback: ColorEntry = {
  bg: 'bg-muted',
  fg: 'text-muted-foreground',
  border: 'border-border',
  chip: 'bg-muted text-muted-foreground border-border',
  label: 'Unknown',
}

/**
 * Resolve a phase to its color entry. Accepts null/undefined/unknown strings
 * and returns the neutral fallback — callers never need to defend against
 * missing data from the API.
 */
export function getPhaseColor(phase: Phase | null | undefined): ColorEntry {
  if (!phase) return phaseFallback
  return phaseColors[phase] ?? phaseFallback
}

// ---- Risk colors ----

export const riskColors: Record<Risk, ColorEntry> = {
  ON_TRACK: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    fg: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-900',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
    label: 'On Track',
  },
  AT_RISK: {
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    fg: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-900',
    chip: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900',
    label: 'At Risk',
  },
  OVERDUE: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    fg: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-900',
    chip: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
    label: 'Overdue',
  },
}

export function getRiskColor(risk: Risk): ColorEntry {
  return riskColors[risk]
}

// ---- QA review colors ----

export const qaColors: Record<QAStatus, ColorEntry> = {
  PENDING: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    fg: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-900',
    chip: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    label: 'Pending',
  },
  IN_REVIEW: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    fg: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-900',
    chip: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
    label: 'In Review',
  },
  APPROVED: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    fg: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-900',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
    label: 'Approved',
  },
  NEEDS_REVISION: {
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    fg: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-900',
    chip: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900',
    label: 'Needs Revision',
  },
  REJECTED: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    fg: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-900',
    chip: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
    label: 'Rejected',
  },
}

export function getQAColor(status: QAStatus): ColorEntry {
  return qaColors[status]
}

// ---- Certificate colors ----

export const certColors: Record<CertStatus, ColorEntry> = {
  FINAL_LEVEL_2: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    fg: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-900',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
    label: 'Final Level 2',
  },
  CONDITIONAL_LEVEL_2: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    fg: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-900',
    chip: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    label: 'Conditional Level 2',
  },
  NO_CMMC_STATUS: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    fg: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-900',
    chip: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
    label: 'No CMMC Status',
  },
  EXPIRING_SOON: {
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    fg: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-900',
    chip: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900',
    label: 'Expiring Soon',
  },
  EXPIRED: {
    bg: 'bg-muted dark:bg-muted',
    fg: 'text-muted-foreground',
    border: 'border-border',
    chip: 'bg-muted text-muted-foreground border-border',
    label: 'Expired',
  },
}

const certFallback: ColorEntry = {
  bg: 'bg-muted',
  fg: 'text-muted-foreground',
  border: 'border-border',
  chip: 'bg-muted text-muted-foreground border-border',
  label: 'Not Issued',
}

export function getCertColor(status: CertStatus | null | undefined): ColorEntry {
  if (!status) return certFallback
  return certColors[status] ?? certFallback
}
