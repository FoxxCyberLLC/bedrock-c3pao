/**
 * Types for the OSC assessment snapshot package (`v1`) — the contract between the Go
 * exporter and the c3pao importer. See `docs/snapshot-format.md`.
 */

/** Current package format version. The importer supports exactly the versions it knows. */
export const SNAPSHOT_FORMAT_VERSION = 'v1' as const
export type SnapshotFormatVersion = typeof SNAPSHOT_FORMAT_VERSION

/** Identifiers of the exported engagement, needed to scope the snapshot tables. */
export interface SnapshotSource {
  engagementId: string
  atoPackageId: string
  /** The OSC organization id — required to scope org-scoped tables (RequirementStatus, SSP, etc.). */
  organizationId: string
}

/** Per-table index entry in the manifest. */
export interface SnapshotTableIndex {
  rowCount: number
}

/** Evidence totals in the manifest. */
export interface SnapshotEvidenceIndex {
  count: number
  totalBytes: number
}

/**
 * `manifest.json`. `checksums` maps every packaged file path (relative to the zip root)
 * to its SHA-256 hex digest; the importer verifies all of them before loading.
 */
export interface SnapshotManifest {
  formatVersion: SnapshotFormatVersion
  /** ISO-8601 UTC timestamp. */
  createdAt: string
  source: SnapshotSource
  tables: Record<string, SnapshotTableIndex>
  evidence: SnapshotEvidenceIndex
  checksums: Record<string, string>
}

/**
 * A single raw row from `tables/<TableName>.json`: column → value, exactly as the Go
 * `gatherSnapshot` emits (UUIDs as canonical strings, timestamps as ISO-8601 strings).
 * Loaded verbatim into the `imp_<table>` raw tables; view assembly happens in `lib/local/*`.
 */
export type SnapshotRow = Record<string, unknown>

/** Contents of `tables/<TableName>.json`. */
export type SnapshotTableFile = SnapshotRow[]

/** A single entry in `evidence-links.json` — an evidence → objective (control) mapping. */
export interface EvidenceObjectiveLink {
  evidenceId: string
  objectiveId: string
  requirementId?: string
}

/** Contents of `evidence-links.json`. */
export type EvidenceLinksFile = EvidenceObjectiveLink[]

/** Fixed file/dir names inside the package. */
export const SNAPSHOT_PATHS = {
  manifest: 'manifest.json',
  tablesDir: 'tables',
  evidenceDir: 'evidence',
  evidenceLinks: 'evidence-links.json',
} as const

/** Data class of a table — determines whether it travels in the snapshot. See docs. */
export type TableDataClass = 'snapshot' | 'reference' | 'org_local'

/** How a snapshot table is scoped during export. */
export type TableScopeKey = 'engagementId' | 'atoPackageId' | 'organizationId' | 'via_esp'
