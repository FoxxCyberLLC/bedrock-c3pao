/**
 * Local (air-gapped) objectives data layer — Task 13 (core read/write).
 *
 * Objectives are the merge-at-read of the seeded 321-objective reference catalog
 * (`AssessmentObjective` + `Requirement` + `RequirementFamily`, Task 23) with the imported
 * per-objective status (`imp_objective_status`, scoped by the tagged `engagement_id`). Objectives
 * with no imported status default to NOT_ASSESSED. Writes upsert the assessor's determination
 * into `imp_objective_status`. No api-client, no network.
 *
 * The snapshot / correction-opportunity state machine (fetchSnapshots / startCorrectionOpportunity
 * / resumeReEvaluation) is a separate concern ported from the Go services — see objectives-snapshot.
 */
import { query } from '@/lib/db'
import type { ObjectiveView, EvidenceMappingItem, ESPMappingItem } from '@/lib/api-client'

interface ObjectiveRow {
  objective_reference: string
  description: string
  requirement_id: string
  family_code: string
  family_name: string
  os_id: string | null
  osdata: Record<string, unknown> | null
}

const OBJECTIVES_SQL = `
  SELECT ao."objectiveReference" AS objective_reference,
         ao.description          AS description,
         r."requirementId"       AS requirement_id,
         f.code                  AS family_code,
         f.name                  AS family_name,
         os.id                   AS os_id,
         os.data                 AS osdata
    FROM "AssessmentObjective" ao
    JOIN "Requirement" r ON r.id = ao."requirementId"
    JOIN "RequirementFamily" f ON f.id = r."familyId"
    LEFT JOIN imp_objective_status os
      ON os.data->>'objectiveReference' = ao."objectiveReference" AND os.engagement_id = $1
   WHERE r."cmmcLevel" = 'LEVEL_2'`

const ORDER = ` ORDER BY r."sortOrder", ao."sortOrder"`

const str = (d: Record<string, unknown> | null, k: string): string | null =>
  d && d[k] != null ? String(d[k]) : null
const bool = (d: Record<string, unknown> | null, k: string): boolean => !!(d && d[k] === true)
const num = (d: Record<string, unknown> | null, k: string): number | null =>
  d && d[k] != null ? Number(d[k]) : null
const arr = <T>(d: Record<string, unknown> | null, k: string): T[] =>
  d && Array.isArray(d[k]) ? (d[k] as T[]) : []

function mapObjective(row: ObjectiveRow): ObjectiveView {
  const d = row.osdata
  return {
    id: row.os_id ?? row.objective_reference,
    objectiveId: row.os_id ?? row.objective_reference,
    objectiveReference: row.objective_reference,
    requirementId: row.requirement_id,
    familyCode: row.family_code,
    familyName: row.family_name,
    description: row.description,
    status: str(d, 'status') ?? 'NOT_ASSESSED',
    assessmentNotes: str(d, 'assessmentNotes'),
    evidenceDescription: str(d, 'evidenceDescription'),
    artifactsReviewed: str(d, 'artifactsReviewed'),
    interviewees: str(d, 'interviewees'),
    examineDescription: str(d, 'examineDescription'),
    testDescription: str(d, 'testDescription'),
    timeToAssessMinutes: num(d, 'timeToAssessMinutes'),
    inheritedStatus: str(d, 'inheritedStatus'),
    policyReference: str(d, 'policyReference'),
    procedureReference: str(d, 'procedureReference'),
    implementationStatement: str(d, 'implementationStatement'),
    responsibilityDescription: str(d, 'responsibilityDescription'),
    assessorQuestionsForOSC: str(d, 'assessorQuestionsForOSC'),
    nistQuestionsForOSC: str(d, 'nistQuestionsForOSC'),
    officialAssessment: bool(d, 'officialAssessment'),
    officialAssessorId: str(d, 'officialAssessorId'),
    officialAssessedAt: str(d, 'officialAssessedAt'),
    assessedBy: str(d, 'assessedBy'),
    assessedAt: str(d, 'assessedAt'),
    version: num(d, 'version') ?? 0,
    editingById: str(d, 'editingById'),
    editingByName: str(d, 'editingByName'),
    editingAt: str(d, 'editingAt'),
    oscStatus: str(d, 'oscStatus'),
    oscInheritedStatus: str(d, 'oscInheritedStatus'),
    oscImplementationStatement: str(d, 'oscImplementationStatement'),
    oscEvidenceDescription: str(d, 'oscEvidenceDescription'),
    oscAssessmentNotes: str(d, 'oscAssessmentNotes'),
    oscPolicyReference: str(d, 'oscPolicyReference'),
    oscProcedureReference: str(d, 'oscProcedureReference'),
    oscResponsibilityDescription: str(d, 'oscResponsibilityDescription'),
    evidenceMappings: arr<EvidenceMappingItem>(d, 'evidenceMappings'),
    espMappings: arr<ESPMappingItem>(d, 'espMappings'),
    createdAt: str(d, 'createdAt') ?? '',
    updatedAt: str(d, 'updatedAt') ?? '',
  }
}

/** All 321 objectives for the engagement, seeded catalog merged with imported status. */
export async function getLocalObjectives(engagementId: string): Promise<ObjectiveView[]> {
  const result = await query(OBJECTIVES_SQL + ORDER, [engagementId])
  return (result.rows as ObjectiveRow[]).map(mapObjective)
}

/** A single objective by reference (used to return the updated view after a write). */
export async function getLocalObjective(
  engagementId: string,
  objectiveReference: string
): Promise<ObjectiveView | null> {
  const result = await query(
    OBJECTIVES_SQL + ` AND ao."objectiveReference" = $2`,
    [engagementId, objectiveReference]
  )
  if (result.rows.length === 0) return null
  return mapObjective(result.rows[0] as ObjectiveRow)
}

/**
 * Upsert the assessor's objective determination into `imp_objective_status` (offline
 * `updateObjective`). Creates a local status row for objectives not present in the snapshot,
 * bumps `version`, and returns the refreshed view.
 */
export async function updateLocalObjective(
  engagementId: string,
  objectiveIdOrRef: string,
  patch: Record<string, unknown>
): Promise<ObjectiveView | null> {
  const now = new Date().toISOString()
  // The UI passes the ObjectiveView id: the status row id when assessed, else the
  // objectiveReference (catalog id) for a not-yet-assessed objective. Resolve either.
  const found = await query(
    `SELECT id, data->>'objectiveReference' AS ref, COALESCE((data->>'version')::int, 0) AS version
       FROM imp_objective_status
      WHERE engagement_id = $1 AND (id = $2 OR data->>'objectiveReference' = $2)`,
    [engagementId, objectiveIdOrRef]
  )

  let objectiveReference: string
  if (found.rows.length > 0) {
    const { id, ref, version } = found.rows[0] as { id: string; ref: string; version: number }
    objectiveReference = ref
    await query(
      `UPDATE imp_objective_status SET data = data || $2::jsonb WHERE id = $1`,
      [id, JSON.stringify({ ...patch, objectiveReference, updatedAt: now, version: Number(version) + 1 })]
    )
  } else {
    objectiveReference = objectiveIdOrRef
    await query(
      `INSERT INTO imp_objective_status (id, engagement_id, data) VALUES ($1, $2, $3)`,
      [
        `local-obj-${engagementId}-${objectiveReference}`,
        engagementId,
        JSON.stringify({ ...patch, objectiveReference, updatedAt: now, createdAt: now, version: 1 }),
      ]
    )
  }

  return getLocalObjective(engagementId, objectiveReference)
}
