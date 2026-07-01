/**
 * Local (air-gapped) progress + planning — Task 18 (progress / planning).
 *
 * Progress is COMPUTED locally from the imported objective statuses (never fetched) — daily
 * totals, per-domain, and per-assessor. Planning fields live on the engagement row; proposal /
 * introduction are local status transitions. No network.
 */
import { query } from '@/lib/db'
import { getLocalObjectives } from './objectives'
import { getLocalEngagementDetail } from './engagements'
import type { DailyProgress, DomainProgress, AssessorProgress, PlanningData } from '@/lib/api-client'

/** Daily assessment progress — objective status totals for the engagement. */
export async function getLocalDailyProgress(engagementId: string): Promise<DailyProgress> {
  const objectives = await getLocalObjectives(engagementId)
  const c = { total: 0, met: 0, notMet: 0, notApplicable: 0, notAssessed: 0 }
  for (const o of objectives) {
    c.total += 1
    if (o.status === 'MET') c.met += 1
    else if (o.status === 'NOT_MET') c.notMet += 1
    else if (o.status === 'NOT_APPLICABLE') c.notApplicable += 1
    else c.notAssessed += 1
  }
  return { ...c, assessed: c.total - c.notAssessed }
}

/** Per-domain progress computed from objective statuses. */
export async function getLocalProgressByDomain(engagementId: string): Promise<DomainProgress[]> {
  const objectives = await getLocalObjectives(engagementId)
  const byFamily = new Map<string, DomainProgress>()
  for (const o of objectives) {
    const d = byFamily.get(o.familyCode) ?? {
      familyCode: o.familyCode, familyName: o.familyName, total: 0, assessed: 0, met: 0, notMet: 0, notApplicable: 0,
    }
    d.total += 1
    if (o.status !== 'NOT_ASSESSED') d.assessed += 1
    if (o.status === 'MET') d.met += 1
    else if (o.status === 'NOT_MET') d.notMet += 1
    else if (o.status === 'NOT_APPLICABLE') d.notApplicable += 1
    byFamily.set(o.familyCode, d)
  }
  return [...byFamily.values()].sort((a, b) => a.familyCode.localeCompare(b.familyCode))
}

/** Per-assessor progress — objectives grouped by who assessed them. */
export async function getLocalProgressByAssessor(engagementId: string): Promise<AssessorProgress[]> {
  const objectives = await getLocalObjectives(engagementId)
  const byAssessor = new Map<string, AssessorProgress>()
  for (const o of objectives) {
    if (o.status === 'NOT_ASSESSED' || !o.assessedBy) continue
    const id = o.assessedBy
    const a = byAssessor.get(id) ?? { assessorId: id, assessorName: id, assessed: 0, met: 0, notMet: 0, notApplicable: 0 }
    a.assessed += 1
    if (o.status === 'MET') a.met += 1
    else if (o.status === 'NOT_MET') a.notMet += 1
    else if (o.status === 'NOT_APPLICABLE') a.notApplicable += 1
    byAssessor.set(id, a)
  }
  return [...byAssessor.values()]
}

async function patchEngagement(engagementId: string, patch: Record<string, unknown>): Promise<void> {
  await query(
    `UPDATE imp_assessment_engagement SET data = data || $2::jsonb WHERE id = $1`,
    [engagementId, JSON.stringify({ ...patch, updatedAt: new Date().toISOString() })]
  )
}

const s = (d: Record<string, unknown> | null, k: string): string | null =>
  d && d[k] != null ? String(d[k]) : null

/** Planning data read from the engagement row. */
export async function getLocalPlanning(engagementId: string): Promise<PlanningData> {
  const d = await getLocalEngagementDetail(engagementId)
  return {
    engagementId,
    assessmentScope: s(d, 'assessmentScope'),
    assessmentMethodology: s(d, 'assessmentMethodology'),
    planningNotes: s(d, 'planningNotes'),
    assessmentTimeline: s(d, 'assessmentTimeline'),
    scheduledStartDate: s(d, 'scheduledStartDate'),
    scheduledEndDate: s(d, 'scheduledEndDate'),
  }
}

/** Persist planning fields onto the engagement row. */
export async function updateLocalPlanning(engagementId: string, body: Partial<PlanningData>): Promise<PlanningData> {
  const { engagementId: _ignore, ...fields } = body
  void _ignore
  await patchEngagement(engagementId, fields)
  return getLocalPlanning(engagementId)
}

/** Record that the assessor sent a proposal (local status transition). */
export async function sendLocalProposal(engagementId: string, body: Record<string, unknown>): Promise<void> {
  await patchEngagement(engagementId, { ...body, proposalSentAt: new Date().toISOString() })
}

/** Record that the introduction was acknowledged (local status transition). */
export async function acknowledgeLocalIntroduction(engagementId: string): Promise<void> {
  await patchEngagement(engagementId, { introductionAcknowledgedAt: new Date().toISOString() })
}
