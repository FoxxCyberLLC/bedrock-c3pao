/**
 * Snapshot import pipeline (Task 8): a `v1` OSC package (zip) → local Postgres `imp_*` tables
 * + evidence Storage. Validates the manifest version and every checksum before loading, runs
 * the load in one transaction, and upserts by id so re-importing the same package is idempotent.
 *
 * Rows land verbatim as JSONB in `imp_<table>` (raw source rows, per Task 3); the `lib/local/*`
 * layer assembles API view shapes at read time. Evidence bytes go to the pluggable Storage
 * layer (local FS by default) — never inlined into the DB.
 */
import JSZip from 'jszip'
import { createHash } from 'node:crypto'
import {
  SNAPSHOT_FORMAT_VERSION,
  SNAPSHOT_PATHS,
  type SnapshotManifest,
  type EvidenceObjectiveLink,
} from '@/lib/snapshot/types'
import type { Storage } from '@/lib/storage/storage'
import { getClient as defaultGetClient } from '@/lib/db'

/** Thrown when the package format version is not supported by this importer. */
export class SnapshotFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SnapshotFormatError'
  }
}

/** Thrown when the package is malformed or a checksum does not match (tamper/corruption). */
export class SnapshotIntegrityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SnapshotIntegrityError'
  }
}

/** Minimal transactional client shape (satisfied by `pg.PoolClient`). */
interface TxClient {
  query(text: string, params?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>
  release(): void
}

export interface ImportDeps {
  storage: Storage
  /** Injectable for tests; defaults to a pooled pg client. */
  getClient?: () => Promise<TxClient>
}

export interface ImportResult {
  engagementId: string
  /** Rows loaded per `imp_` table. */
  tables: Record<string, number>
  evidenceCount: number
  linkCount: number
  /** Contract tables present in the package but not modeled by the importer (logged, skipped). */
  skippedTables: string[]
}

/** Contract table name (PascalCase) → `imp_` table suffix. `Customer` folds into `organization`. */
const TABLE_TO_IMP: Record<string, string> = {
  AssessmentEngagement: 'assessment_engagement',
  AtoPackage: 'ato_package',
  Organization: 'organization',
  Customer: 'organization',
  RequirementStatus: 'requirement_status',
  ObjectiveStatus: 'objective_status',
  ObjectiveStatusSnapshot: 'objective_status_snapshot',
  AssessmentSnapshot: 'assessment_snapshot',
  AssessmentFinding: 'assessment_finding',
  AssessmentReport: 'assessment_report',
  EngagementComment: 'engagement_comment',
  Evidence: 'evidence',
  EvidenceObjectiveMapping: 'evidence_objective_mapping',
  Poam: 'poam',
  Asset: 'asset',
  SSP: 'ssp',
  ExternalServiceProvider: 'external_service_provider',
  EspRequirementMapping: 'esp_requirement_mapping',
}

const sha256 = (buf: Buffer): string => createHash('sha256').update(buf).digest('hex')

async function readBytes(zip: JSZip, path: string): Promise<Buffer> {
  const file = zip.file(path)
  if (!file) throw new SnapshotIntegrityError(`missing package file: ${path}`)
  return file.async('nodebuffer')
}

async function readJson<T>(zip: JSZip, path: string): Promise<T> {
  return JSON.parse((await readBytes(zip, path)).toString('utf8')) as T
}

async function verifyChecksums(zip: JSZip, manifest: SnapshotManifest): Promise<void> {
  for (const [path, expected] of Object.entries(manifest.checksums)) {
    const actual = sha256(await readBytes(zip, path))
    if (actual !== expected) {
      throw new SnapshotIntegrityError(`checksum mismatch: ${path}`)
    }
  }
}

/** Import a `v1` snapshot zip into local Postgres + evidence Storage. Idempotent. */
export async function importSnapshot(zipBytes: Buffer, deps: ImportDeps): Promise<ImportResult> {
  const zip = await JSZip.loadAsync(zipBytes)

  let manifest: SnapshotManifest
  try {
    manifest = await readJson<SnapshotManifest>(zip, SNAPSHOT_PATHS.manifest)
  } catch (err) {
    if (err instanceof SnapshotIntegrityError) throw err
    throw new SnapshotIntegrityError('unreadable or missing manifest.json')
  }

  if (manifest.formatVersion !== SNAPSHOT_FORMAT_VERSION) {
    throw new SnapshotFormatError(
      `unsupported snapshot format ${String(manifest.formatVersion)} (expected ${SNAPSHOT_FORMAT_VERSION})`
    )
  }
  await verifyChecksums(zip, manifest)

  const engagementId = manifest.source.engagementId
  const result: ImportResult = { engagementId, tables: {}, evidenceCount: 0, linkCount: 0, skippedTables: [] }

  const client = await (deps.getClient ?? defaultGetClient)()
  try {
    await client.query('BEGIN')

    for (const name of Object.keys(manifest.tables)) {
      const imp = TABLE_TO_IMP[name]
      if (!imp) {
        result.skippedTables.push(name)
        continue
      }
      const rows = await readJson<Array<Record<string, unknown>>>(
        zip,
        `${SNAPSHOT_PATHS.tablesDir}/${name}.json`
      )
      for (const row of rows) {
        await client.query(
          `INSERT INTO imp_${imp} (id, engagement_id, data)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, imported_at = NOW()`,
          [String(row.id), engagementId, JSON.stringify(row)]
        )
      }
      result.tables[imp] = (result.tables[imp] ?? 0) + rows.length
    }

    for (const path of Object.keys(manifest.checksums)) {
      if (!path.startsWith(`${SNAPSHOT_PATHS.evidenceDir}/`)) continue
      await deps.storage.put(path, await readBytes(zip, path))
      result.evidenceCount += 1
    }

    if (zip.file(SNAPSHOT_PATHS.evidenceLinks)) {
      const links = await readJson<EvidenceObjectiveLink[]>(zip, SNAPSHOT_PATHS.evidenceLinks)
      for (const link of links) {
        await client.query(
          `INSERT INTO imp_evidence_objective_link (engagement_id, evidence_id, objective_id, requirement_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (evidence_id, objective_id) DO UPDATE SET requirement_id = EXCLUDED.requirement_id`,
          [engagementId, link.evidenceId, link.objectiveId, link.requirementId ?? null]
        )
      }
      result.linkCount = links.length
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  return result
}
