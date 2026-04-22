/**
 * Shared types for the pre-assessment readiness workflow.
 * Pure, dependency-free — safe to import from server, client, and tests.
 */

export const READINESS_ITEM_KEYS = [
  'contract_executed',
  'ssp_reviewed',
  'boe_confirmed',
  'coi_cleared',
  'team_composed',
  'form_drafted',
  'form_qad',
  'emass_uploaded',
] as const
export type ReadinessItemKey = (typeof READINESS_ITEM_KEYS)[number]

export type ReadinessItemStatus =
  | 'not_started'
  | 'in_progress'
  | 'waived'
  | 'complete'

export interface ReadinessArtifact {
  id: string
  itemId: string
  filename: string
  mimeType: string
  sizeBytes: number
  description: string | null
  uploadedBy: string
  uploadedByEmail: string
  uploadedAt: string
}

export interface ReadinessItem {
  id: string
  engagementId: string
  itemKey: ReadinessItemKey
  status: ReadinessItemStatus
  completedBy: string | null
  completedByEmail: string | null
  completedAt: string | null
  waivedBy: string | null
  waivedByEmail: string | null
  waivedAt: string | null
  waiverReason: string | null
  updatedAt: string
  artifacts: ReadinessArtifact[]
}

export interface ReadinessChecklist {
  engagementId: string
  items: ReadinessItem[]
  /** Count of items that are `complete` OR `waived`. */
  completedCount: number
  totalCount: 8
  /** True when `completedCount === 8`. */
  canStart: boolean
}

export type AuditAction =
  | 'item_completed'
  | 'item_uncompleted'
  | 'waiver_granted'
  | 'waiver_revoked'
  | 'artifact_uploaded'
  | 'artifact_removed'
  | 'note_created'
  | 'note_edited'
  | 'note_deleted'
  | 'phase_advanced'

export interface AuditEntry {
  id: string
  engagementId: string
  itemId: string | null
  actorId: string
  actorEmail: string
  actorName: string
  action: AuditAction
  details: Record<string, unknown> | null
  createdAt: string
}

export interface AssessmentNote {
  id: string
  engagementId: string
  authorId: string
  authorEmail: string
  authorName: string
  body: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  revisionCount: number
}

export interface NoteRevision {
  id: string
  noteId: string
  body: string
  editedBy: string
  editedByEmail: string
  revisedAt: string
}
