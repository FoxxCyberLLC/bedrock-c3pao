/**
 * Local (air-gapped) evidence data layer — Task 14.
 *
 * Evidence metadata comes from `imp_evidence` (scoped by the tagged `engagement_id`), with
 * supporting `requirementIds` aggregated from `imp_evidence_objective_link`. The file BYTES are
 * served from the pluggable `Storage` layer (local FS by default) at `evidence/<id>/<fileName>`
 * — a deliberate divergence from `outside_osc`'s BYTEA blobs (import volume + file count make FS
 * the right choice). No remote download-URL, no network.
 */
import type { Readable } from 'node:stream'
import { query } from '@/lib/db'
import { createStorage } from '@/lib/storage/factory'
import type { EvidenceView } from '@/lib/api-client'

interface EvidenceRow {
  id: string
  edata: Record<string, unknown>
  requirement_ids: string[]
}

const str = (d: Record<string, unknown>, k: string): string | null => (d[k] != null ? String(d[k]) : null)
const num = (d: Record<string, unknown>, k: string): number | null => (d[k] != null ? Number(d[k]) : null)
const fileNameOf = (d: Record<string, unknown>): string =>
  String(d.fileName ?? d.filename ?? d.name ?? d.originalFilename ?? '')

function mapEvidence(row: EvidenceRow): EvidenceView {
  const d = row.edata
  return {
    id: row.id,
    fileName: fileNameOf(d),
    fileUrl: null, // served via the local proxy route, not a remote URL
    mimeType: str(d, 'mimeType'),
    fileSize: num(d, 'fileSize'),
    description: str(d, 'description'),
    version: num(d, 'version') ?? 1,
    uploadedBy: str(d, 'uploadedBy'),
    uploadedAt: str(d, 'uploadedAt') ?? '',
    expirationDate: str(d, 'expirationDate'),
    requirementIds: row.requirement_ids ?? [],
  }
}

/** All imported evidence for the engagement with its supporting requirement ids. */
export async function getLocalEvidence(engagementId: string): Promise<EvidenceView[]> {
  const result = await query(
    `SELECT e.id AS id,
            e.data AS edata,
            COALESCE(
              array_agg(DISTINCT l.requirement_id) FILTER (WHERE l.requirement_id IS NOT NULL),
              '{}'
            ) AS requirement_ids
       FROM imp_evidence e
       LEFT JOIN imp_evidence_objective_link l
         ON l.evidence_id = e.id AND l.engagement_id = e.engagement_id
      WHERE e.engagement_id = $1
      GROUP BY e.id, e.data
      ORDER BY e.data->>'uploadedAt' DESC NULLS LAST`,
    [engagementId]
  )
  return (result.rows as EvidenceRow[]).map(mapEvidence)
}

export interface LocalEvidenceObject {
  stream: Readable
  sizeBytes: number
  mimeType: string
  fileName: string
}

/**
 * Open an evidence file for streaming from the Storage layer. Returns null when the evidence
 * row is not imported. Throws `StorageNotFoundError` if the metadata exists but bytes are missing.
 */
export async function getLocalEvidenceObject(
  engagementId: string,
  evidenceId: string
): Promise<LocalEvidenceObject | null> {
  const result = await query(
    `SELECT data FROM imp_evidence WHERE id = $1 AND engagement_id = $2`,
    [evidenceId, engagementId]
  )
  if (result.rows.length === 0) return null
  const d = (result.rows[0] as { data: Record<string, unknown> }).data
  const fileName = fileNameOf(d)
  const obj = await createStorage().getStream(`evidence/${evidenceId}/${fileName}`)
  return {
    stream: obj.stream,
    sizeBytes: obj.sizeBytes,
    mimeType: str(d, 'mimeType') ?? 'application/octet-stream',
    fileName,
  }
}

/** Read an evidence file fully into a Buffer (for in-memory parsers, e.g. the xlsx preview). */
export async function getLocalEvidenceBytes(
  engagementId: string,
  evidenceId: string
): Promise<{ bytes: Buffer; mimeType: string; fileName: string } | null> {
  const result = await query(
    `SELECT data FROM imp_evidence WHERE id = $1 AND engagement_id = $2`,
    [evidenceId, engagementId]
  )
  if (result.rows.length === 0) return null
  const d = (result.rows[0] as { data: Record<string, unknown> }).data
  const fileName = fileNameOf(d)
  const bytes = await createStorage().get(`evidence/${evidenceId}/${fileName}`)
  return { bytes, mimeType: str(d, 'mimeType') ?? 'application/octet-stream', fileName }
}
