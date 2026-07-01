/**
 * Local (air-gapped) reports + eMASS export data — Task 19.
 *
 * The assessment report is stored/edited locally (imp_assessment_report, one per engagement).
 * The eMASS export data and report-generation data are ASSEMBLED locally from the already-ported
 * domains (controls, findings, POA&Ms, engagement) — the eMASS workbook itself is still built by
 * the existing lib/emass-workbook.ts. No network.
 */
import { query } from '@/lib/db'
import { getLocalControls } from './controls'
import { getLocalFindings } from './findings'
import { getLocalPoams } from './ssp-assets-poam'
import { getLocalEngagementDetail, getLocalEngagementSummaries } from './engagements'
import type {
  AssessmentReport,
  EMassExportData,
  EMassExportFinding,
  EMassExportPOAM,
  ReportData,
} from '@/lib/api-client'

const REPORT_ID = (engagementId: string): string => `local-report-${engagementId}`

function emptyReport(engagementId: string): AssessmentReport {
  const now = new Date().toISOString()
  return {
    id: REPORT_ID(engagementId), engagementId, status: 'DRAFT', version: '1',
    executiveSummary: null, scopeDescription: null, methodology: null, findingsSummary: null,
    recommendations: null, conclusion: null, pdfUrl: null,
    preparedById: null, preparedByName: null, preparedAt: null,
    reviewedById: null, reviewedByName: null, reviewedAt: null,
    approvedById: null, approvedByName: null, approvedAt: null, deliveredAt: null,
    createdAt: now, updatedAt: now,
  }
}

/** The engagement's assessment report (a DRAFT default when none has been saved yet). */
export async function getLocalAssessmentReport(engagementId: string): Promise<AssessmentReport> {
  const result = await query(
    `SELECT data FROM imp_assessment_report WHERE engagement_id = $1 ORDER BY imported_at DESC LIMIT 1`,
    [engagementId]
  )
  if (result.rows.length === 0) return emptyReport(engagementId)
  return (result.rows[0] as { data: Record<string, unknown> }).data as unknown as AssessmentReport
}

/** Create or update the local assessment report. */
export async function saveLocalAssessmentReport(
  engagementId: string,
  body: Partial<AssessmentReport>
): Promise<AssessmentReport> {
  const current = await getLocalAssessmentReport(engagementId)
  const merged: AssessmentReport = { ...current, ...body, engagementId, updatedAt: new Date().toISOString() }
  await query(
    `INSERT INTO imp_assessment_report (id, engagement_id, data)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, imported_at = NOW()`,
    [merged.id, engagementId, JSON.stringify(merged)]
  )
  return merged
}

/** Update just the report status. */
export async function updateLocalReportStatus(engagementId: string, status: string): Promise<AssessmentReport> {
  return saveLocalAssessmentReport(engagementId, { status })
}

/** eMASS export data assembled from local controls / findings / POA&Ms. */
export async function getLocalEMassExport(engagementId: string): Promise<EMassExportData> {
  const [detail, controls, findings, poams] = await Promise.all([
    getLocalEngagementDetail(engagementId),
    getLocalControls(engagementId),
    getLocalFindings(engagementId),
    getLocalPoams(engagementId),
  ])
  const byReq = new Map(controls.map((c) => [c.requirementId, c]))

  const emassFindings: EMassExportFinding[] = findings.map((f) => {
    const c = byReq.get(f.requirementId)
    return {
      controlId: f.requirementId,
      familyCode: c?.familyCode ?? '',
      title: c?.title ?? '',
      determination: f.determination,
      methodInterview: f.methodInterview,
      methodExamine: f.methodExamine,
      methodTest: f.methodTest,
      finding: f.finding,
      objectiveEvidence: f.objectiveEvidence,
      deficiency: f.deficiency,
      recommendation: f.recommendation,
      riskLevel: f.riskLevel,
    }
  })

  const emassPoams: EMassExportPOAM[] = poams.map((p) => ({
    title: p.title,
    description: p.description,
    riskLevel: p.riskLevel,
    status: p.status,
    remediationPlan: p.remediationPlan,
    scheduledCompletionDate: p.scheduledCompletionDate,
  }))

  const s = (k: string): string | null => (detail && detail[k] != null ? String(detail[k]) : null)
  return {
    engagementId,
    exportDate: new Date().toISOString(),
    cmmcLevel: 'LEVEL_2',
    organization: s('organizationName') ?? '',
    assessorOrganization: s('packageName') ?? '',
    systemName: s('systemName'),
    assessmentStartDate: s('scheduledStartDate'),
    assessmentEndDate: s('scheduledEndDate'),
    findings: emassFindings,
    poams: emassPoams,
  }
}

/** Report-generation data assembled from local controls + findings + engagement summary. */
export async function getLocalReport(engagementId: string): Promise<ReportData> {
  const [summaries, controls, findings] = await Promise.all([
    getLocalEngagementSummaries(),
    getLocalControls(engagementId),
    getLocalFindings(engagementId),
  ])
  const engagement = summaries.find((e) => e.id === engagementId)
  if (!engagement) throw new Error('Engagement not found locally')

  const stats = { met: 0, notMet: 0, notApplicable: 0, notAssessed: 0 }
  for (const c of controls) {
    if (c.status === 'MET') stats.met += 1
    else if (c.status === 'NOT_MET') stats.notMet += 1
    else if (c.status === 'NOT_APPLICABLE') stats.notApplicable += 1
    else stats.notAssessed += 1
  }
  return {
    engagement,
    totalControls: controls.length,
    assessedControls: controls.length - stats.notAssessed,
    findings,
    stats,
  }
}
