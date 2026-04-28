/**
 * Data access layer + merge-at-read for outside-engagement assessments,
 * evidence, and evidence-objective links.
 *
 * Merge-at-read: outside_*_assessments tables are NOT seeded on engagement
 * creation. The catalog of 110 CMMC L2 requirements + a single primary
 * objective per requirement is synthesized from `lib/cmmc/requirement-values.ts`
 * keys. DB rows OVERRIDE the synthesized defaults. New writes hit the same
 * upsert path regardless of whether a row pre-existed.
 *
 * v1 simplification: outside engagements expose 1 primary objective per control
 * (objectiveReference = `<requirementId>.a`). OSC engagements have ~320
 * sub-objectives per the Go API. A future task can extend the static catalog
 * to mirror the full NIST 800-171A objective set.
 */

import { query } from './db'
import { cmmcRequirementValues } from './cmmc/requirement-values'
import { CMMC_FAMILIES } from './cmmc/families'
import type {
  ControlView,
  ObjectiveView,
  EvidenceView,
} from './api-client'
import { isUploadAllowed } from './evidence-mime-types'

const FAMILY_BY_CODE = new Map(CMMC_FAMILIES.map((f) => [f.code, f]))

// requirement-values keys are NIST format ("03.01.01"); display IDs are
// CMMC format ("AC.L2-3.1.1"). Map the two forms.
function nistToCmmcDisplayId(nistId: string): string {
  // "03.01.01" → "3.1.1"; family code derived from positional mapping in keys.
  // The mapping below mirrors the comments in lib/cmmc/requirement-values.ts.
  const dotted = nistId
    .split('.')
    .map((seg) => String(parseInt(seg, 10)))
    .join('.')
  const familyCode = familyCodeFromNistId(nistId)
  return `${familyCode}.L2-${dotted}`
}

function familyCodeFromNistId(nistId: string): string {
  // NIST IDs follow "03.<family-num>.<seq>" where family-num maps to:
  //   01: AC, 02: AT, 03: AU, 04: CM, 05: IA, 06: IR, 07: MA,
  //   08: MP, 09: PE, 10: PS, 11: RA, 12: CA, 13: SC, 14: SI
  const familyNum = parseInt(nistId.split('.')[1] ?? '0', 10)
  const ORDER: ReadonlyArray<string> = [
    'AC', 'AT', 'AU', 'CM', 'IA', 'IR', 'MA',
    'MP', 'PE', 'PS', 'RA', 'CA', 'SC', 'SI',
  ]
  return ORDER[familyNum - 1] ?? 'AC'
}

interface ControlAssessmentRow {
  engagement_id: string
  requirement_id: string
  status: string
  notes: string | null
  updated_at: string | Date
  version: number
}

interface ObjectiveAssessmentRow {
  engagement_id: string
  requirement_id: string
  objective_id: string
  status: string
  assessment_notes: string | null
  evidence_description: string | null
  artifacts_reviewed: string | null
  interviewees: string | null
  examine_description: string | null
  test_description: string | null
  time_to_assess_minutes: number | null
  official_assessor_id: string | null
  official_assessed_at: string | Date | null
  version: number
  updated_at: string | Date
}

interface EvidenceRow {
  id: string
  engagement_id: string
  file_name: string
  mime_type: string
  size_bytes: string | number
  description: string | null
  uploaded_by: string
  uploaded_by_email: string
  uploaded_at: string | Date
}

