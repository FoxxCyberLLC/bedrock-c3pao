/**
 * Golden `v1` snapshot fixture — the contract conformance reference (plan Task 8 / §Testing).
 *
 * Hand-authored from the Task 1 contract (docs/snapshot-format.md), NOT from the Go exporter,
 * so the TS import + domain ports validate against the contract itself. The Go exporter (Task 7)
 * separately asserts its real output conforms to this same schema. Source rows are readable
 * literals; the builder assembles the zip and computes real SHA-256 checksums.
 */
import JSZip from 'jszip'
import { createHash } from 'node:crypto'
import { SNAPSHOT_FORMAT_VERSION, SNAPSHOT_PATHS, type SnapshotManifest } from '@/lib/snapshot/types'

export const GOLDEN_ENGAGEMENT_ID = 'eng-golden-0001'
export const GOLDEN_ATO_PACKAGE_ID = 'pkg-golden-0001'
export const GOLDEN_ORG_ID = 'org-golden-0001'
export const GOLDEN_EVIDENCE_ID = 'ev-golden-0001'
export const GOLDEN_OBJECTIVE_REF = '03.01.01.a'

/** One array of raw rows per contract table (PascalCase table name → rows). */
const GOLDEN_TABLES: Record<string, Array<Record<string, unknown>>> = {
  AssessmentEngagement: [
    { id: GOLDEN_ENGAGEMENT_ID, atoPackageId: GOLDEN_ATO_PACKAGE_ID, status: 'IN_PROGRESS' },
  ],
  AtoPackage: [{ id: GOLDEN_ATO_PACKAGE_ID, organizationId: GOLDEN_ORG_ID, name: 'Golden Package' }],
  Organization: [{ id: GOLDEN_ORG_ID, name: 'Golden OSC' }],
  RequirementStatus: [
    { id: 'rs-golden-1', requirementId: '03.01.01', status: 'MET', organizationId: GOLDEN_ORG_ID },
  ],
  ObjectiveStatus: [
    {
      id: 'os-golden-1',
      objectiveReference: GOLDEN_OBJECTIVE_REF,
      status: 'MET',
      engagementId: GOLDEN_ENGAGEMENT_ID,
    },
  ],
  Evidence: [
    { id: GOLDEN_EVIDENCE_ID, filename: 'policy.txt', organizationId: GOLDEN_ORG_ID },
  ],
  AssessmentFinding: [
    { id: 'find-golden-1', engagementId: GOLDEN_ENGAGEMENT_ID, requirementId: '03.01.01', determination: 'MET' },
  ],
}

const GOLDEN_EVIDENCE_FILE = { name: 'policy.txt', body: Buffer.from('golden evidence body\n') }
const GOLDEN_LINKS = [
  { evidenceId: GOLDEN_EVIDENCE_ID, objectiveId: GOLDEN_OBJECTIVE_REF, requirementId: '03.01.01' },
]

const sha256 = (buf: Buffer): string => createHash('sha256').update(buf).digest('hex')

export interface BuildOptions {
  /** Corrupt a table file's bytes AFTER checksums are computed, to exercise integrity rejection. */
  corruptChecksum?: boolean
  /** Emit an unsupported formatVersion to exercise version rejection. */
  badVersion?: boolean
}

/** Assemble the golden `v1` snapshot zip as a Node Buffer. */
export async function buildGoldenSnapshot(opts: BuildOptions = {}): Promise<Buffer> {
  const zip = new JSZip()
  const checksums: Record<string, string> = {}
  const tablesIndex: SnapshotManifest['tables'] = {}

  for (const [name, rows] of Object.entries(GOLDEN_TABLES)) {
    const path = `${SNAPSHOT_PATHS.tablesDir}/${name}.json`
    const bytes = Buffer.from(JSON.stringify(rows, null, 2))
    zip.file(path, bytes)
    checksums[path] = sha256(bytes)
    tablesIndex[name] = { rowCount: rows.length }
  }

  const evPath = `${SNAPSHOT_PATHS.evidenceDir}/${GOLDEN_EVIDENCE_ID}/${GOLDEN_EVIDENCE_FILE.name}`
  zip.file(evPath, GOLDEN_EVIDENCE_FILE.body)
  checksums[evPath] = sha256(GOLDEN_EVIDENCE_FILE.body)

  const linksBytes = Buffer.from(JSON.stringify(GOLDEN_LINKS, null, 2))
  zip.file(SNAPSHOT_PATHS.evidenceLinks, linksBytes)
  checksums[SNAPSHOT_PATHS.evidenceLinks] = sha256(linksBytes)

  const manifest: SnapshotManifest = {
    formatVersion: opts.badVersion ? ('v0' as SnapshotManifest['formatVersion']) : SNAPSHOT_FORMAT_VERSION,
    createdAt: '2026-07-01T00:00:00.000Z',
    source: {
      engagementId: GOLDEN_ENGAGEMENT_ID,
      atoPackageId: GOLDEN_ATO_PACKAGE_ID,
      organizationId: GOLDEN_ORG_ID,
    },
    tables: tablesIndex,
    evidence: { count: 1, totalBytes: GOLDEN_EVIDENCE_FILE.body.length },
    checksums,
  }
  zip.file(SNAPSHOT_PATHS.manifest, Buffer.from(JSON.stringify(manifest, null, 2)))

  if (opts.corruptChecksum) {
    // Rewrite a file's bytes without updating its recorded checksum.
    zip.file(`${SNAPSHOT_PATHS.tablesDir}/Organization.json`, Buffer.from('[{"id":"tampered"}]'))
  }

  return zip.generateAsync({ type: 'nodebuffer' })
}
