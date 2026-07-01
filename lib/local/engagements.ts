/**
 * Local (air-gapped) engagements data layer — Task 11.
 *
 * Assembles the `api-client` engagement view shapes from the imported snapshot tables
 * (`imp_assessment_engagement` joined to `imp_ato_package` + `imp_organization`), replacing
 * the Go-API `fetchAssessments`/`fetchEngagementDetail` calls when offline. Raw rows are stored
 * as JSONB `data` (Task 3); this layer maps them to the exact shapes the UI expects, mirroring
 * `db-outside-*`. No network, no api-client.
 */
import { query } from '@/lib/db'
import type {
  EngagementSummary,
  EngagementPhase,
  EngagementPhaseName,
  LifecycleEvent,
} from '@/lib/api-client'

/** One engagement row joined to its package + organization display names. */
interface EngagementJoinRow {
  edata: Record<string, unknown>
  package_name: string | null
  organization_name: string | null
}

const asString = (v: unknown): string => (v == null ? '' : String(v))
const asNullableString = (v: unknown): string | null => (v == null ? null : String(v))
const asBool = (v: unknown): boolean => v === true || v === 'true'

const JOIN_SQL = `
  SELECT e.data AS edata,
         p.data->>'name' AS package_name,
         o.data->>'name' AS organization_name
    FROM imp_assessment_engagement e
    LEFT JOIN imp_ato_package p ON p.id = e.data->>'atoPackageId'
    LEFT JOIN imp_organization o ON o.id = p.data->>'organizationId'`

function mapEngagementSummary(row: EngagementJoinRow): EngagementSummary {
  const d = row.edata
  return {
    id: asString(d.id),
    customerId: asString(d.customerId),
    atoPackageId: asString(d.atoPackageId),
    c3paoId: asString(d.c3paoId),
    leadAssessorId: asNullableString(d.leadAssessorId),
    status: asString(d.status),
    accessLevel: asString(d.accessLevel),
    targetLevel: asString(d.targetLevel),
    requestedDate: asString(d.requestedDate),
    acceptedDate: asNullableString(d.acceptedDate),
    scheduledStartDate: asNullableString(d.scheduledStartDate),
    scheduledEndDate: asNullableString(d.scheduledEndDate),
    actualStartDate: asNullableString(d.actualStartDate),
    actualCompletionDate: asNullableString(d.actualCompletionDate),
    assessmentScope: asNullableString(d.assessmentScope),
    assessmentNotes: asNullableString(d.assessmentNotes),
    assessmentResult: asNullableString(d.assessmentResult),
    findingsCount: d.findingsCount == null ? null : Number(d.findingsCount),
    poamRequired: d.poamRequired == null ? null : asBool(d.poamRequired),
    assessmentModeActive: asBool(d.assessmentModeActive),
    createdAt: asString(d.createdAt),
    updatedAt: asString(d.updatedAt),
    packageName: row.package_name ?? '',
    organizationName: row.organization_name ?? '',
    leadAssessorName: asNullableString(d.leadAssessorName),
  }
}

/** All imported engagements as `EngagementSummary[]` (the assessments list). */
export async function getLocalEngagementSummaries(): Promise<EngagementSummary[]> {
  const result = await query(`${JOIN_SQL} ORDER BY e.imported_at DESC`)
  return (result.rows as EngagementJoinRow[]).map(mapEngagementSummary)
}

/**
 * The raw engagement detail row plus resolved package/organization names, mirroring the Go
 * `fetchEngagementDetail` `Record<string, unknown>` passthrough. Null when not imported.
 */
export async function getLocalEngagementDetail(id: string): Promise<Record<string, unknown> | null> {
  const result = await query(`${JOIN_SQL} WHERE e.id = $1`, [id])
  if (result.rows.length === 0) return null
  const row = result.rows[0] as EngagementJoinRow
  return {
    ...row.edata,
    packageName: row.package_name ?? '',
    organizationName: row.organization_name ?? '',
  }
}

/** Merge a JSONB patch into an imported engagement's raw row (the assessor's local edits). */
async function patchEngagement(id: string, patch: Record<string, unknown>): Promise<void> {
  await query(
    `UPDATE imp_assessment_engagement
        SET data = data || $2::jsonb, imported_at = imported_at
      WHERE id = $1`,
    [id, JSON.stringify({ ...patch, updatedAt: new Date().toISOString() })]
  )
}

/** Record the assessment outcome locally (offline `updateEngagementStatus`). */
export async function setLocalEngagementStatus(
  id: string,
  body: { status: string; assessmentResult?: string; resultNotes?: string }
): Promise<void> {
  const patch: Record<string, unknown> = { status: body.status }
  if (body.assessmentResult !== undefined) patch.assessmentResult = body.assessmentResult
  if (body.resultNotes !== undefined) patch.resultNotes = body.resultNotes
  await patchEngagement(id, patch)
}

/** Toggle assessment mode locally (offline `toggleAssessmentMode`). */
export async function setLocalAssessmentMode(id: string, active: boolean): Promise<void> {
  await patchEngagement(id, {
    assessmentModeActive: active,
    assessmentModeStartedAt: active ? new Date().toISOString() : null,
  })
}

const PHASE_FIELDS: Array<keyof EngagementPhase> = [
  'currentPhase', 'phaseEnteredAt', 'contractExecutedAt', 'preAssessFormQaStatus',
  'preAssessFormUploadedAt', 'inBriefDate', 'outBriefDate', 'reportQaStatus',
  'appealsWindowOpenUntil', 'reevalWindowOpenUntil', 'certUid', 'certStatus',
  'certStatusDate', 'certIssuedAt', 'certExpiresAt', 'poamCloseoutDue',
  'certSignedById', 'certSignedByName',
]

/** Phase/lifecycle metadata read from the imported engagement row (offline `fetchEngagementPhase`). */
export async function getLocalEngagementPhase(id: string): Promise<EngagementPhase | null> {
  const result = await query(`SELECT data FROM imp_assessment_engagement WHERE id = $1`, [id])
  if (result.rows.length === 0) return null
  const d = (result.rows[0] as { data: Record<string, unknown> }).data
  const phase: EngagementPhase = {}
  for (const field of PHASE_FIELDS) {
    ;(phase as Record<string, unknown>)[field] = d[field] ?? null
  }
  return phase
}

/** Transition the engagement to a CAP phase locally (offline `updateEngagementPhase`). */
export async function setLocalEngagementPhase(
  id: string,
  phase: EngagementPhaseName
): Promise<EngagementPhase | null> {
  await patchEngagement(id, { currentPhase: phase, phaseEnteredAt: new Date().toISOString() })
  return getLocalEngagementPhase(id)
}

/** Derive the lifecycle timeline from the engagement's date fields (offline `fetchEngagementLifecycle`). */
export async function getLocalEngagementLifecycle(id: string): Promise<LifecycleEvent[]> {
  const detail = await getLocalEngagementDetail(id)
  if (!detail) return []
  const milestones: Array<{ key: string; type: string; label: string }> = [
    { key: 'requestedDate', type: 'REQUESTED', label: 'Assessment requested' },
    { key: 'acceptedDate', type: 'ACCEPTED', label: 'Engagement accepted' },
    { key: 'scheduledStartDate', type: 'SCHEDULED', label: 'Assessment scheduled' },
    { key: 'actualStartDate', type: 'STARTED', label: 'Assessment started' },
    { key: 'actualCompletionDate', type: 'COMPLETED', label: 'Assessment completed' },
  ]
  return milestones
    .filter((m) => detail[m.key])
    .map((m) => ({ type: m.type, date: String(detail[m.key]), label: m.label }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