function toIso(value: string | Date | null): string | null {
  if (value === null) return null
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function synthesizeCatalogControls(): ControlView[] {
  const out: ControlView[] = []
  let order = 1
  for (const nistId of Object.keys(cmmcRequirementValues)) {
    const familyCode = familyCodeFromNistId(nistId)
    const family = FAMILY_BY_CODE.get(familyCode)
    const requirementId = nistToCmmcDisplayId(nistId)
    out.push({
      id: requirementId,
      requirementId,
      familyCode,
      familyName: family?.name ?? familyCode,
      title: requirementId,
      basicRequirement: '',
      cmmcLevel: 'L2',
      sortOrder: order,
      status: 'NOT_ASSESSED',
      implementationNotes: null,
      implementationType: null,
      processOwner: null,
      requirementStatusId: requirementId,
      assessmentNotes: null,
    })
    order += 1
  }
  return out
}

function synthesizeCatalogObjectives(): ObjectiveView[] {
  const out: ObjectiveView[] = []
  for (const nistId of Object.keys(cmmcRequirementValues)) {
    const familyCode = familyCodeFromNistId(nistId)
    const family = FAMILY_BY_CODE.get(familyCode)
    const requirementId = nistToCmmcDisplayId(nistId)
    const objectiveReference = `${requirementId}.a`
    out.push({
      id: objectiveReference,
      objectiveId: objectiveReference,
      objectiveReference,
      requirementId,
      familyCode,
      familyName: family?.name ?? familyCode,
      description: 'Primary assessment objective',
      status: 'NOT_ASSESSED',
      assessmentNotes: null,
      evidenceDescription: null,
      artifactsReviewed: null,
      interviewees: null,
      examineDescription: null,
      testDescription: null,
      timeToAssessMinutes: null,
      inheritedStatus: null,
      policyReference: null,
      procedureReference: null,
      implementationStatement: null,
      responsibilityDescription: null,
      assessorQuestionsForOSC: null,
      nistQuestionsForOSC: null,
      officialAssessment: false,
      officialAssessorId: null,
      officialAssessedAt: null,
      assessedBy: null,
      assessedAt: null,
      version: 0,
      editingById: null,
      editingByName: null,
      editingAt: null,
      oscStatus: null,
      oscInheritedStatus: null,
      oscImplementationStatement: null,
      oscEvidenceDescription: null,
      oscAssessmentNotes: null,
      oscPolicyReference: null,
      oscProcedureReference: null,
      oscResponsibilityDescription: null,
      evidenceMappings: [],
      espMappings: [],
      createdAt: '1970-01-01T00:00:00Z',
      updatedAt: '1970-01-01T00:00:00Z',
    })
  }
  return out
}

/**
 * Merge-at-read: returns the full 110-control catalog with DB row overrides.
 * DB rows for the engagement override the synthesized NOT_ASSESSED defaults.
 */
export async function mergeOutsideControlsWithCatalog(
  engagementId: string,
): Promise<ControlView[]> {
  const result = await query(
    `SELECT engagement_id, requirement_id, status, notes, updated_at, version
       FROM outside_control_assessments WHERE engagement_id = $1`,
    [engagementId],
  )
  const dbRows = result.rows as ControlAssessmentRow[]
  const overrideMap = new Map(dbRows.map((r) => [r.requirement_id, r]))

  return synthesizeCatalogControls().map((control) => {
    const override = overrideMap.get(control.requirementId)
    if (!override) return control
    return {
      ...control,
      status: override.status,
      assessmentNotes: override.notes,
    }
  })
}

/**
 * Merge-at-read for objectives.
 */
export async function mergeOutsideObjectivesWithCatalog(
  engagementId: string,
): Promise<ObjectiveView[]> {
  const result = await query(
    `SELECT engagement_id, requirement_id, objective_id, status, assessment_notes,
            evidence_description, artifacts_reviewed, interviewees,
            examine_description, test_description, time_to_assess_minutes,
            official_assessor_id, official_assessed_at, version, updated_at
       FROM outside_objective_assessments WHERE engagement_id = $1`,
    [engagementId],
  )
  const dbRows = result.rows as ObjectiveAssessmentRow[]
  const overrideMap = new Map(dbRows.map((r) => [r.objective_id, r]))

  return synthesizeCatalogObjectives().map((objective) => {
    const override = overrideMap.get(objective.objectiveId)
    if (!override) return objective
    return {
      ...objective,
      status: override.status,
      assessmentNotes: override.assessment_notes,
      evidenceDescription: override.evidence_description,
      artifactsReviewed: override.artifacts_reviewed,
      interviewees: override.interviewees,
      examineDescription: override.examine_description,
      testDescription: override.test_description,
      timeToAssessMinutes: override.time_to_assess_minutes,
      officialAssessorId: override.official_assessor_id,
      officialAssessedAt: toIso(override.official_assessed_at),
      version: override.version,
      updatedAt: toIso(override.updated_at) ?? objective.updatedAt,
    }
  })
}

export interface ObjectiveStatusUpdateInput {
  status: 'NOT_ASSESSED' | 'MET' | 'NOT_MET' | 'NOT_APPLICABLE'
  assessmentNotes?: string | null
  evidenceDescription?: string | null
  artifactsReviewed?: string | null
  interviewees?: string | null
  examineDescription?: string | null
  testDescription?: string | null
  timeToAssessMinutes?: number | null
  officialAssessorId?: string | null
  officialAssessedAt?: string | null
  expectedVersion: number
  /** Required for the INSERT path so the requirement_id column is populated. */
  requirementId: string
}

export interface ObjectiveUpdateResult {
  status: 'updated' | 'inserted' | 'conflict'
  newVersion?: number
}

/**
 * Atomic check-and-increment update with INSERT-on-missing fallback. Returns
 * `conflict` when a row exists for (engagement_id, objective_id) but its
 * version does not match `expectedVersion`. Returns `inserted` when no row
 * existed and the INSERT succeeded; returns `updated` when an existing row
 * was advanced.
 *
 * Caller passes `expectedVersion = 0` for first writes; subsequent writes pass
 * the version returned by the prior call.
 */
export async function outsideUpdateObjectiveStatus(
  engagementId: string,
  objectiveId: string,
  input: ObjectiveStatusUpdateInput,
): Promise<ObjectiveUpdateResult> {
  const updateResult = await query(
    `UPDATE outside_objective_assessments
        SET status = $4,
            assessment_notes = $5,
            evidence_description = $6,
            artifacts_reviewed = $7,
            interviewees = $8,
            examine_description = $9,
            test_description = $10,
            time_to_assess_minutes = $11,
            official_assessor_id = $12,
            official_assessed_at = $13,
            version = version + 1,
            updated_at = NOW()
      WHERE engagement_id = $1
        AND objective_id = $2
        AND version = $3
      RETURNING version`,
    [
      engagementId,
      objectiveId,
      input.expectedVersion,
      input.status,
      input.assessmentNotes ?? null,
      input.evidenceDescription ?? null,
      input.artifactsReviewed ?? null,
      input.interviewees ?? null,
      input.examineDescription ?? null,
      input.testDescription ?? null,
      input.timeToAssessMinutes ?? null,
      input.officialAssessorId ?? null,
      input.officialAssessedAt ?? null,
    ],
  )

  if ((updateResult.rowCount ?? 0) > 0) {
    const row = updateResult.rows[0] as { version: number }
    return { status: 'updated', newVersion: row.version }
  }

  // No row updated. Either (a) no row exists and we should INSERT, or (b) a
  // row exists with a different version (conflict). INSERT with ON CONFLICT
  // DO NOTHING distinguishes the two: insert succeeds → 'inserted'; conflict
  // means a row exists with a different version.
  const insertResult = await query(
    `INSERT INTO outside_objective_assessments (
       engagement_id, requirement_id, objective_id, status,
       assessment_notes, evidence_description, artifacts_reviewed, interviewees,
       examine_description, test_description, time_to_assess_minutes,
       official_assessor_id, official_assessed_at, version
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 1)
     ON CONFLICT (engagement_id, objective_id) DO NOTHING
     RETURNING version`,
    [
      engagementId,
      input.requirementId,
      objectiveId,
      input.status,
      input.assessmentNotes ?? null,
      input.evidenceDescription ?? null,
      input.artifactsReviewed ?? null,
      input.interviewees ?? null,
      input.examineDescription ?? null,
      input.testDescription ?? null,
      input.timeToAssessMinutes ?? null,
      input.officialAssessorId ?? null,
      input.officialAssessedAt ?? null,
    ],
  )

  if ((insertResult.rowCount ?? 0) > 0) {
    const row = insertResult.rows[0] as { version: number }
    return { status: 'inserted', newVersion: row.version }
  }

  return { status: 'conflict' }
}

/**
 * Recompute and persist the parent control's derived status from its
 * objectives. CMMC convention: control is MET only when all assessed
 * objectives are MET; NOT_MET if any objective is NOT_MET; NOT_ASSESSED if
 * none are assessed; NOT_APPLICABLE if all are NOT_APPLICABLE.
 */
export async function recomputeControlStatus(
  engagementId: string,
  requirementId: string,
  updatedBy: string,
): Promise<string> {
  const objResult = await query(
    `SELECT status FROM outside_objective_assessments
      WHERE engagement_id = $1 AND requirement_id = $2`,
    [engagementId, requirementId],
  )
  const statuses = (objResult.rows as Array<{ status: string }>).map((r) => r.status)

  let derived: string
  if (statuses.length === 0) {
    derived = 'NOT_ASSESSED'
  } else if (statuses.every((s) => s === 'NOT_APPLICABLE')) {
    derived = 'NOT_APPLICABLE'
  } else if (statuses.some((s) => s === 'NOT_MET')) {
    derived = 'NOT_MET'
  } else if (statuses.some((s) => s === 'NOT_ASSESSED')) {
    derived = 'NOT_ASSESSED'
  } else {
    derived = 'MET'
  }

  await query(
    `INSERT INTO outside_control_assessments (engagement_id, requirement_id, status, updated_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (engagement_id, requirement_id)
     DO UPDATE SET status = EXCLUDED.status,
                   updated_by = EXCLUDED.updated_by,
                   updated_at = NOW(),
                   version = outside_control_assessments.version + 1`,
    [engagementId, requirementId, derived, updatedBy],
  )

  return derived
}

// ─── Evidence helpers ──────────────────────────────────────────────────────

export const EVIDENCE_MAX_BYTES = 25 * 1024 * 1024

export interface EvidenceUploadInput {
  engagementId: string
  fileName: string
  mimeType: string
  content: Buffer
  description: string | null
  uploadedBy: string
  uploadedByEmail: string
}

export interface EvidenceUploadResult {
  id: string
  fileName: string
  mimeType: string
  sizeBytes: number
}

export async function uploadOutsideEvidence(
  input: EvidenceUploadInput,
): Promise<EvidenceUploadResult> {
  if (input.content.byteLength > EVIDENCE_MAX_BYTES) {
    throw new Error(`Evidence exceeds the 25MB limit (${input.content.byteLength} bytes)`)
  }
  if (!isUploadAllowed(input.mimeType)) {
    throw new Error(`MIME type ${input.mimeType} is not allowed for upload`)
  }

  const result = await query(
    `INSERT INTO outside_evidence (
       engagement_id, file_name, mime_type, size_bytes, content, description,
       uploaded_by, uploaded_by_email
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, file_name, mime_type, size_bytes`,
    [
      input.engagementId,
      input.fileName,
      input.mimeType,
      input.content.byteLength,
      input.content,
      input.description,
      input.uploadedBy,
      input.uploadedByEmail,
    ],
  )
  const row = result.rows[0] as {
    id: string
    file_name: string
    mime_type: string
    size_bytes: string | number
  }
  return {
    id: row.id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: typeof row.size_bytes === 'string' ? parseInt(row.size_bytes, 10) : row.size_bytes,
  }
}

export async function listOutsideEvidence(
  engagementId: string,
): Promise<EvidenceView[]> {
  const result = await query(
    `SELECT id, engagement_id, file_name, mime_type, size_bytes, description,
            uploaded_by, uploaded_by_email, uploaded_at
       FROM outside_evidence
      WHERE engagement_id = $1
      ORDER BY uploaded_at DESC`,
    [engagementId],
  )
  return (result.rows as EvidenceRow[]).map((row) => ({
    id: row.id,
    fileName: row.file_name,
    fileUrl: null,
    mimeType: row.mime_type,
    fileSize:
      typeof row.size_bytes === 'string' ? parseInt(row.size_bytes, 10) : row.size_bytes,
    description: row.description,
    version: 1,
    uploadedAt: toIso(row.uploaded_at) ?? '1970-01-01T00:00:00Z',
    uploadedBy: row.uploaded_by_email,
    requirementIds: [],
    expirationDate: null,
  }) as unknown as EvidenceView)
}

export async function deleteOutsideEvidence(
  engagementId: string,
  evidenceId: string,
): Promise<boolean> {
  const result = await query(
    `DELETE FROM outside_evidence WHERE id = $1 AND engagement_id = $2`,
    [evidenceId, engagementId],
  )
  return (result.rowCount ?? 0) > 0
}

export interface EvidenceContentRow {
  fileName: string
  mimeType: string
  sizeBytes: number
  content: Buffer
  engagementId: string
}

export async function getOutsideEvidenceContent(
  evidenceId: string,
): Promise<EvidenceContentRow | null> {
  const result = await query(
    `SELECT engagement_id, file_name, mime_type, size_bytes, content
       FROM outside_evidence WHERE id = $1`,
    [evidenceId],
  )
  if (result.rowCount === 0) return null
  const row = result.rows[0] as {
    engagement_id: string
    file_name: string
    mime_type: string
    size_bytes: string | number
    content: Buffer
  }
  return {
    engagementId: row.engagement_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes:
      typeof row.size_bytes === 'string' ? parseInt(row.size_bytes, 10) : row.size_bytes,
    content: row.content,
  }
}

// ─── Evidence ↔ Objective links ────────────────────────────────────────────

export async function linkEvidenceToObjective(
  evidenceId: string,
  objectiveId: string,
  linkedBy: string,
): Promise<void> {
  await query(
    `INSERT INTO outside_evidence_objective_links (evidence_id, objective_id, linked_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (evidence_id, objective_id) DO NOTHING`,
    [evidenceId, objectiveId, linkedBy],
  )
}

export async function unlinkEvidenceFromObjective(
  evidenceId: string,
  objectiveId: string,
): Promise<boolean> {
  const result = await query(
    `DELETE FROM outside_evidence_objective_links
      WHERE evidence_id = $1 AND objective_id = $2`,
    [evidenceId, objectiveId],
  )
  return (result.rowCount ?? 0) > 0
}

export async function listObjectivesForEvidence(
  evidenceId: string,
): Promise<string[]> {
  const result = await query(
    `SELECT objective_id FROM outside_evidence_objective_links WHERE evidence_id = $1`,
    [evidenceId],
  )
  return (result.rows as Array<{ objective_id: string }>).map((r) => r.objective_id)
}

export async function listEvidenceForObjective(
  engagementId: string,
  objectiveId: string,
): Promise<EvidenceView[]> {
  const result = await query(
    `SELECT e.id, e.engagement_id, e.file_name, e.mime_type, e.size_bytes,
            e.description, e.uploaded_by, e.uploaded_by_email, e.uploaded_at
       FROM outside_evidence e
       JOIN outside_evidence_objective_links l ON l.evidence_id = e.id
      WHERE e.engagement_id = $1 AND l.objective_id = $2
      ORDER BY e.uploaded_at DESC`,
    [engagementId, objectiveId],
  )
  return (result.rows as EvidenceRow[]).map((row) => ({
    id: row.id,
    fileName: row.file_name,
    fileUrl: null,
    mimeType: row.mime_type,
    fileSize:
      typeof row.size_bytes === 'string' ? parseInt(row.size_bytes, 10) : row.size_bytes,
    description: row.description,
    version: 1,
    uploadedAt: toIso(row.uploaded_at) ?? '1970-01-01T00:00:00Z',
    uploadedBy: row.uploaded_by_email,
    requirementIds: [],
    expirationDate: null,
  }) as unknown as EvidenceView)
}
