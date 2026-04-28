/**
 * Pure filtering and summarization helpers for the engagements list's
 * personal-triage layer (phase, chip toggles, tags). Kept outside the React
 * component so they can be unit-tested in node and reused if the toolbar is
 * ever rendered elsewhere.
 */

import { deriveRisk, resolvePhase } from '@/lib/portfolio/derive-risk'
import type {
  EngagementTag,
  KindFilter,
  PhaseFilter,
  SavedViewFilter,
} from '@/lib/personal-views-types'
import type { PortfolioRow } from './types'

export interface PersonalFilterState {
  phase: PhaseFilter
  mineOnly: boolean
  atRiskOnly: boolean
  pinnedOnly: boolean
  hideSnoozed: boolean
  tagFilter: string[]
  kindFilter: KindFilter
  leadFilterId?: string
}

export interface PersonalFilterContext {
  currentUserId: string
  pinnedIds: ReadonlySet<string>
  snoozedIds: ReadonlySet<string>
  tagsByEngagement: Record<string, EngagementTag[]>
  now?: Date
}

/** Apply phase + chip toggle + tag + lead filters to the portfolio rows. */
export function applyPersonalFilters(
  items: readonly PortfolioRow[],
  state: PersonalFilterState,
  ctx: PersonalFilterContext,
): PortfolioRow[] {
  const now = ctx.now ?? new Date()
  return items.filter((item) => {
    if (state.hideSnoozed && ctx.snoozedIds.has(item.id)) return false
    if (state.phase !== 'all' && resolvePhase(item) !== state.phase) return false
    if (state.mineOnly && item.leadAssessorId !== ctx.currentUserId) return false
    if (state.atRiskOnly) {
      const risk = deriveRisk(item, now)
      if (risk !== 'AT_RISK' && risk !== 'OVERDUE') return false
    }
    if (state.pinnedOnly && !ctx.pinnedIds.has(item.id)) return false
    if (state.tagFilter.length > 0) {
      const tags = ctx.tagsByEngagement[item.id] ?? []
      const labels = new Set(tags.map((t) => t.label))
      if (!state.tagFilter.some((t) => labels.has(t))) return false
    }
    if (state.leadFilterId && item.leadAssessorId !== state.leadFilterId) {
      return false
    }
    if (state.kindFilter === 'osc' && item.kind !== 'osc') return false
    if (state.kindFilter === 'outside' && item.kind !== 'outside_osc') return false
    return true
  })
}

const PHASE_LABEL: Record<Exclude<PhaseFilter, 'all'>, string> = {
  PRE_ASSESS: 'Pre-Assess',
  ASSESS: 'Assess',
  REPORT: 'Report',
  CLOSE_OUT: 'Close-Out',
}

const KIND_LABEL: Record<Exclude<KindFilter, 'all'>, string> = {
  osc: 'OSC only',
  outside: 'Outside only',
}

/** Build a one-line human summary of the active filters. */
export function summarizeFilters(state: PersonalFilterState): string {
  const parts: string[] = []
  if (state.phase !== 'all') parts.push(`Phase: ${PHASE_LABEL[state.phase]}`)
  if (state.kindFilter !== 'all') parts.push(KIND_LABEL[state.kindFilter])
  if (state.mineOnly) parts.push('Mine only')
  if (state.atRiskOnly) parts.push('At risk')
  if (state.pinnedOnly) parts.push('Pinned')
  if (!state.hideSnoozed) parts.push('Showing snoozed')
  if (state.tagFilter.length === 1) parts.push(`Tag: ${state.tagFilter[0]}`)
  if (state.tagFilter.length > 1) parts.push(`${state.tagFilter.length} tags`)
  if (parts.length === 0) return 'All engagements'
  return parts.join(' · ')
}

/** True when at least one filter differs from the defaults. */
export function hasNonDefaultFilters(state: PersonalFilterState): boolean {
  return (
    state.phase !== 'all' ||
    state.mineOnly ||
    state.atRiskOnly ||
    state.pinnedOnly ||
    !state.hideSnoozed ||
    state.tagFilter.length > 0 ||
    state.kindFilter !== 'all'
  )
}

/** Convert the local React state into the persisted SavedViewFilter shape. */
export function toSavedViewFilter(state: PersonalFilterState): SavedViewFilter {
  const filter: SavedViewFilter = {}
  if (state.phase !== 'all') filter.phase = state.phase
  if (state.mineOnly) filter.mineOnly = true
  if (state.atRiskOnly) filter.atRiskOnly = true
  if (state.pinnedOnly) filter.pinnedOnly = true
  // Persist hideSnoozed only when it differs from the default (true).
  if (!state.hideSnoozed) filter.hideSnoozed = false
  if (state.tagFilter.length > 0) filter.tags = [...state.tagFilter]
  if (state.kindFilter !== 'all') filter.kindFilter = state.kindFilter
  return filter
}

/**
 * Apply a stored SavedViewFilter to derive the corresponding React state.
 * Defaults: hideSnoozed → true when undefined; kindFilter → 'all' (backward
 * compat with saved views created before kindFilter existed).
 */
export function fromSavedViewFilter(
  filter: SavedViewFilter,
  preserve: { leadFilterId?: string } = {},
): PersonalFilterState {
  return {
    phase: filter.phase ?? 'all',
    mineOnly: filter.mineOnly ?? false,
    atRiskOnly: filter.atRiskOnly ?? false,
    pinnedOnly: filter.pinnedOnly ?? false,
    hideSnoozed: filter.hideSnoozed ?? true,
    tagFilter: filter.tags ? [...filter.tags] : [],
    kindFilter: filter.kindFilter ?? 'all',
    leadFilterId: preserve.leadFilterId,
  }
}
