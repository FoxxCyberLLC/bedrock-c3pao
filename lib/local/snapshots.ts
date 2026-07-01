/**
 * Local (air-gapped) assessment snapshots + correction cycle — Task 13 (state machine).
 *
 * A snapshot is an immutable record of the assessor's per-objective scoring at determination.
 * Reads surface imported/locally-captured snapshots. The correction cycle is adapted for air-gap:
 * there is no live OSC round-trip, so `startLocalCorrectionOpportunity` captures a determination
 * snapshot and moves the engagement to AWAITING_OSC_CORRECTIONS (the OSC remediates out-of-band and
 * re-exports; the assessor re-imports), and `resumeLocalReEvaluation` re-opens the assessment.
 * Ported from the Go snapshot_service.go / objective_service.go workflow. No network.
 */
import { query } from '@/lib/db'
import { getLocalObjectives } from './objectives'
import { setLocalEngagementStatus } from './engagements'
import {
  determineCMMCStatus,
  mapRequirementStatusToObjective,
  type CMMCStatus,
} from '@/lib/cmmc/status-determination'
import type { AssessmentSnapshotView, ObjectiveStatusSnapshotView } from '@/lib/api-client'

const s = (d: Record<string, unknown>, k: string): string | null => (d[k] != null ? String(d[k]) : null)
const n = (d: Record<string, unknown>, k: string): number | null => (d[k] != null ? Number(d[k]) : null)
const list = (d: Record<string, unknown>, k: string): string[] => (Array.isArray(d[k]) ? (d[k] as string[]) : [])

function mapSnapshot(data: Record<string, unknown>): AssessmentSnapshotView {
  return {
    id: String(data.id),
    engagementId: String(data.engagementId ?? ''),
    version: Number(data.version ?? 0),
    determination: (data.determination as AssessmentSnapshotView['determination']) ?? 'NO_CMMC_STATUS',
    capturedAt: String(data.capturedAt ?? ''),
    capturedByUserId: String(data.capturedByUserId ?? ''),
    capturedByName: String(data.capturedByName ?? ''),
    parentSnapshotId: s(data, 'parentSnapshotId'),
    isCurrent: data.isCurrent === true,
    isFinal: data.isFinal === true,
  }
}

/** All snapshots for the engagement, newest version first. */
export async function getLocalSnapshots(engagementId: string): Promise<AssessmentSnapshotView[]> {
  const result = await query(
    `SELECT data FROM imp_assessment_snapshot WHERE engagement_id = $1
      ORDER BY (data->>'version')::int DESC`,
    [engagementId]
  )
  return result.rows.map((r) => mapSnapshot((r as { data: Record<string, unknown> }).data))
}

function mapSnapshotObjective(data: Record<string, unknown>): ObjectiveStatusSnapshotView {
  return {
    id: String(data.id),
    snapshotId: String(data.snapshotId ?? ''),
    objectiveId: String(data.objectiveId ?? ''),
    status: (data.status as ObjectiveStatusSnapshotView['status']) ?? 'NOT_ASSESSED',
    assessmentNotes: s(data, 'assessmentNotes'),
    evidenceDescription: s(data, 'evidenceDescription'),
    inheritedStatus: s(data, 'inheritedStatus'),
    artifactsReviewed: s(data, 'artifactsReviewed'),
    interviewees: s(data, 'interviewees'),
    examineDescription: s(data, 'examineDescription'),
    testDescription: s(data, 'testDescription'),
    timeToAssessMinutes: n(data, 'timeToAssessMinutes'),
    policyReference: s(data, 'policyReference'),
    procedureReference: s(data, 'procedureReference'),
    implementationStatement: s(data, 'implementationStatement'),
    responsibilityDescription: s(data, 'responsibilityDescription'),
    evidenceIds: list(data, 'evidenceIds'),
    espIds: list(data, 'espIds'),
  }
}

/** The per-objective children of a captured snapshot. */
export async function getLocalSnapshotObjectives(
  engagementId: string,
  snapshotId: string
): Promise<ObjectiveStatusSnapshotView[]> {
  const result = await query(
    `SELECT data FROM imp_objective_status_snapshot
      WHERE engagement_id = $1 AND data->>'snapshotId' = $2`,
    [engagementId, snapshotId]
  )
  return result.rows.map((r) => mapSnapshotObjective((r as { data: Record<string, unknown> }).data))
}

export interface CaptureResult {
  snapshotId: string
  version: number
  determination: CMMCStatus
}

/**
 * Capture the current scoring as a snapshot and offer the OSC a correction window (air-gap:
 * a local status transition — the OSC remediates offline and re-exports). Lead-assessor gated
 * by the caller. Returns the captured snapshot summary.
 */
export async function startLocalCorrectionOpportunity(
  engagementId: string,
  capturedBy: { id: string; name: string } = { id: '', name: '' }
): Promise<CaptureResult> {
  const objectives = await getLocalObjectives(engagementId)
  const determination = determineCMMCStatus(
    objectives.map((o) => ({ requirementId: o.requirementId, status: mapRequirementStatusToObjective(o.status) })),
    []
  ).suggestedStatus

  const vres = await query(
    `SELECT COALESCE(MAX((data->>'version')::int), 0) AS v FROM imp_assessment_snapshot WHERE engagement_id = $1`,
    [engagementId]
  )
  const version = Number((vres.rows[0] as { v: number } | undefined)?.v ?? 0) + 1
  const capturedAt = new Date().toISOString()
  const snapshotId = `local-snap-${engagementId}-${version}`

  // Supersede any prior current snapshot.
  await query(
    `UPDATE imp_assessment_snapshot SET data = data || '{"isCurrent":false}'::jsonb WHERE engagement_id = $1`,
    [engagementId]
  )
  await query(
    `INSERT INTO imp_assessment_snapshot (id, engagement_id, data) VALUES ($1, $2, $3)`,
    [snapshotId, engagementId, JSON.stringify({
      id: snapshotId, engagementId, version, determination, capturedAt,
      capturedByUserId: capturedBy.id, capturedByName: capturedBy.name,
      parentSnapshotId: null, isCurrent: true, isFinal: false,
    })]
  )
  for (const o of objectives) {
    const osId = `local-osnap-${snapshotId}-${o.objectiveReference}`
    await query(
      `INSERT INTO imp_objective_status_snapshot (id, engagement_id, data) VALUES ($1, $2, $3)`,
      [osId, engagementId, JSON.stringify({
        id: osId, snapshotId, objectiveId: o.objectiveReference, status: o.status,
        assessmentNotes: o.assessmentNotes, evidenceDescription: o.evidenceDescription,
        inheritedStatus: o.inheritedStatus, evidenceIds: [], espIds: [],
      })]
    )
  }
  await setLocalEngagementStatus(engagementId, { status: 'AWAITING_OSC_CORRECTIONS' })

  return { snapshotId, version, determination }
}

/** Re-open the assessment after corrections (air-gap: local status transition). */
export async function resumeLocalReEvaluation(engagementId: string): Promise<void> {
  await setLocalEngagementStatus(engagementId, { status: 'IN_PROGRESS' })
}
