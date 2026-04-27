/** STUB — replaced by Agent A's data layer at merge time. */

/**
 * Shared types for the C3PAO personal-triage layer (pins, tags, snoozes,
 * saved views). All persisted in the local Postgres — never round-tripped
 * through the Go API.
 */

export type TagColor = 'sky' | 'violet' | 'amber' | 'emerald' | 'rose' | 'slate'

export const TAG_COLORS: ReadonlyArray<TagColor> = [
  'sky',
  'violet',
  'amber',
  'emerald',
  'rose',
  'slate',
] as const

export interface EngagementTag {
  engagementId: string
  label: string
  color: TagColor
  createdBy: string
  createdAt: string
}

export interface ActiveSnooze {
  engagementId: string
  hiddenUntil: string
  reason: string | null
}

export type PhaseFilter =
  | 'all'
  | 'PRE_ASSESS'
  | 'ASSESS'
  | 'REPORT'
  | 'CLOSE_OUT'

export interface SavedViewFilter {
  phase?: PhaseFilter
  mineOnly?: boolean
  atRiskOnly?: boolean
  pinnedOnly?: boolean
  /** undefined treated as true — snoozed rows hidden by default */
  hideSnoozed?: boolean
  tags?: string[]
  search?: string
}

export interface SavedView {
  id: string
  userId: string
  name: string
  filter: SavedViewFilter
  createdAt: string
}
