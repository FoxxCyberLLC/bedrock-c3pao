/**
 * Local (air-gapped) assessment findings — Task 16.
 *
 * Findings are engagement-scoped and authored by the assessor. Reads surface imported +
 * locally-created findings from `imp_assessment_finding` (scoped by the tagged `engagement_id`);
 * create/update/review write local rows. Imported JSONB mirrors the `FindingView` shape, so reads
 * are typed passthroughs. No network.
 */
import { randomUUID } from 'node:crypto'
import { query } from '@/lib/db'
import type { FindingView, CreateFindingInput, UpdateFindingInput } from '@/lib/api-client'

/** All findings for the engagement, newest first. */
export async function getLocalFindings(engagementId: string): Promise<FindingView[]> {
  const result = await query(
    `SELECT data FROM imp_assessment_finding WHERE engagement_id = $1
      ORDER BY data->>'createdAt' DESC NULLS LAST`,
    [engagementId]
  )
  return result.rows.map((r) => (r as { data: Record<string, unknown> }).data as unknown as FindingView)
}

/** Create a new assessor finding. */
export async function createLocalFinding(
  engagementId: string,
  input: CreateFindingInput
): Promise<FindingView> {
  const now = new Date().toISOString()
  const id = `local-finding-${engagementId}-${randomUUID()}`
  const data: Record<string, unknown> = {
    id,
    engagementId,
    requirementId: input.requirementId,
    requirementCode: '',
    determination: input.determination,
    methodInterview: !!input.methodInterview,
    methodExamine: !!input.methodExamine,
    methodTest: !!input.methodTest,
    finding: input.finding ?? null,
    objectiveEvidence: input.objectiveEvidence ?? null,
    deficiency: input.deficiency ?? null,
    recommendation: input.recommendation ?? null,
    riskLevel: input.riskLevel ?? null,
    evidenceReviewed: input.evidenceReviewed ?? null,
    assessedById: null,
    assessedAt: null,
    version: 1,
    editingById: null,
    editingByName: null,
    editingAt: null,
    reviewStatus: null,
    reviewedById: null,
    reviewedByName: null,
    reviewedAt: null,
    reviewNotes: null,
    createdAt: now,
    updatedAt: now,
  }
  await query(
    `INSERT INTO imp_assessment_finding (id, engagement_id, data) VALUES ($1, $2, $3)`,
    [id, engagementId, JSON.stringify(data)]
  )
  return data as unknown as FindingView
}

async function patchFinding(
  engagementId: string,
  findingId: string,
  patch: Record<string, unknown>
): Promise<FindingView | null> {
  const found = await query(
    `SELECT data FROM imp_assessment_finding WHERE id = $1 AND engagement_id = $2`,
    [findingId, engagementId]
  )
  if (found.rows.length === 0) return null
  const current = (found.rows[0] as { data: Record<string, unknown> }).data
  const merged = { ...patch, version: Number(current.version ?? 0) + 1, updatedAt: new Date().toISOString() }
  await query(
    `UPDATE imp_assessment_finding SET data = data || $2::jsonb WHERE id = $1`,
    [findingId, JSON.stringify(merged)]
  )
  return { ...current, ...merged } as unknown as FindingView
}

/** Update an assessor finding. */
export async function updateLocalFinding(
  engagementId: string,
  findingId: string,
  input: UpdateFindingInput
): Promise<FindingView | null> {
  return patchFinding(engagementId, findingId, { ...input })
}

/** Record a QA review verdict on a finding. */
export async function reviewLocalFinding(
  engagementId: string,
  findingId: string,
  body: { status: string; notes?: string }
): Promise<FindingView | null> {
  return patchFinding(engagementId, findingId, {
    reviewStatus: body.status,
    reviewNotes: body.notes ?? null,
    reviewedAt: new Date().toISOString(),
  })
}
